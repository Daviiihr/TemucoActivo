from django.db import models


class Report(models.Model):
    CATEGORY_VANDALISM = "Vandalismo"
    CATEGORY_RISK = "Zona de Riesgo"
    CATEGORY_ACCIDENT = "Accidente"
    CATEGORY_LIGHTING = "Luminaria"
    CATEGORY_MICRODUMP = "Microbasural"

    CATEGORY_CHOICES = [
        (CATEGORY_VANDALISM, "Vandalismo"),
        (CATEGORY_RISK, "Zona de Riesgo"),
        (CATEGORY_ACCIDENT, "Accidente"),
        (CATEGORY_LIGHTING, "Luminaria"),
        (CATEGORY_MICRODUMP, "Microbasural"),
    ]

    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.category} @ {self.latitude},{self.longitude}"

