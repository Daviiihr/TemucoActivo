// ====== VARIABLES GLOBALES ======

let map; // Variable para el objeto Mapa de Google
let tempLocation = null; // Almacena las coordenadas del último clic
let selectedCategory = null; // Almacena la categoría seleccionada

// Mapeo de categorías a colores de marcadores para una mejor visualización
const categoryColors = {
    'Vandalismo': 'E85141',     // Rojo
    'Zona de Riesgo': 'FFA500', // Naranja
    'Accidente': '4169E1',      // Azul Royal
    'Luminaria': 'FBBC04',      // Amarillo
    'Microbasural': '964B00'   // Café
};

// ====== ELEMENTOS DEL DOM (para no buscarlos a cada rato) ======
const modal = document.getElementById('report-modal');
const categoryButtons = document.querySelectorAll('.category-button');
const submitButton = document.getElementById('submit-report-btn');
const cancelButton = document.getElementById('cancel-report-btn');
const descriptionInput = document.getElementById('report-description');


// ====== FUNCIONES PRINCIPALES ======

/**
 * Función de inicialización del mapa. Se ejecuta cuando la API de Google está lista.
 */
function initMap() {
    const temucoCoords = { lat: -38.7359, lng: -72.5904 };
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: temucoCoords,
        // Desactivamos los puntos de interés por defecto para no saturar el mapa
        clickableIcons: false 
    });

    // Añade un listener para cuando el usuario hace clic en el mapa
    map.addListener('click', handleMapClick);
}

/**
 * Maneja el evento de clic en el mapa.
 * @param {google.maps.MapMouseEvent} event - El evento del clic.
 */
function handleMapClick(event) {
    tempLocation = event.latLng; // Guarda la ubicación del clic
    showModal(); // Muestra la ventana para crear el reporte
}

/**
 * Muestra la ventana modal con una animación.
 */
function showModal() {
    modal.classList.remove('modal-hidden');
    // Forzamos un reflow para que la transición de opacidad funcione
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
}

/**
 * Oculta la ventana modal y resetea su estado.
 */
function hideModal() {
    modal.style.opacity = '0';
    // Esperamos que termine la transición para ocultarlo con display:none
    setTimeout(() => {
        modal.classList.add('modal-hidden');
        resetModal(); // Limpia el formulario para el próximo uso
    }, 300);
}

/**
 * Limpia el formulario del modal (quita selección, borra texto).
 */
function resetModal() {
    // Quita la clase 'selected' de todos los botones de categoría
    categoryButtons.forEach(btn => btn.classList.remove('selected'));
    selectedCategory = null; // Resetea la categoría seleccionada
    descriptionInput.value = ''; // Borra el texto del textarea
}

/**
 * Crea un marcador permanente en el mapa con la información del reporte.
 * @param {google.maps.LatLng} location - La ubicación del reporte.
 * @param {string} category - La categoría del reporte.
 * @param {string} description - La descripción adicional.
 */
function createPermanentReport(location, category, description) {
    const pinColor = categoryColors[category] || 'FE7569'; // Color por defecto si no encuentra la categoría
    
    // Creamos un ícono de pin personalizado con el color correspondiente
    const pinGlyph = new google.maps.marker.PinElement({
        glyph: "📍", // Puedes usar un emoji o un ícono de FontAwesome
        glyphColor: "white",
        background: `#${pinColor}`,
        borderColor: "black",
    });

    // Crea el marcador permanente
    const marker = new google.maps.marker.AdvancedMarkerElement({
        position: location,
        map: map,
        title: `Reporte: ${category}`,
        content: pinGlyph.element, // Usamos el pin personalizado como contenido
    });

    // Crea la ventana de información que aparecerá al hacer clic en el marcador
    const infoWindowContent = `
        <div style="padding: 5px;">
            <h3 style="margin: 0 0 10px 0;">Reporte: ${category}</h3>
            ${description ? `<p><strong>Descripción:</strong> ${description}</p>` : ''}
            <p style="font-size: 0.8em; color: grey;">Ubicación: ${location.lat().toFixed(4)}, ${location.lng().toFixed(4)}</p>
        </div>
    `;
    const infoWindow = new google.maps.InfoWindow({ content: infoWindowContent });

    // Añade el listener para que la ventana se abra al hacer clic en el marcador
    marker.addListener('click', () => infoWindow.open(map, marker));
}


// ====== ASIGNACIÓN DE EVENT LISTENERS (se ejecuta una vez al cargar el script) ======

// Añade un listener a cada botón de categoría
categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Primero, quita la selección de todos los demás botones
        categoryButtons.forEach(btn => btn.classList.remove('selected'));
        // Luego, añade la clase 'selected' al botón presionado
        button.classList.add('selected');
        // Guarda la categoría seleccionada
        selectedCategory = button.dataset.category;
    });
});

// Listener para el botón de "Cancelar"
cancelButton.addEventListener('click', hideModal);

// Listener para el botón de "Enviar Reporte"
submitButton.addEventListener('click', () => {
    // Validamos que se haya guardado una ubicación y se haya seleccionado una categoría
    if (tempLocation && selectedCategory) {
        const description = descriptionInput.value;
        createPermanentReport(tempLocation, selectedCategory, description);
        hideModal(); // Oculta el modal después de enviar
    } else {
        alert("Por favor, selecciona una categoría para tu reporte.");
    }
});