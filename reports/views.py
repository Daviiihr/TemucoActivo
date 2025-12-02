import json
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import user_passes_test
from django.views.decorators.http import require_http_methods

from .models import Report, Zone

# Esto lo hice para el login, junto al redirect de arribita
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User


def clean_str(value, max_length):
    if value is None:
        return ""
    return str(value).strip()[:max_length]


@login_required(login_url="/login/")
def home(request):
    """Render the main incidents map."""
    context = {
        "google_maps_api_key": settings.GOOGLE_MAPS_API_KEY,
        "google_maps_map_id": settings.GOOGLE_MAPS_MAP_ID,
        "csrf_token": get_token(request),
    }
    return render(request, "reports/index.html", context)


def serialize_zone(zone: Zone) -> dict:
    return {
        "id": zone.id,
        "name": zone.name,
        "color": zone.color,
        "geojson": zone.geojson,
    }


@require_http_methods(["GET"])
def zones_api(request):
    """Zonas activas para pintar en el mapa público."""
    zones = [serialize_zone(z) for z in Zone.objects.filter(is_active=True)]
    return JsonResponse({"zones": zones})


def _staff_check(user):
    return user.is_authenticated and user.is_staff


@user_passes_test(_staff_check, login_url="/login/")
@require_http_methods(["GET"])
def zones_admin(request):
    """Dashboard básico de zonas (solo staff/admin)."""
    zones = Zone.objects.all()
    return render(
        request,
        "reports/zones_admin.html",
        {
            "zones": zones,
            "csrf_token": get_token(request),
        },
    )


@user_passes_test(_staff_check, login_url="/login/")
@require_http_methods(["GET", "POST"])
def zones_admin_api(request):
    """API de zonas para admin (crear y listar)."""
    if request.method == "GET":
        zones = [serialize_zone(z) for z in Zone.objects.all()]
        return JsonResponse({"zones": zones})

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido."}, status=400)

    name = (payload.get("name") or "").strip()
    color = (payload.get("color") or "#1e88e5").strip()[:20]
    geojson = payload.get("geojson")

    if not name or not geojson:
        return JsonResponse(
            {"error": "Los campos name y geojson son obligatorios."}, status=400
        )

    zone = Zone.objects.create(name=name, color=color, geojson=geojson)
    return JsonResponse({"zone": serialize_zone(zone)}, status=201)


@login_required(login_url="/login/")
@require_http_methods(["GET"])
def reports_sql_summary(request):
    """
    Consulta SQL directa (SELECT + GROUP BY + ORDER BY) para
    contabilizar reportes por categoria en PostgreSQL.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT category, COUNT(*) AS total
            FROM reports_report
            GROUP BY category
            ORDER BY total DESC, category ASC
            """
        )
        rows = cursor.fetchall()

    summary = [
        {"category": row[0], "total": row[1]}
        for row in rows
    ]

    return render(
        request,
        "reports/consultas.html",
        {
            "summary": summary,
            "sql_used": (
                "SELECT category, COUNT(*) AS total "
                "FROM reports_report "
                "GROUP BY category "
                "ORDER BY total DESC, category ASC"
            ),
        },
    )


def serialize_report(report: Report) -> dict:
    return {
        "id": report.id,
        "category": report.category,
        "description": report.description,
        "zone_id": report.zone_id,
        "zone_name": report.zone.name if report.zone_id else None,
        "street_name": report.street_name,
        "street_number": report.street_number,
        "apartment": report.apartment,
        "address_extra": report.address_extra,
        "lat": float(report.latitude),
        "lng": float(report.longitude),
        "created_at": report.created_at.isoformat(),
    }


def _point_in_ring(point, ring):
    """
    Ray-casting for point-in-polygon.
    point: (lng, lat)
    ring: list of [lng, lat]
    """
    x, y = point
    inside = False
    for i in range(len(ring)):
        x1, y1 = ring[i - 1]
        x2, y2 = ring[i]
        intersects = ((y1 > y) != (y2 > y)) and (
            x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1
        )
        if intersects:
            inside = not inside
    return inside


def _point_in_polygon(point, coordinates):
    """
    coordinates: GeoJSON polygon coordinates (array of rings)
    """
    if not coordinates:
        return False
    outer = coordinates[0]
    if not _point_in_ring(point, outer):
        return False
    # ignore holes for now
    return True


def find_zone_for_point(lat: Decimal, lng: Decimal):
    """Return the first active zone that contains the lat/lng (GeoJSON polygon/multipolygon)."""
    point = (float(lng), float(lat))
    for zone in Zone.objects.filter(is_active=True):
        geo = zone.geojson or {}
        geometry = geo.get("geometry") if "geometry" in geo else geo
        if not geometry:
            continue
        gtype = geometry.get("type")
        coords = geometry.get("coordinates")
        if gtype == "Polygon":
            if _point_in_polygon(point, coords):
                return zone
        elif gtype == "MultiPolygon":
            for poly in coords or []:
                if _point_in_polygon(point, poly):
                    return zone
    return None


@require_http_methods(["GET", "POST"])
def reports_api(request):
    """Return or create reports backed by the Django database."""
    if request.method == "GET":
        reports = [serialize_report(report) for report in Report.objects.all()]
        return JsonResponse({"reports": reports})

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON invalido."}, status=400)

    category = payload.get("category")
    description = clean_str(payload.get("description", ""), 1000)
    street_name = clean_str(payload.get("street_name"), 120)
    street_number = clean_str(payload.get("street_number"), 20)
    apartment = clean_str(payload.get("apartment"), 50)
    address_extra = clean_str(payload.get("address_extra"), 120)
    lat = payload.get("lat")
    lng = payload.get("lng")

    if not category or lat is None or lng is None:
        return JsonResponse(
            {"error": "Los campos category, lat y lng son obligatorios."}, status=400
        )

    valid_categories = {choice[0] for choice in Report.CATEGORY_CHOICES}
    if category not in valid_categories:
        return JsonResponse({"error": "Categoria invalida."}, status=400)

    try:
        latitude = Decimal(str(lat))
        longitude = Decimal(str(lng))
    except (InvalidOperation, TypeError):
        return JsonResponse({"error": "Coordenadas invalidas."}, status=400)

    zone = find_zone_for_point(latitude, longitude)

    report = Report.objects.create(
        category=category,
        description=description,
        street_name=street_name,
        street_number=street_number,
        apartment=apartment,
        address_extra=address_extra,
        latitude=latitude,
        longitude=longitude,
        zone=zone,
    )

    return JsonResponse({"report": serialize_report(report)}, status=201)



# Mi logiiin


def login_view(request):

    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return redirect("reports:home")
        else:
            messages.error(request, "Usuario o contrasena incorrectos")

    return render(request, "login.html")

def logout_view(request):
    logout(request)
    return redirect("reports:login")


def register_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        password2 = request.POST.get("password2")

        if password != password2:
            messages.error(request, "Las contrasenas no coinciden.")
            return redirect("reports:register")

        if User.objects.filter(username=username).exists():
            messages.error(request, "El usuario ya existe.")
            return redirect("reports:register")

        # Crear usuario
        user = User.objects.create_user(username=username, password=password)
        user.save()

        messages.success(request, "Cuenta creada correctamente. Ahora puedes iniciar sesion.")
        return redirect("reports:login")

    return render(request, "register.html")
