"""
ASGI config for temucoactivo project.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "temucoactivo.settings")

application = get_asgi_application()
