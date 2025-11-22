from django.contrib import admin

from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("category", "latitude", "longitude", "created_at")
    list_filter = ("category", "created_at")
    search_fields = ("description", "category")
    ordering = ("-created_at",)
