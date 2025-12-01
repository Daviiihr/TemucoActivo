# Comunidad Activa Temuco (Django)

Mapa participativo para reportar incidentes barriales en Temuco. Permite hacer clic en el mapa, autocompletar la direccion (reverse geocoding), elegir categoria y enviar el reporte a la base de datos.

## Requisitos
- Python 3.11+
- PostgreSQL 14+ (o SQLite si usas `USE_SQLITE_FALLBACK=true`)
- Acceso a Internet para autocompletar direccion (servicio Nominatim de OpenStreetMap)

## Instalacion y arranque rapido
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Variables basicas
set DJANGO_SECRET_KEY=tu_clave_segura
set GOOGLE_MAPS_API_KEY=tu_api_key_de_google
set POSTGRES_DB=temucoactivo
set POSTGRES_USER=postgres
set POSTGRES_PASSWORD=tu_password
set POSTGRES_HOST=localhost
set POSTGRES_PORT=5432
# Opcional
set GOOGLE_MAPS_MAP_ID=2ab743cd00ef80bcda57eb6a
set USE_SQLITE_FALLBACK=false

# Base de datos (solo si usas Postgres y aun no existe)
createdb -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% %POSTGRES_DB%

python manage.py migrate
python manage.py runserver
```
Abre `http://127.0.0.1:8000/` y haz login. Clic en el mapa -> se abre el modal con direccion sugerida -> completa categoria y detalles -> Enviar.

## Funcionamiento
- **Mapa y UI**: Leaflet para el mapa; Toastify para avisos; Bootstrap + CSS propio para estilos.
- **Reportar**: un clic en el mapa guarda lat/lng temporales y dispara reverse geocoding (OpenStreetMap Nominatim) para precargar calle/numeracion/referencia. El usuario puede editar esos campos antes de enviar.
- **Categorias**: Vandalismo, Zona de Riesgo, Accidente, Luminaria, Microbasural (con filtros y emojis en botones).
- **Backend**: Django + `reports` app expone `/api/reports/` (GET/POST) y guarda en Postgres/SQLite.

## Variables de entorno
| Variable | Descripcion |
| --- | --- |
| `DJANGO_SECRET_KEY` | Clave privada obligatoria para produccion. |
| `DJANGO_DEBUG` | `true/false`, por defecto `true`. |
| `DJANGO_ALLOWED_HOSTS` | Hosts permitidos separados por coma. |
| `GOOGLE_MAPS_API_KEY` | Para cargar Google Maps (si se usa). |
| `GOOGLE_MAPS_MAP_ID` | Map ID opcional. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT` | Credenciales de PostgreSQL. |
| `USE_SQLITE_FALLBACK` | `true` para usar SQLite en desarrollo/pruebas. |

## Scripts utiles
- `python manage.py migrate` : aplica migraciones de base de datos.
- `python manage.py test` : prueba basica de los endpoints principales.
- `python manage.py runserver` : servidor de desarrollo.
- `python manage.py collectstatic` : prepara estaticos para despliegue.

## API
- `GET /api/reports/` : devuelve los reportes almacenados.
- `POST /api/reports/` : crea un reporte nuevo. Ejemplo:
```json
{
  "category": "Vandalismo",
  "description": "Semaforo rayado",
  "street_name": "Av. Alemania",
  "street_number": "123",
  "apartment": "Torre B, depto 404",
  "address_extra": "Frente a la plaza",
  "lat": -38.73,
  "lng": -72.59
}
```
Los campos de direccion son opcionales pero recomendados. Si el reverse geocoding falla, el usuario puede editarlos manualmente.

## Librerias principales
- Django (backend y ORM)
- Leaflet (mapa)
- Toastify (notificaciones)
- Bootstrap 5 (estilos base)
- OpenStreetMap Nominatim (reverse geocoding)

## Notas de despliegue
- En produccion configura `DJANGO_DEBUG=false`, `DJANGO_ALLOWED_HOSTS`, y claves seguras.
- Si usas el autocompletado de direccion, el servidor necesita salida a Internet.
- Ejecuta `python manage.py migrate` en cada despliegue cuando haya nuevas migraciones.

## Ideas futuras
- Menus laterales o hamburguesa para filtros.
- Buscador de calles.
- Accesibilidad (narrador/zoom de texto).
- Limitar el mapa a sectores especificos.
- Adjuntar fotos a cada reporte.
