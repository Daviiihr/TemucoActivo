import json
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import render, redirect
from django.views.decorators.http import require_http_methods

from .models import Report

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


def serialize_report(report: Report) -> dict:
    return {
        "id": report.id,
        "category": report.category,
        "description": report.description,
        "street_name": report.street_name,
        "street_number": report.street_number,
        "apartment": report.apartment,
        "address_extra": report.address_extra,
        "lat": float(report.latitude),
        "lng": float(report.longitude),
        "created_at": report.created_at.isoformat(),
    }


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

    report = Report.objects.create(
        category=category,
        description=description,
        street_name=street_name,
        street_number=street_number,
        apartment=apartment,
        address_extra=address_extra,
        latitude=latitude,
        longitude=longitude,
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
