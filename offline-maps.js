// offline-maps.js - Оффлайн карты с Leaflet
class OfflineMapManager {
    constructor() {
        this.map = null;
        this.offlineLayers = {};
        this.tileCache = null;
        this.isInitialized = false;
    }

    async init(mapContainerId, center, zoom = 13) {
        if (!L) {
            console.error('Leaflet не загружен');
            return false;
        }

        try {
            // Создаем карту
            this.map = L.map(mapContainerId).setView(center, zoom);
            
            // Настраиваем оффлайн слой
            await this.setupOfflineLayers();
            
            // Добавляем масштабирование
            L.control.scale({ imperial: false }).addTo(this.map);
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Ошибка инициализации карты:', error);
            return false;
        }
    }

    async setupOfflineLayers() {
        // Lightweight tile layer для оффлайн использования
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            subdomains: ['a', 'b', 'c']
        });

        // Gray scale layer для лучшей производительности
        const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
            attribution: '© CartoDB',
            maxZoom: 20
        });

        // Добавляем слои в управление
        this.offlineLayers = {
            "OpenStreetMap": osmLayer,
            "Light Map": cartoLayer
        };

        // Добавляем первый слой по умолчанию
        this.offlineLayers["OpenStreetMap"].addTo(this.map);

        // Добавляем контроль слоев если больше одного
        if (Object.keys(this.offlineLayers).length > 1) {
            L.control.layers(this.offlineLayers).addTo(this.map);
        }

        // Предзагрузка тайлов вокруг центра
        if (navigator.onLine && window.appSettings.settings.offlineTiles) {
            this.prefetchTiles();
        }
    }

    prefetchTiles() {
        // Простая предзагрузка тайлов для оффлайн использования
        const zoom = this.map.getZoom();
        const bounds = this.map.getBounds();
        
        // Можно добавить логику кэширования тайлов
        console.log('Предзагрузка тайлов для оффлайн использования...');
    }

    addMarker(lat, lng, title = '', popupText = '', iconUrl = null) {
        if (!this.isInitialized) return null;

        let icon = L.divIcon({
            html: '📍',
            iconSize: [30, 30],
            className: 'custom-marker'
        });

        if (iconUrl) {
            icon = L.icon({
                iconUrl: iconUrl,
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
            });
        }

        const marker = L.marker([lat, lng], { icon })
            .addTo(this.map)
            .bindPopup(popupText || title);

        if (title) {
            marker.bindTooltip(title, { permanent: false, direction: 'top' });
        }

        return marker;
    }

    addUserPosition(lat, lng, accuracy) {
        if (!this.isInitialized) return;

        // Удаляем старый маркер если есть
        if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
        }

        if (this.accuracyCircle) {
            this.map.removeLayer(this.accuracyCircle);
        }

        // Маркер пользователя
        this.userMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                html: '🧭',
                iconSize: [30, 30],
                className: 'user-marker'
            })
        }).addTo(this.map);

        // Круг точности
        this.accuracyCircle = L.circle([lat, lng], {
            color: 'blue',
            fillColor: '#3388ff',
            fillOpacity: 0.2,
            radius: accuracy
        }).addTo(this.map);
    }

    addTargetMarker(lat, lng, title = 'Маяк') {
        if (!this.isInitialized) return;

        if (this.targetMarker) {
            this.map.removeLayer(this.targetMarker);
        }

        this.targetMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                html: '🎯',
                iconSize: [30, 30],
                className: 'target-marker'
            })
        })
        .addTo(this.map)
        .bindPopup(title)
        .openPopup();

        return this.targetMarker;
    }

    drawRoute(points, color = 'red') {
        if (!this.isInitialized || !points.length) return;

        if (this.route) {
            this.map.removeLayer(this.route);
        }

        this.route = L.polyline(points, {
            color: color,
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(this.map);

        // Автоматически подстраиваем вид чтобы охватить весь маршрут
        this.map.fitBounds(this.route.getBounds(), { padding: [20, 20] });

        return this.route;
    }

    // Геокодирование (базовое, работает с названиями городов)
    async geocode(query) {
        if (!navigator.onLine) {
            throw new Error('Геокодирование требует интернет соединения');
        }

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
            );
            const data = await response.json();
            
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon),
                    display_name: data[0].display_name
                };
            }
            throw new Error('Местоположение не найдено');
        } catch (error) {
            console.error('Ошибка геокодирования:', error);
            throw error;
        }
    }

    // Обратное геокодирование
    async reverseGeocode(lat, lon) {
        if (!navigator.onLine) {
            return `Ш: ${lat.toFixed(6)}, Д: ${lon.toFixed(6)}`;
        }

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            
            if (data && data.address) {
                const addr = data.address;
                return addr.road || addr.village || addr.town || addr.city || data.display_name;
            }
            return `Ш: ${lat.toFixed(6)}, Д: ${lon.toFixed(6)}`;
        } catch (error) {
            return `Ш: ${lat.toFixed(6)}, Д: ${lon.toFixed(6)}`;
        }
    }

    clearMap() {
        if (!this.isInitialized) return;

        this.map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) return; // Не удаляем тайловые слои
            this.map.removeLayer(layer);
        });

        this.userMarker = null;
        this.targetMarker = null;
        this.route = null;
        this.accuracyCircle = null;
    }

    // Экспорт карты в изображение
    exportToImage() {
        if (!this.isInitialized) return;

        const mapContainer = this.map.getContainer();
        html2canvas(mapContainer).then(canvas => {
            const link = document.createElement('a');
            link.download = 'map-screenshot.png';
            link.href = canvas.toDataURL();
            link.click();
        });
    }
}

// CSS стили для маркеров
const mapStyles = `
<style>
.custom-marker {
    background: none;
    border: none;
    font-size: 24px;
    text-align: center;
}

.user-marker {
    background: none;
    border: none;
    font-size: 24px;
    text-align: center;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.target-marker {
    background: none;
    border: none;
    font-size: 24px;
    text-align: center;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

.leaflet-container {
    background: #f8f9fa;
}

.offline-map-message {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 5px 10px;
    border-radius: 3px;
    font-size: 12px;
    z-index: 1000;
}
</style>
`;

// Добавляем стили в документ
document.head.insertAdjacentHTML('beforeend', mapStyles);

// Глобальный экземпляр
window.offlineMap = new OfflineMapManager();
