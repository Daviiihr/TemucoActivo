from django.urls import path

from . import views

#mi cambio igual
from .views import login_view, logout_view

app_name = "reports"

urlpatterns = [
    path("", views.home, name="home"),
    path("api/reports/", views.reports_api, name="reports_api"),
    path("api/zones/", views.zones_api, name="zones_api"),
    # Ruta de dashboard staff para zonas (evita conflicto con admin/)
    path("staff/zones/", views.zones_admin, name="zones_admin"),
    path("staff/zones/api/", views.zones_admin_api, name="zones_admin_api"),
    path("staff/zones/<int:zone_id>/edit/", views.zone_edit, name="zone_edit"),
    path("staff/zones/<int:zone_id>/delete/", views.zone_delete, name="zone_delete"),
    path("consultas/", views.reports_sql_summary, name="reports_sql_summary"),
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("register/", views.register_view, name="register"),

]
