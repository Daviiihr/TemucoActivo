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
    street_name = models.CharField(max_length=120, blank=True)
    street_number = models.CharField(max_length=20, blank=True)
    apartment = models.CharField(max_length=50, blank=True)
    address_extra = models.CharField(max_length=120, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        if self.street_name:
            address = f"{self.street_name} {self.street_number}".strip()
            return f"{self.category} @ {address}"
        return f"{self.category} @ {self.latitude},{self.longitude}"
