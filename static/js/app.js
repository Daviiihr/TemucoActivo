const REPORTS_API_URL = "/api/reports/";
const ZONES_API_URL = "/api/zones/";
const CSRF_TOKEN =
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

let map;
let tempLocation = null;
let selectedCategory = null;
let sectorsRenderer;
let reportsRenderer;
const categoryColors = {
    Vandalismo: "#E85141",
    "Zona de Riesgo": "#FFA500",
    Accidente: "#4169E1",
    Luminaria: "#FBBC04",
    Microbasural: "#964B00",
};
const allMarkers = [];

const modal = document.getElementById("report-modal");
const zonesLayerGroup = L.layerGroup();
const categoryButtons = document.querySelectorAll(".BotonCategoria");
const submitButton = document.getElementById("submit-report-btn");
const cancelButton = document.getElementById("cancel-report-btn");
const descriptionInput = document.getElementById("report-description");
const streetNameInput = document.getElementById("street-name");
const streetNumberInput = document.getElementById("street-number");
const apartmentInput = document.getElementById("apartment");
const addressExtraInput = document.getElementById("address-extra");
const filterButtons = document.querySelectorAll(".BotonFiltro");
const zoneInfoEl = document.getElementById("zone-info");

const toggleZonesBtn = document.getElementById("btn-toggle-zones");

