import json

from django.test import TestCase
from django.urls import reverse

from .models import Report


class HomeViewTests(TestCase):
    def test_home_view_renders(self):
        response = self.client.get(reverse("reports:home"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Comunidad Activa Temuco")


class ReportsApiTests(TestCase):
    def setUp(self):
        Report.objects.create(
            category=Report.CATEGORY_VANDALISM,
            description="Rayados",
            latitude=-38.7354,
            longitude=-72.5901,
        )

    def test_reports_api_returns_db_entries(self):
        response = self.client.get(reverse("reports:reports_api"))
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("reports", payload)
        self.assertEqual(len(payload["reports"]), 1)
        self.assertEqual(payload["reports"][0]["category"], Report.CATEGORY_VANDALISM)

    def test_reports_api_creates_report(self):
        data = {
            "category": Report.CATEGORY_LIGHTING,
            "description": "Poste apagado",
            "lat": -38.74,
            "lng": -72.58,
        }
        response = self.client.post(
            reverse("reports:reports_api"),
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Report.objects.count(), 2)
