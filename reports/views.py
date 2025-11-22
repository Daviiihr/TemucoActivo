import json
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import render
from django.views.decorators.http import require_http_methods

from .models import Report


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
        return JsonResponse({"error": "JSON inválido."}, status=400)

    category = payload.get("category")
    description = payload.get("description", "")
    lat = payload.get("lat")
    lng = payload.get("lng")

    if not category or lat is None or lng is None:
        return JsonResponse(
            {"error": "Los campos category, lat y lng son obligatorios."}, status=400
        )

    valid_categories = {choice[0] for choice in Report.CATEGORY_CHOICES}
    if category not in valid_categories:
        return JsonResponse({"error": "Categoría inválida."}, status=400)

    try:
        latitude = Decimal(str(lat))
        longitude = Decimal(str(lng))
    except (InvalidOperation, TypeError):
        return JsonResponse({"error": "Coordenadas inválidas."}, status=400)

    report = Report.objects.create(
        category=category,
        description=description,
        latitude=latitude,
        longitude=longitude,
    )

    return JsonResponse({"report": serialize_report(report)}, status=201)