function pointInRing(point, ring) {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

function pointInPolygon(point, coordinates) {
    if (!coordinates || !coordinates.length) return false;
    const outer = coordinates[0];
    return pointInRing(point, outer);
}

function findZoneForLatLng(latlng) {
    if (!window.APP_ZONES) return null;
    const point = [latlng.lng, latlng.lat];
    for (const zone of window.APP_ZONES) {
        const geo = zone.geojson || {};
        const geometry = geo.geometry ? geo.geometry : geo;
        if (!geometry) continue;
        const type = geometry.type;
        const coords = geometry.coordinates;
        if (type === "Polygon" && pointInPolygon(point, coords)) return zone;
        if (type === "MultiPolygon") {
            for (const poly of coords || []) {
                if (pointInPolygon(point, poly)) return zone;
            }
        }
    }
    return null;
}

function updateZoneInfo(latlng) {
    if (!zoneInfoEl || !latlng) return;
    const zone = findZoneForLatLng(latlng);
    if (zone) {
        zoneInfoEl.innerHTML = `<span class="zone-chip">Zona: ${zone.name}</span>`;
    } else {
        zoneInfoEl.innerHTML = `<span class="zone-chip" style="background:#f8f9fa; border-color:#dee2e6; color:#6c757d;">Fuera de macro-zona</span>`;
    }
}

function initMap() {
    const temucoCoords = [-38.7359, -72.5904];
    map = L.map("map").setView(temucoCoords, 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(map);

    // 🔹 Pane para SECTORES (polígonos)
    map.createPane("paneSectors");
    map.getPane("paneSectors").style.zIndex = 350;
    map.getPane("paneSectors").style.pointerEvents = "none"; // que no capture clicks

    // 🔹 Pane para REPORTES (marcadores)
    map.createPane("paneReports");
    map.getPane("paneReports").style.zIndex = 600; // encima de sectores y tile overlays
    map.getPane("paneReports").style.pointerEvents = "auto";

    // Renderers separados por pane para evitar que Leaflet reutilice el mismo SVG
    sectorsRenderer = L.canvas({ pane: "paneSectors" }).addTo(map);
    reportsRenderer = L.svg({ pane: "paneReports" }).addTo(map);

    map.on("click", handleMapClick);
    zonesLayerGroup.addTo(map);
}

async function handleMapClick(event) {
    tempLocation = event.latlng;
    updateZoneInfo(event.latlng);
    showModal();
    await autofillAddressFromMap(event.latlng);
}

function showModal() {
    if (!modal) return;
    modal.classList.remove("ModalOculto");
    setTimeout(() => {
        modal.style.opacity = "1";
        if (descriptionInput) {
            descriptionInput.focus();
        }
    }, 10);
}

function hideModal() {
    if (!modal) return;
    modal.style.opacity = "0";
    setTimeout(() => {
        modal.classList.add("ModalOculto");
        resetModal();
    }, 300);
}

function resetModal() {
    categoryButtons.forEach((btn) => btn.classList.remove("selected"));
    selectedCategory = null;
    setAddressFields({});
    if (descriptionInput) descriptionInput.value = "";
    tempLocation = null;
}

function setAddressFields(address) {
    if (streetNameInput) streetNameInput.value = address.street_name || "";
    if (streetNumberInput) streetNumberInput.value = address.street_number || "";
    if (apartmentInput) apartmentInput.value = address.apartment || "";
    if (addressExtraInput) addressExtraInput.value = address.address_extra || "";
}

function formatAddress(report) {
    const addressParts = [];
    if (report.street_name) {
        const streetLine = `${report.street_name}${report.street_number ? " " + report.street_number : ""}`;
        addressParts.push(streetLine.trim());
    }
    if (report.apartment) {
        addressParts.push(`Depto/Bloque: ${report.apartment}`);
    }
    if (report.address_extra) {
        addressParts.push(report.address_extra);
    }
    if (report.zone_name) {
        addressParts.push(`Zona: ${report.zone_name}`);
    }
    return addressParts.join(" \u00b7 ");
}

async function reverseGeocode(latlng) {
    const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1`;
    const response = await fetch(url, {
        headers: { "User-Agent": "temucoactivo/1.0" },
    });
    if (!response.ok) {
        throw new Error(`Estado ${response.status}`);
    }
    const data = await response.json();
    const addr = data.address || {};
    return {
        street_name: addr.road || addr.pedestrian || addr.cycleway || "",
        street_number: addr.house_number || "",
        apartment: "",
        address_extra:
            addr.neighbourhood ||
            addr.suburb ||
            addr.village ||
            addr.town ||
            addr.city ||
            addr.state ||
            "",
    };
}

async function autofillAddressFromMap(latlng) {
    // Limpia los campos mientras buscamos la direccion
    setAddressFields({});
    const currentClick = { ...latlng };
    try {
        const address = await reverseGeocode(latlng);
        // Si el usuario hizo otro click mientras tanto, no sobreescribimos
        if (tempLocation && tempLocation.lat === currentClick.lat && tempLocation.lng === currentClick.lng) {
            setAddressFields(address);
        }
    } catch (error) {
        console.warn("No se pudo autocompletar la direccion:", error);
        Toastify({
            text: "\u26a0 No pudimos obtener la direccion automaticamente. Puedes escribirla manualmente.",
            duration: 3500,
            gravity: "top",
            position: "right",
            style: { background: "linear-gradient(to right, #ff5f6d, #ffc371)" },
        }).showToast();
    }
}

function createPermanentReport(location, report) {
    const pinColor = categoryColors[report.category] || "#FE7569";

    const marker = L.circleMarker(location, {
        pane: "paneReports",
        renderer: reportsRenderer,
        radius: 9,
        color: "#000",
        weight: 1,
        fillColor: pinColor,
        fillOpacity: 0.9,
    }).addTo(map);

    // Asegura que queda delante incluso si otro layer se añadió después
    marker.bringToFront();

    marker.category = report.category;
    allMarkers.push(marker);

    const addressText = formatAddress(report);
    const popupHtml = `
        <div style="padding: 5px;">
            <h3 style="margin: 0 0 10px 0;">Reporte: ${report.category}</h3>
            ${addressText ? `<p><strong>Dirección:</strong> ${addressText}</p>` : ""}
            <p>${report.description || "Sin descripción"}</p>
            <small>${new Date(report.created_at).toLocaleString()}</small>
        </div>
    `;

    marker.bindPopup(popupHtml);
}

function filterMarkers(category) {
    allMarkers.forEach((marker) => {
        if (category === "Todos" || marker.category === category) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }
    });
}

function setupEventListeners() {
    // 1. Definimos el botón aquí mismo para asegurar que lo encuentre
    const toggleZonesBtn = document.getElementById("btn-toggle-zones");

    // === Botones de Categoria (Modal) ===
    categoryButtons.forEach((button) => {
        button.addEventListener("click", () => {
            categoryButtons.forEach((btn) => btn.classList.remove("selected"));
            button.classList.add("selected");
            selectedCategory = button.dataset.category;
        });
    });

    if (cancelButton) {
        cancelButton.addEventListener("click", hideModal);
    }

    if (submitButton) {
        submitButton.addEventListener("click", async () => {
            if (tempLocation && selectedCategory) {
                try {
                    const payload = {
                        category: selectedCategory,
                        description: (descriptionInput?.value || "").trim(),
                        street_name: (streetNameInput?.value || "").trim(),
                        street_number: (streetNumberInput?.value || "").trim(),
                        apartment: (apartmentInput?.value || "").trim(),
                        address_extra: (addressExtraInput?.value || "").trim(),
                        lat: tempLocation.lat,
                        lng: tempLocation.lng,
                    };
                    const savedReport = await saveReport(payload);
                    const savedLocation = L.latLng(savedReport.lat, savedReport.lng);
                    createPermanentReport(savedLocation, savedReport);
                    hideModal();
                    Toastify({
                        text: "\u2714 Reporte enviado con exito!",
                        duration: 3000,
                        gravity: "top",
                        position: "right",
                        style: { background: "linear-gradient(to right, #00b09b, #96c93d)" },
                    }).showToast();
                } catch (error) {
                    Toastify({
                        text:
                            "\u26a0 No se pudo guardar el reporte. Intenta nuevamente. " +
                            (error?.message || ""),
                        duration: 4000,
                        gravity: "top",
                        position: "right",
                        style: { background: "linear-gradient(to right, #ff5f6d, #ffc371)" },
                    }).showToast();
                }
            } else {
                Toastify({
                    text: "\u26a0 Selecciona una categoria para tu reporte.",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: { background: "linear-gradient(to right, #ff5f6d, #ffc371)" },
                }).showToast();
            }
        });
    }

    //Botones de Filtro (Categorías en el mapa)
    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            // Omitimos el botón de macrozonas en este loop para que no se comporte como filtro de categoría
            if (button.id === 'btn-toggle-zones') return; 

            filterButtons.forEach((btn) => {
                if(btn.id !== 'btn-toggle-zones') btn.classList.remove("activo");
            });
            filterButtons.forEach((btn) => btn.classList.remove("activo"));
            button.classList.add("activo");
            const categoryToFilter = button.dataset.category;
            filterMarkers(categoryToFilter);
        });
    });

    //Lógica del Botón Mostrar/Ocultar Macrozonas
    if (toggleZonesBtn) {
        // Estado inicial: Activo (Azul relleno) porque las zonas cargan visibles
        toggleZonesBtn.style.backgroundColor = "#0d6efd";
        toggleZonesBtn.style.color = "#fff";

        toggleZonesBtn.addEventListener("click", () => {
            if (map.hasLayer(zonesLayerGroup)) {
                // Si están visibles -> Ocultar
                map.removeLayer(zonesLayerGroup);
                
                // Estilo desactivado (transparente con borde azul)
                toggleZonesBtn.style.backgroundColor = "transparent";
                toggleZonesBtn.style.color = "#0d6efd";
            } else {
                // Si están ocultas -> Mostrar
                map.addLayer(zonesLayerGroup);
                
                // Estilo activo (azul relleno)
                toggleZonesBtn.style.backgroundColor = "#0d6efd";
                toggleZonesBtn.style.color = "#fff";
            }
        });
    }
}

async function loadExistingReports() {
    try {
        const response = await fetch(REPORTS_API_URL);
        if (!response.ok) {
            throw new Error(`Estado ${response.status}`);
        }
        const data = await response.json();
        (data.reports || []).forEach((report) => {
            const loc = L.latLng(report.lat, report.lng);
            createPermanentReport(loc, report);
        });
    } catch (error) {
        console.warn("No se pudieron cargar los reportes iniciales:", error);
    }
}
async function loadZones() {
    try {
        const response = await fetch(ZONES_API_URL);
        if (!response.ok) throw new Error(`Estado ${response.status}`);
        const data = await response.json();

        zonesLayerGroup.clearLayers();

        (data.zones || []).forEach((zone) => {
            if (!zone.geojson) return;

            const layer = L.geoJSON(zone.geojson, {
                pane: "paneSectors",   
                renderer: sectorsRenderer,
                interactive: false,
                bubblingMouseEvents: false,
                pane: "paneSectors",        // 👈 va al pane de sectores
                renderer: sectorsRenderer,
                interactive: false,         // 👈 no recibe clicks
                bubblingMouseEvents: false, // 👈 no bloquea eventos
                style: {
                    color: zone.color || "#1e88e5",
                    weight: 2,
                    fillOpacity: 0.25,
                },
            });

            // Etiqueta permanente con el nombre del macrosector
            // Etiqueta permanente con el nombre del macrosector (opcional pero bonito)
            layer.bindTooltip(zone.name, {
                permanent: true,
                direction: "center",
                className: "zone-label",
            });

            zonesLayerGroup.addLayer(layer);
        });

        window.APP_ZONES = data.zones || [];
        if (tempLocation) updateZoneInfo(tempLocation);
    } catch (error) {
        console.warn("No se pudieron cargar las zonas:", error);
    }
}


async function saveReport(payload) {
    const response = await fetch(REPORTS_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let errorMessage = "Error desconocido.";
        try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
        } catch (error) {
            // Ignorar error de parseo.
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.report;
}

async function start() {
    try {
        initMap();
        setupEventListeners();
        await loadZones();
        await loadExistingReports();
    } catch (error) {
        console.error("Error al cargar el mapa:", error);
        alert("No se pudo cargar el mapa. Revisa la consola (F12) para mas detalles.");
    }
}

start();
