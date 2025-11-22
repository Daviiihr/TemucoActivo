from django.urls import path

from . import views

app_name = "reports"

urlpatterns = [
    path("", views.home, name="home"),
    path("api/reports/", views.reports_api, name="reports_api"),
]
