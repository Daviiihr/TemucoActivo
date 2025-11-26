const REPORTS_API_URL = "/api/reports/";
const CSRF_TOKEN =
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

let map;
let tempLocation = null;
let selectedCategory = null;
const categoryColors = {
    Vandalismo: "#E85141",
    "Zona de Riesgo": "#FFA500",
    Accidente: "#4169E1",
    Luminaria: "#FBBC04",
    Microbasural: "#964B00",    
};
const allMarkers = [];

const modal = document.getElementById("report-modal");
// ✅ Selector corregido a clase en español
const categoryButtons = document.querySelectorAll(".BotonCategoria");
const submitButton = document.getElementById("submit-report-btn");
const cancelButton = document.getElementById("cancel-report-btn");
const descriptionInput = document.getElementById("report-description");
// ✅ Selector corregido a clase en español
const filterButtons = document.querySelectorAll(".BotonFiltro");

function initMap() {
    const temucoCoords = [-38.7359, -72.5904];
    map = L.map("map").setView(temucoCoords, 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(map);

    map.on("click", handleMapClick);
}

function handleMapClick(event) {
    tempLocation = event.latlng;
    showModal();
}

function showModal() {
    if (!modal) return;
    // ✅ Clase de visibilidad corregida a español
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
        // ✅ Clase de visibilidad corregida a español
        modal.classList.add("ModalOculto");
        resetModal();
    }, 300);
}

function resetModal() {
    // ✅ Clase de estado activo del botón de categoría se mantiene en inglés
    categoryButtons.forEach((btn) => btn.classList.remove("selected"));
    selectedCategory = null;
    if (descriptionInput) {
        descriptionInput.value = "";
    }
    tempLocation = null;
}

function createPermanentReport(location, category, description) {
    const pinColor = categoryColors[category] || "#FE7569";
    const marker = L.circleMarker(location, {
        radius: 9,
        color: "#000",
        weight: 1,
        fillColor: pinColor,
        fillOpacity: 0.9,
    }).addTo(map);

    marker.category = category;
    allMarkers.push(marker);

    const popupHtml = `
        <div style="padding: 5px;">
            <h3 style="margin: 0 0 10px 0;">Reporte: ${category}</h3>
            ${description ? `<p><strong>Descripción:</strong> ${description}</p>` : ""}
            <p style="font-size: 0.8em; color: grey;">
                Ubicación: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}
            </p>
        </div>`;
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
    // === Botones de Categoría (Modal) ===
    categoryButtons.forEach((button) => {
        button.addEventListener("click", () => {
            // ✅ Clase de estado activo del botón de categoría se mantiene en inglés
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
                        description: descriptionInput?.value ?? "",
                        lat: tempLocation.lat,
                        lng: tempLocation.lng,
                    };
                    const savedReport = await saveReport(payload);
                    const savedLocation = L.latLng(savedReport.lat, savedReport.lng);
                    createPermanentReport(
                        savedLocation,
                        savedReport.category,
                        savedReport.description || ""
                    );
                    hideModal();
                    Toastify({
                        text: "✅ ¡Reporte enviado con éxito!",
                        duration: 3000,
                        gravity: "top",
                        position: "right",
                        style: { background: "linear-gradient(to right, #00b09b, #96c93d)" },
                    }).showToast();
                } catch (error) {
                    Toastify({
                        text:
                            "⚠️ No se pudo guardar el reporte. Intenta nuevamente. " +
                            (error?.message || ""),
                        duration: 4000,
                        gravity: "top",
                        position: "right",
                        style: { background: "linear-gradient(to right, #ff5f6d, #ffc371)" },
                    }).showToast();
                }
            } else {
                Toastify({
                    text: "⚠️ Selecciona una categoría para tu reporte.",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: { background: "linear-gradient(to right, #ff5f6d, #ffc371)" },
                }).showToast();
            }
        });
    }

    // === Botones de Filtro ===
    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            // ✅ Clase de estado activo del botón de filtro corregida a español
            filterButtons.forEach((btn) => btn.classList.remove("activo"));
            button.classList.add("activo");
            const categoryToFilter = button.dataset.category;
            filterMarkers(categoryToFilter);
        });
    });
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
            createPermanentReport(loc, report.category, report.description || "");
        });
    } catch (error) {
        console.warn("No se pudieron cargar los reportes iniciales:", error);
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
        await loadExistingReports();
    } catch (error) {
        console.error("Error al cargar el mapa:", error);
        alert("No se pudo cargar el mapa. Revisa la consola (F12) para más detalles.");
    }
}

start();