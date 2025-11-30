# Comunidad Activa Temuco (Django)

Aplicacion Django que renderiza el mapa participativo de reportes ciudadanos con filtros y un modal para registrar incidentes en Temuco.

## Requisitos

- Python 3.11 o superior

## Configuracion local

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

set DJANGO_SECRET_KEY=tu_clave_segura
set GOOGLE_MAPS_API_KEY=tu_api_key_de_google
set POSTGRES_DB=temucoactivo
set POSTGRES_USER=postgres
set POSTGRES_PASSWORD=tu_password
set POSTGRES_HOST=localhost
set POSTGRES_PORT=5432
# Opcional
set GOOGLE_MAPS_MAP_ID=2ab743cd00ef80bcda57eb6a

# Crea la base de datos en PostgreSQL si aun no existe
createdb -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% %POSTGRES_DB%

python manage.py migrate
python manage.py runserver
```

Abre `http://127.0.0.1:8000/` en tu navegador para ver el mapa.

## Variables de entorno clave

| Variable | Descripcion |
| --- | --- |
| `DJANGO_SECRET_KEY` | Clave privada obligatoria para produccion. |
| `DJANGO_DEBUG` | `true/false` para activar el modo debug. Por defecto `true`. |
| `DJANGO_ALLOWED_HOSTS` | Lista separada por comas con hosts permitidos. |
| `GOOGLE_MAPS_API_KEY` | Requerida para cargar el mapa. |
| `GOOGLE_MAPS_MAP_ID` | Map ID opcional para estilos personalizados. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT` | Credenciales de la base de datos PostgreSQL. |
| `USE_SQLITE_FALLBACK` | Solo para desarrollo/pruebas. Si es `true`, usa SQLite en vez de PostgreSQL. |

## Scripts utiles

- `python manage.py test` : prueba basica de los endpoints principales.
- `python manage.py runserver` : servidor de desarrollo.
- `python manage.py collectstatic` : preparar archivos estaticos para despliegues.

## API disponible

- `GET /api/reports/` : devuelve los reportes almacenados en la base de datos.
- `POST /api/reports/` : crea un reporte nuevo. Body JSON:

```json
{
  "category": "Vandalismo",
  "description": "",
  "street_name": "Av. Alemania",
  "street_number": "123",
  "apartment": "Torre B, depto 404",
  "address_extra": "Frente a la plaza",
  "lat": -38.73,
  "lng": -72.59
}
```

Los campos de direccion son opcionales pero recomendados para ubicar mejor el incidente.

## Lluvia de ideas / proximas mejoras

- Interfaz secundaria para filtros (menu hamburguesa).
- Pantalla de introduccion.
- Buscador de calles.
- Narrador de voz y aumento de texto para accesibilidad.
- Limitar el mapa al sector Freire-Lautaro.
- Menu para resenas con fotos cercanas.
- Adjuntar fotos en cada reporte.
