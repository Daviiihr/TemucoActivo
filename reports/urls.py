from django.urls import path

from . import views

#mi cambio igual
from .views import login_view, logout_view

app_name = "reports"

urlpatterns = [
    path("", views.home, name="home"),
    path("api/reports/", views.reports_api, name="reports_api"),
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("register/", views.register_view, name="register"),

]
