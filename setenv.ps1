# Variables de entorno para ejecutar Django con Google Maps y PostgreSQL.
# Completa los valores sensibles antes de usar.

$env:DJANGO_SECRET_KEY = 'cambia_esta_clave'
$env:DJANGO_ALLOWED_HOSTS = 'localhost,127.0.0.1'
$env:GOOGLE_MAPS_API_KEY = 'AIzaSyAptEdCxB-hTERETSQtMGlUrWSX3UkrY5U'
# Opcional: deja vacío si no usas un Map ID personalizado.
$env:GOOGLE_MAPS_MAP_ID = '2ab743cd00ef80bcda57eb6a'

$env:POSTGRES_DB = 'temuco'
$env:POSTGRES_USER = 'postgres'
$env:POSTGRES_PASSWORD = 'gabo2005'
$env:POSTGRES_HOST = 'localhost'
$env:POSTGRES_PORT = '5432'

# Desarrollo: si quieres volver temporalmente a SQLite
# $env:USE_SQLITE_FALLBACK = 'true'

Write-Host "Variables de entorno cargadas. Ahora puedes ejecutar:"
Write-Host ". .venv\Scripts\Activate.ps1; python manage.py runserver"
