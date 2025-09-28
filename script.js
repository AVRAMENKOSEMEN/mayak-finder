class MayakFinder {
    constructor() {
        this.latitude = null;
        this.longitude = null;
        this.device = null;
        this.server = null;
        this.isConnected = false;
        this.coordinatesCount = 0;
        this.map = null;
        this.userMarker = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initMiniMap();
        this.updateCoordinatesCount();
        this.startUserLocationTracking();
    }

    bindEvents() {
        document.getElementById('connectBtn').addEventListener('click', () => this.connectBluetooth());
        document.getElementById('copyBtn').addEventListener('click', () => this.copyCoordinates());
        document.getElementById('openMapBtn').addEventListener('click', () => this.openMap());
        document.getElementById('openExternalMapsBtn').addEventListener('click', () => this.openExternalMaps());
        document.getElementById('testBtn').addEventListener('click', () => this.useTestData());
        document.getElementById('lightOnBtn').addEventListener('click', () => this.controlLight(true));
        document.getElementById('lightOffBtn').addEventListener('click', () => this.controlLight(false));
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('historyBtn').addEventListener('click', () => this.showHistory());

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal);
            });
        });
    }

    initMiniMap() {
        const mapContainer = document.getElementById('mapPreview');
        if (!mapContainer || !L) return;

        try {
            this.map = L.map('mapPreview').setView([55.241867, 72.908588], 3);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 18
            }).addTo(this.map);

            // Добавляем начальный маркер маяка
            L.marker([55.241867, 72.908588])
                .addTo(this.map)
                .bindPopup('📍 Ожидание данных маяка')
                .openPopup();

        } catch (error) {
            console.log('Мини-карта не инициализирована:', error);
        }
    }

    startUserLocationTracking() {
        if (!navigator.geolocation) {
            this.log('❌ Геолокация не поддерживается');
            return;
        }

        navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                this.updateUserPositionOnMiniMap(lat, lon, accuracy);
            },
            (error) => {
                this.log('⚠️ Не удалось получить местоположение: ' + error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    }

    updateUserPositionOnMiniMap(lat, lon, accuracy) {
        if (!this.map) return;

        // Удаляем старый маркер пользователя
        if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
        }

        // Создаем новый маркер пользователя
        this.userMarker = L.marker([lat, lon], {
            icon: L.divIcon({
                html: '🧭',
                iconSize: [25, 25],
                className: 'user-marker'
            })
        }).addTo(this.map).bindPopup(`
            <strong>📍 Ваше положение</strong><br>
            Точность: ${Math.round(accuracy)}м<br>
            Ш: ${lat.toFixed(6)}<br>
            Д: ${lon.toFixed(6)}
        `);

        // Если есть координаты маяка, центрируем карту между ними
        if (this.latitude && this.longitude) {
            const group = new L.featureGroup([this.userMarker, this.map.getLayers().find(layer => layer instanceof L.Marker && layer !== this.userMarker)]);
            this.map.fitBounds(group.getBounds().pad(0.1));
        } else {
            // Иначе центрируем на пользователе
            this.map.setView([lat, lon], 13);
        }
    }

    async connectBluetooth() {
        try {
            this.log('🔵 Поиск Bluetooth устройств...');
            
            if (!navigator.bluetooth) {
                throw new Error('Bluetooth не поддерживается вашим браузером');
            }

            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: 'Mayak' }],
                optionalServices: ['battery_service', 'device_information']
            });

            this.log('📱 Устройство найдено: ' + this.device.name);
            
            this.device.addEventListener('gattserverdisconnected', () => {
                this.onDisconnected();
            });

            const server = await this.device.gatt.connect();
            this.log('✅ Подключено к GATT серверу');

            await this.setupBluetoothServices(server);
            
            this.isConnected = true;
            this.updateConnectionStatus(true);

        } catch (error) {
            this.log('❌ Ошибка подключения: ' + error.message);
            this.updateConnectionStatus(false);
        }
    }

    async setupBluetoothServices(server) {
        try {
            this.log('📡 Ожидание данных от маяка...');
            
            // Имитируем получение данных каждые 5 секунд
            setInterval(() => {
                if (this.isConnected) {
                    const testLat = 55.241867 + (Math.random() - 0.5) * 0.001;
                    const testLon = 72.908588 + (Math.random() - 0.5) * 0.001;
                    this.handleReceivedData(testLat, testLon);
                }
            }, 5000);

        } catch (error) {
            this.log('⚠️ Не удалось настроить сервисы: ' + error.message);
        }
    }

    handleReceivedData(lat, lon) {
        this.updateCoordinates(lat, lon);
        this.coordinatesCount++;
        this.updateCoordinatesCount();
        
        if (window.coordinatesHistory) {
            window.coordinatesHistory.addEntry(lat, lon, Date.now(), 'Маяк');
        }
    }

    updateCoordinates(lat, lon) {
        this.latitude = lat;
        this.longitude = lon;
        
        const coordsText = `Ш: ${lat.toFixed(6)}, Д: ${lon.toFixed(6)}`;
        document.getElementById('coordinatesText').textContent = coordsText;
        
        // Активируем кнопки
        document.getElementById('copyBtn').disabled = false;
        document.getElementById('openMapBtn').disabled = false;
        document.getElementById('openExternalMapsBtn').disabled = false;
        document.getElementById('lightOnBtn').disabled = false;
        document.getElementById('lightOffBtn').disabled = false;
        
        this.log('📍 Новые координаты: ' + coordsText);
        this.updateMiniMap(lat, lon);
    }

    updateMiniMap(lat, lon) {
        if (!this.map) return;

        // Удаляем старые маркеры маяка (кроме маркера пользователя)
        this.map.eachLayer(layer => {
            if (layer instanceof L.Marker && layer !== this.userMarker) {
                this.map.removeLayer(layer);
            }
        });

        // Добавляем новый маркер маяка
        L.marker([lat, lon], {
            icon: L.divIcon({
                html: '🎯',
                iconSize: [30, 30],
                className: 'target-marker'
            })
        }).addTo(this.map).bindPopup(`🎯 Маяк<br>Ш: ${lat.toFixed(6)}<br>Д: ${lon.toFixed(6)}`);

        // Центрируем карту между маяком и пользователем
        if (this.userMarker) {
            const targetMarker = this.map.getLayers().find(layer => layer instanceof L.Marker && layer !== this.userMarker);
            if (targetMarker) {
                const group = new L.featureGroup([this.userMarker, targetMarker]);
                this.map.fitBounds(group.getBounds().pad(0.1));
            }
        } else {
            this.map.setView([lat, lon], 15);
        }
    }

    openMap() {
        if (this.latitude && this.longitude) {
            const mapUrl = `map.html?lat=${this.latitude}&lon=${this.longitude}`;
            
            // Открываем в новом окне с правильным именем
            const newWindow = window.open(mapUrl, 'MapWindow', 'width=800,height=600,scrollbars=yes,resizable=yes');
            
            if (newWindow) {
                this.log('🗺️ Карта открыта в новом окне');
                // Фокус на новое окно
                setTimeout(() => {
                    if (newWindow && !newWindow.closed) {
                        newWindow.focus();
                    }
                }, 100);
            } else {
                // Если popup заблокирован, показываем сообщение
                this.log('❌ Браузер заблокировал открытие окна. Разрешите popup или используйте "Открыть в картах"');
                alert('Браузер заблокировал открытие новой вкладки. Пожалуйста:\n1. Разрешите popup для этого сайта\n2. Или используйте кнопку "Открыть в картах"\n3. Или откройте ссылку вручную: ' + mapUrl);
            }
        } else {
            this.log('❌ Нет координат для отображения на карте');
            alert('Сначала получите координаты маяка');
        }
    }

    openExternalMaps() {
        if (this.latitude && this.longitude) {
            // Пробуем разные варианты открытия во внешних картах
            const urls = [
                // Google Maps
                `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`,
                // Яндекс Карты
                `https://yandex.ru/maps/?text=${this.latitude},${this.longitude}`,
                // OpenStreetMap
                `https://www.openstreetmap.org/?mlat=${this.latitude}&mlon=${this.longitude}#map=15/${this.latitude}/${this.longitude}`,
                // Универсальная geo ссылка
                `geo:${this.latitude},${this.longitude}`
            ];

            // Пробуем открыть в приложении через geo ссылку
            const geoUrl = `geo:${this.latitude},${this.longitude}?q=${this.latitude},${this.longitude}(Маяк)`;
            window.location.href = geoUrl;
            
            // Резервный вариант через 2 секунды
            setTimeout(() => {
                if (!document.hidden) {
                    // Если geo ссылка не сработала, открываем веб-версию
                    const webUrl = urls[0]; // Google Maps по умолчанию
                    window.open(webUrl, '_blank');
                    this.log('🗺️ Открываю во внешних картах: ' + webUrl);
                }
            }, 2000);

            this.log('📍 Отправляю координаты во внешние карты');
        } else {
            this.log('❌ Нет координат для отправки в карты');
            alert('Сначала получите координаты маяка');
        }
    }

    async controlLight(on) {
        if (!this.device || !this.isConnected) return;
        
        try {
            this.log(on ? '💡 Включение света...' : '🔌 Выключение света...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.log(on ? '✅ Свет включен' : '✅ Свет выключен');
        } catch (error) {
            this.log('❌ Ошибка управления светом: ' + error.message);
        }
    }

    copyCoordinates() {
        if (this.latitude && this.longitude) {
            const text = `${this.latitude.toFixed(6)}, ${this.longitude.toFixed(6)}`;
            navigator.clipboard.writeText(text).then(() => {
                this.log('✅ Координаты скопированы');
                
                const btn = document.getElementById('copyBtn');
                const originalText = btn.textContent;
                btn.textContent = '✅ Скопировано!';
                setTimeout(() => btn.textContent = originalText, 2000);
            });
        }
    }

    useTestData() {
        const testLat = 55.241867 + (Math.random() - 0.5) * 0.01;
        const testLon = 72.908588 + (Math.random() - 0.5) * 0.01;
        
        this.updateCoordinates(testLat, testLon);
        this.log('🧪 Используются тестовые данные');
    }

    updateCoordinatesCount() {
        document.getElementById('coordinatesCount').textContent = this.coordinatesCount;
    }

    onDisconnected() {
        this.isConnected = false;
        this.updateConnectionStatus(false);
        this.log('🔴 Отключено от устройства');
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('status');
        status.textContent = connected ? '✅ Подключено' : '❌ Не подключено';
        status.className = `status ${connected ? 'online' : 'offline'}`;
    }

    log(message) {
        const logElement = document.getElementById('dataLog');
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.textContent = `[${timestamp}] ${message}`;
        logElement.prepend(entry);
        
        while (logElement.children.length > 10) {
            logElement.removeChild(logElement.lastChild);
        }
    }

    showSettings() {
        this.loadSettingsUI();
        document.getElementById('settingsModal').style.display = 'block';
    }

    showHistory() {
        this.loadHistoryUI();
        document.getElementById('historyModal').style.display = 'block';
    }

    closeModal(modal) {
        modal.style.display = 'none';
    }

    loadSettingsUI() {
        const settingsContent = document.getElementById('settingsContent');
        if (!settingsContent) return;

        settingsContent.innerHTML = `
            <div class="setting-group">
                <h3>🎨 Внешний вид</h3>
                <div class="setting-item">
                    <div class="setting-label">Тема</div>
                    <select class="setting-control" id="themeSelect">
                        <option value="auto">Авто</option>
                        <option value="light">Светлая</option>
                        <option value="dark">Темная</option>
                    </select>
                </div>
            </div>

            <div class="setting-group">
                <h3>🗺️ Карты по умолчанию</h3>
                <div class="setting-item">
                    <div class="setting-label">Приложение карт</div>
                    <select class="setting-control" id="defaultMapsSelect">
                        <option value="internal">Встроенные карты</option>
                        <option value="external">Внешние карты (Google/Yandex)</option>
                    </select>
                </div>
            </div>

            <div class="setting-group">
                <h3>📍 Слежение за местоположением</h3>
                <div class="setting-item">
                    <div class="setting-label">Показывать мое положение</div>
                    <label class="switch">
                        <input type="checkbox" id="showLocationToggle" checked>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-label">Высокая точность GPS</div>
                    <label class="switch">
                        <input type="checkbox" id="highAccuracyToggle" checked>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <div class="setting-actions">
                <button class="btn primary" onclick="app.saveSettings()">💾 Сохранить</button>
                <button class="btn secondary" onclick="app.resetSettings()">🔄 Сбросить</button>
                <button class="btn secondary" onclick="app.closeModal(document.getElementById('settingsModal'))">❌ Отмена</button>
            </div>
        `;

        this.populateSettings();
    }

    populateSettings() {
        if (!window.appSettings) return;

        const settings = window.appSettings.settings;
        document.getElementById('themeSelect').value = settings.theme || 'auto';
        document.getElementById('defaultMapsSelect').value = settings.defaultMaps || 'internal';
        document.getElementById('showLocationToggle').checked = settings.showLocation !== false;
        document.getElementById('highAccuracyToggle').checked = settings.highAccuracy !== false;
    }

    saveSettings() {
        if (!window.appSettings) return;

        window.appSettings.settings.theme = document.getElementById('themeSelect').value;
        window.appSettings.settings.defaultMaps = document.getElementById('defaultMapsSelect').value;
        window.appSettings.settings.showLocation = document.getElementById('showLocationToggle').checked;
        window.appSettings.settings.highAccuracy = document.getElementById('highAccuracyToggle').checked;

        if (window.appSettings.saveSettings()) {
            this.log('✅ Настройки сохранены');
            this.closeModal(document.getElementById('settingsModal'));
            
            // Применяем настройки местоположения
            if (!window.appSettings.settings.showLocation && this.userMarker) {
                this.map.removeLayer(this.userMarker);
                this.userMarker = null;
            }
        }
    }

    resetSettings() {
        if (window.appSettings) {
            window.appSettings.resetToDefaults();
            this.log('✅ Настройки сброшены');
            this.loadSettingsUI();
        }
    }

    loadHistoryUI() {
        const historyContent = document.getElementById('historyContent');
        if (!historyContent || !window.coordinatesHistory) return;

        const history = window.coordinatesHistory.getRecentEntries(15);
        
        let historyHTML = `
            <div class="history-actions">
                <button class="btn secondary" onclick="app.exportHistory('gpx')">📤 GPX</button>
                <button class="btn secondary" onclick="app.exportHistory('kml')">📤 KML</button>
                <button class="btn secondary" onclick="app.exportHistory('csv')">📤 CSV</button>
                <button class="btn danger" onclick="app.clearHistory()">🗑️ Очистить</button>
            </div>
            <div class="history-list">
        `;

        if (history.length === 0) {
            historyHTML += '<div style="text-align: center; padding: 20px; color: #666;">История пуста</div>';
        } else {
            history.forEach(entry => {
                historyHTML += `
                    <div class="history-item" onclick="app.useHistoryEntry(${entry.latitude}, ${entry.longitude})">
                        <div><strong>${entry.name}</strong></div>
                        <div class="history-coords">Ш: ${entry.latitude.toFixed(6)}</div>
                        <div class="history-coords">Д: ${entry.longitude.toFixed(6)}</div>
                        <div class="history-time">${new Date(entry.timestamp).toLocaleString()}</div>
                    </div>
                `;
            });
        }

        historyHTML += '</div>';
        historyContent.innerHTML = historyHTML;
    }

    useHistoryEntry(lat, lon) {
        this.updateCoordinates(lat, lon);
        this.closeModal(document.getElementById('historyModal'));
        this.log('📁 Координаты загружены из истории');
    }

    exportHistory(format) {
        if (!window.coordinatesHistory) return;

        switch (format) {
            case 'gpx':
                window.coordinatesHistory.exportToGPX();
                break;
            case 'kml':
                window.coordinatesHistory.exportToKML();
                break;
            case 'csv':
                window.coordinatesHistory.exportToCSV();
                break;
        }

        this.log(`✅ История экспортирована в ${format.toUpperCase()}`);
    }

    clearHistory() {
        if (window.coordinatesHistory && confirm('Очистить всю историю координат?')) {
            window.coordinatesHistory.clearHistory();
            this.loadHistoryUI();
            this.log('✅ История очищена');
        }
    }
}

// Глобальная переменная приложения
let app;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    app = new MayakFinder();
});
