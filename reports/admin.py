from django.contrib import admin

from .models import Report, Zone


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("category", "zone", "latitude", "longitude", "created_at")
    list_filter = ("category", "zone", "created_at")
    search_fields = ("description", "category", "street_name", "street_number")
    ordering = ("-created_at",)


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name",)
