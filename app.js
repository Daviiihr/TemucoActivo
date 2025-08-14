// =================================================================
//                 VERSIÓN DE DIAGNÓSTICO
// =================================================================
console.log("Paso 0: Script app.js iniciado.");

// Pon tu clave de API aquí.
const API_KEY = 'AIzaSyBMS4wvV0guiacOdDhxELBPoeOIt_87o5g';

// ====== VARIABLES Y ELEMENTOS GLOBALES ======
let map;
let tempLocation = null;
let selectedCategory = null;
const categoryColors = { 'Vandalismo': 'E85141', 'Zona de Riesgo': 'FFA500', 'Accidente': '4169E1', 'Luminaria': 'FBBC04', 'Microbasural': '964B00' };
const modal = document.getElementById('report-modal');
const categoryButtons = document.querySelectorAll('.category-button');
const submitButton = document.getElementById('submit-report-btn');
const cancelButton = document.getElementById('cancel-report-btn');
const descriptionInput = document.getElementById('report-description');

categoryButtons.forEach(button => button.addEventListener('click', () => {
    categoryButtons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    selectedCategory = button.dataset.category;
}));
cancelButton.addEventListener('click', hideModal);

submitButton.addEventListener('click', () => {
    if (tempLocation && selectedCategory) {
        // Si todo está correcto, creamos el reporte
        createPermanentReport(tempLocation, selectedCategory, descriptionInput.value);
        hideModal(); // Ocultamos el modal

        // *** NUEVO: Mostramos una notificación de éxito ***
        Toastify({
            text: "✅ ¡Reporte enviado con éxito!",
            duration: 3000, // Duración en milisegundos
            gravity: "top", // `top` o `bottom`
            position: "right", // `left`, `center` o `right`
            style: {
                background: "linear-gradient(to right, #00b09b, #96c93d)",
            },
        }).showToast();

    } else {
        // *** CAMBIO: Reemplazamos el alert() por una notificación de error ***
        Toastify({
            text: "❌ Por favor, selecciona una categoría para tu reporte.",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: "linear-gradient(to right, #ff5f6d, #ffc371)",
            },
        }).showToast();
    }
});
// ====== LÓGICA DE CARGA ASÍNCRONA ======
async function loadGoogleMapsAPI() {
    return new Promise((resolve, reject) => {
        if (typeof google !== 'undefined' && google.maps) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=marker`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('No se pudo cargar el script de Google Maps.'));
        document.head.appendChild(script);
    });
}

// ====== FUNCIONES PRINCIPALES ======
function initMap() {
    console.log("Paso 2: Función initMap() ejecutada.");
    const temucoCoords = { lat: -38.7359, lng: -72.5904 };
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: temucoCoords,
        clickableIcons: false
    });

    console.log("Paso 3: Mapa creado. Añadiendo listener de clic...");
    map.addListener('click', handleMapClick);
}

function handleMapClick(event) {
    // ESTA ES LA PISTA MÁS IMPORTANTE
    console.log("✅ ¡ÉXITO! Clic detectado en el mapa en:", event.latLng.toString());
    tempLocation = event.latLng;
    showModal();
}

function showModal() {
    console.log("Mostrando modal...");
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
    const pinColor = categoryColors[category] || 'FE7569';
    const pinGlyph = new google.maps.marker.PinElement({
        glyph: "📍", glyphColor: "white", background: `#${pinColor}`, borderColor: "black",
    });
    const marker = new google.maps.marker.AdvancedMarkerElement({
        position: location, map: map, title: `Reporte: ${category}`, content: pinGlyph.element,
    });
    const infoWindowContent = `<div style="padding: 5px;"><h3 style="margin: 0 0 10px 0;">Reporte: ${category}</h3>${description ? `<p><strong>Descripción:</strong> ${description}</p>` : ''}<p style="font-size: 0.8em; color: grey;">Ubicación: ${location.lat().toFixed(4)}, ${location.lng().toFixed(4)}</p></div>`;
    const infoWindow = new google.maps.InfoWindow({ content: infoWindowContent });
    marker.addListener('click', () => infoWindow.open(map, marker));
}

// ====== ASIGNACIÓN DE EVENT LISTENERS ======
categoryButtons.forEach(button => button.addEventListener('click', () => {
    categoryButtons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    selectedCategory = button.dataset.category;
}));
cancelButton.addEventListener('click', hideModal);
submitButton.addEventListener('click', () => {
    if (tempLocation && selectedCategory) {
        createPermanentReport(tempLocation, selectedCategory, descriptionInput.value);
        hideModal();
    }
});

// ====== FUNCIÓN DE ARRANQUE ======
async function start() {
    try {
        await loadGoogleMapsAPI();
        console.log("Paso 1: API de Google Maps cargada correctamente.");
        initMap();
    } catch (error) {
        console.error("ERROR CRÍTICO:", error);
        alert("No se pudo cargar Google Maps. Revisa la consola (F12) para ver el error.");
    }
}

start();