// =================================================================
//                     VERSIÓN DE PRUEBA 2
// =================================================================

const API_KEY = 'AIzaSyCSJGL-_AFrKMuMs9i5nqZMbCGGSEMet7E';
const MAP_ID = '2ab743cd00ef80bcda57eb6a';

// ====== VARIABLES Y ELEMENTOS GLOBALES ======
let map;
let tempLocation = null;
let selectedCategory = null;
const categoryColors = { 'Vandalismo': 'E85141', 'Zona de Riesgo': 'FFA500', 'Accidente': '4169E1', 'Luminaria': 'FBBC04', 'Microbasural': '964B00' };
let allMarkers = [];

// Elementos del DOM
const modal = document.getElementById('report-modal');
const categoryButtons = document.querySelectorAll('.category-button');
const submitButton = document.getElementById('submit-report-btn');
const cancelButton = document.getElementById('cancel-report-btn');
const descriptionInput = document.getElementById('report-description');
const filterButtons = document.querySelectorAll('.filter-btn');

// ====== LÓGICA DE CARGA ASÍNCRONA ======
async function loadGoogleMapsAPI() {
    return new Promise((resolve, reject) => {
        if (typeof google !== 'undefined' && google.maps) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        // Usamos la versión estable (quarterly) y la librería 'marker'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=quarterly&libraries=marker`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('No se pudo cargar el script de Google Maps.'));
        document.head.appendChild(script);
    });
}

// ====== FUNCIONES PRINCIPALES ======
function initMap() {
    const temucoCoords = { lat: -38.7359, lng: -72.5904 };
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: temucoCoords,
        clickableIcons: false,
        mapId: MAP_ID // Usamos la variable correcta MAP_ID
    });
    map.addListener('click', handleMapClick);
}

function handleMapClick(event) {
    tempLocation = event.latLng;
    showModal();
}

function showModal() {
    modal.classList.remove('modal-hidden');
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
}

function hideModal() {
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.classList.add('modal-hidden');
        resetModal();
    }, 300);
}

function resetModal() {
    categoryButtons.forEach(btn => btn.classList.remove('selected'));
    selectedCategory = null;
    descriptionInput.value = '';
}

function createPermanentReport(location, category, description) {
    // Restauramos los pines de colores personalizados
    const pinColor = categoryColors[category] || 'FE7569';
    const pinGlyph = new google.maps.marker.PinElement({
        glyph: "📍", glyphColor: "white", background: `#${pinColor}`, borderColor: "black",
    });

    const marker = new google.maps.marker.AdvancedMarkerElement({
        position: location, map: map, title: `Reporte: ${category}`, content: pinGlyph.element,
    });

    marker.category = category;
    allMarkers.push(marker);

    // Creamos el InfoWindow solo al hacer clic para máxima estabilidad
    marker.addListener('click', () => {
        const infoWindowContent = `<div style="padding: 5px;"><h3 style="margin: 0 0 10px 0;">Reporte: ${category}</h3>${description ? `<p><strong>Descripción:</strong> ${description}</p>` : ''}<p style="font-size: 0.8em; color: grey;">Ubicación: ${location.lat().toFixed(4)}, ${location.lng().toFixed(4)}</p></div>`;
        const infoWindow = new google.maps.InfoWindow({ content: infoWindowContent });
        
        infoWindow.open({
            anchor: marker,
            map,
        });
    });
}

function filterMarkers(category) {
    allMarkers.forEach(marker => {
        if (category === 'Todos' || marker.category === category) {
            marker.setMap(map);
        } else {
            marker.setMap(null);
        }
    });
}

// ====== ASIGNACIÓN DE EVENT LISTENERS (UN SOLO BLOQUE ORDENADO) ======
function setupEventListeners() {
    // Listeners para los botones de categoría DENTRO del modal
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedCategory = button.dataset.category;
        });
    });

    // Listeners para los botones de CANCELAR y ENVIAR del modal
    cancelButton.addEventListener('click', hideModal);

    submitButton.addEventListener('click', () => {
        if (tempLocation && selectedCategory) {
            createPermanentReport(tempLocation, selectedCategory, descriptionInput.value);
            hideModal();
            Toastify({
                text: "✅ ¡Reporte enviado con éxito!", duration: 3000, gravity: "top", position: "right",
                style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
            }).showToast();
        } else {
            Toastify({
                text: "❌ Por favor, selecciona una categoría para tu reporte.", duration: 3000, gravity: "top", position: "right",
                style: { background: "linear-gradient(to right, #ff5f6d, #ffc371)" }
            }).showToast();
        }
    });

    // Listeners para los botones de FILTRO fuera del mapa
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const categoryToFilter = button.dataset.category;
            filterMarkers(categoryToFilter);
        });
    });
}

// ====== FUNCIÓN DE ARRANQUE ======
async function start() {
    try {
        await loadGoogleMapsAPI();
        initMap();
        setupEventListeners(); // Llamamos a la función que configura todos los listeners
    } catch (error) {
        console.error("ERROR CRÍTICO AL CARGAR GOOGLE MAPS:", error);
        alert("No se pudo cargar el mapa. Revisa la consola (F12) para más detalles.");
    }
}

// Inicia todo el proceso
start();