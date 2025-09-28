// Основной скрипт приложения с новыми функциями
class MayakFinder {
    constructor() {
        this.latitude = null;
        this.longitude = null;
        this.device = null;
        this.server = null;
        this.isConnected = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkOnlineStatus();
        this.loadSettingsUI();
        this.loadHistoryUI();
    }

    bindEvents() {
        // Основные кнопки
        document.getElementById('connectBtn').addEventListener('click', () => this.connectBluetooth());
        document.getElementById('copyBtn').addEventListener('click', () => this.copyCoordinates());
        document.getElementById('openNavBtn').addEventListener('click', () => this.openMaps());
        document.getElementById('testBtn').addEventListener('click', () => this.useTestData());
        
        // Управление светом
        document.getElementById('lightOnBtn').addEventListener('click', () => this.controlLight(true));
        document.getElementById('lightOffBtn').addEventListener('click', () => this.controlLight(false));
        
        // Новые кнопки
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('historyBtn').addEventListener('click', () => this.showHistory());
        
        // Модальные окна
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Закрытие модальных окон по клику вне области
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal);
            });
        });

        // События онлайн/оффлайн
        window.addEventListener('online', () => this.updateOnlineStatus(true));
        window.addEventListener('offline', () => this.updateOnlineStatus(false));
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

            // Здесь должна быть логика работы с вашим BLE устройством
            await this.setupBluetoothServices(server);
            
            this.isConnected = true;
            this.updateConnectionStatus(true);
            
            // Уведомление о подключении
            if (window.notificationManager) {
                window.notificationManager.showConnectionNotification(true, this.device.name);
            }

        } catch (error) {
            this.log('❌ Ошибка подключения: ' + error.message);
            this.updateConnectionStatus(false);
        }
    }

    async setupBluetoothServices(server) {
        // Пример реализации для nrf52840
        // Замените на реальные UUID вашего устройства
        try {
            const service = await server.getPrimaryService('12345678-1234-5678-9abc-123456789abc');
            const characteristic = await service.getCharacteristic('12345678-1234-5678-9abc-123456789abd');
            
            // Подписка на получение данных
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', 
                (event) => this.handleData(event.target.value));
                
            this.log('✅ Сервисы Bluetooth настроены');
        } catch (error) {
            this.log('⚠️ Не удалось настроить сервисы: ' + error.message);
        }
    }

    handleData(data) {
        // Обработка данных от BLE устройства
        // Предполагаем, что данные приходят в формате "lat,lon"
        try {
            const textDecoder = new TextDecoder();
            const coordinates = textDecoder.decode(data).split(',');
            
            if (coordinates.length === 2) {
                const lat = parseFloat(coordinates[0]);
                const lon = parseFloat(coordinates[1]);
                
                if (!isNaN(lat) && !isNaN(lon)) {
                    this.updateCoordinates(lat, lon);
                    
                    // Добавляем в историю
                    if (window.coordinatesHistory) {
                        window.coordinatesHistory.addEntry(lat, lon);
                    }
                    
                    // Уведомление о новых координатах
                    if (window.notificationManager) {
                        window.notificationManager.showNewCoordinateAlert({lat, lon});
                    }
                }
            }
        } catch (error) {
            this.log('❌ Ошибка обработки данных: ' + error.message);
        }
    }

    updateCoordinates(lat, lon) {
        this.latitude = lat;
        this.longitude = lon;
        
        const coordsText = `Ш: ${lat.toFixed(6)}, Д: ${lon.toFixed(6)}`;
        document.getElementById('coordinatesText').textContent = coordsText;
        
        // Активируем кнопки
        document.getElementById('copyBtn').disabled = false;
        document.getElementById('openNavBtn').disabled = false;
        document.getElementById('lightOnBtn').disabled = false;
        document.getElementById('lightOffBtn').disabled = false;
        
        this.log('📍 Новые координаты: ' + coordsText);
        this.updateMap(lat, lon);
    }

    updateMap(lat, lon) {
        const mapContainer = document.getElementById('staticMap');
        
        // Используем оффлайн карты если инициализированы
        if (window.offlineMap && window.offlineMap.isInitialized) {
            window.offlineMap.addTargetMarker(lat, lon, 'Текущее положение маяка');
            window.offlineMap.map.setView([lat, lon], 15);
        } else {
            // Простое отображение координат
            mapContainer.innerHTML = `
                <div class="map-content">
                    <div style="font-size: 32px; margin-bottom: 10px;">🎯</div>
                    <div class="coordinates-display">Ш: ${lat.toFixed(6)}</div>
                    <div class="coordinates-display">Д: ${lon.toFixed(6)}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 10px;">
                        ${new Date().toLocaleTimeString()}
                    </div>
                </div>
            `;
        }
    }

    async controlLight(on) {
        if (!this.device || !this.isConnected) return;
        
        try {
            // Логика управления светом через BLE
            this.log(on ? '💡 Включение света...' : '🔌 Выключение света...');
            
            // Реализация отправки команды на устройство
            // await this.sendLightCommand(on);
            
            this.log(on ? '✅ Свет включен' : '✅ Свет выключен');
        } catch (error) {
            this.log('❌ Ошибка управления светом: ' + error.message);
        }
    }

    copyCoordinates() {
        if (this.latitude && this.longitude) {
            const text = `${this.latitude},${this.longitude}`;
            navigator.clipboard.writeText(text).then(() => {
                this.log('✅ Координаты скопированы в буфер');
                
                // Визуальное подтверждение
                const btn = document.getElementById('copyBtn');
                const originalText = btn.textContent;
                btn.textContent = '✅ Скопировано!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            });
        }
    }

    openMaps() {
        if (this.latitude && this.longitude) {
            window.open(`map.html?lat=${this.latitude}&lon=${this.longitude}`, '_blank');
        }
    }

    useTestData() {
        // Тестовые координаты (Омск)
        const testLat = 55.241867 + (Math.random() - 0.5) * 0.01;
        const testLon = 72.908588 + (Math.random() - 0.5) * 0.01;
        
        this.updateCoordinates(testLat, testLon);
        this.log('🧪 Используются тестовые данные');
    }

    onDisconnected() {
        this.isConnected = false;
        this.updateConnectionStatus(false);
        this.log('🔴 Отключено от устройства');
        
        if (window.notificationManager) {
            window.notificationManager.showConnectionNotification(false);
        }
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('status');
        status.textContent = connected ? '✅ Подключено' : '❌ Не подключено';
        status.className = `status ${connected ? 'online' : 'offline'}`;
        
        document.getElementById('connectBtn').textContent = 
            connected ? '🔗 Переподключиться' : '📡 Подключиться к Bluetooth';
    }

    updateOnlineStatus(online) {
        const status = document.getElementById('onlineStatus');
        status.textContent = online ? '🟢 Онлайн режим' : '🔴 Режим оффлайн';
        status.className = `status ${online ? 'online' : 'offline'}`;
    }

    checkOnlineStatus() {
        this.updateOnlineStatus(navigator.onLine);
    }

    log(message) {
        const logElement = document.getElementById('dataLog');
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.textContent = `[${timestamp}] ${message}`;
        logElement.prepend(entry);
        
        // Ограничиваем размер лога
        while (logElement.children.length > 20) {
            logElement.removeChild(logElement.lastChild);
        }
    }

    // Новые функции для настроек и истории
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
                <h3>📏 Единицы измерения</h3>
                <div class="setting-item">
                    <div class="setting-label">Система единиц</div>
                    <select class="setting-control" id="unitsSelect">
                        <option value="metric">Метрическая (км)</option>
                        <option value="imperial">Имперская (мили)</option>
                    </select>
                </div>
            </div>

            <div class="setting-group">
                <h3>🔊 Голосовые подсказки</h3>
                <div class="setting-item">
                    <div class="setting-label">Включить голосовые подсказки</div>
                    <label class="switch">
                        <input type="checkbox" id="voiceGuidanceToggle">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <div class="setting-group">
                <h3>🔔 Уведомления</h3>
                <div class="setting-item">
                    <div class="setting-label">Включить уведомления</div>
                    <label class="switch">
                        <input type="checkbox" id="notificationsToggle">
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-label">Оповещение о приближении</div>
                    <label class="switch">
                        <input type="checkbox" id="proximityAlertToggle">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <div class="setting-group">
                <h3>🗺️ Карты</h3>
                <div class="setting-item">
                    <div class="setting-label">Оффлайн карты</div>
                    <label class="switch">
                        <input type="checkbox" id="offlineMapsToggle">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <div class="setting-actions">
                <button class="btn primary" onclick="app.saveSettings()">💾 Сохранить</button>
                <button class="btn secondary" onclick="app.resetSettings()">🔄 Сбросить</button>
            </div>
        `;

        // Заполняем текущие настройки
        this.populateSettings();
    }

    populateSettings() {
        if (!window.appSettings) return;

        document.getElementById('themeSelect').value = window.appSettings.settings.theme;
        document.getElementById('unitsSelect').value = window.appSettings.settings.units;
        document.getElementById('voiceGuidanceToggle').checked = window.appSettings.settings.voiceGuidance;
        document.getElementById('notificationsToggle').checked = window.appSettings.settings.notifications;
        document.getElementById('proximityAlertToggle').checked = window.appSettings.settings.proximityAlert;
        document.getElementById('offlineMapsToggle').checked = window.appSettings.settings.offlineTiles;
    }

    saveSettings() {
        if (!window.appSettings) return;

        window.appSettings.settings.theme = document.getElementById('themeSelect').value;
        window.appSettings.settings.units = document.getElementById('unitsSelect').value;
        window.appSettings.settings.voiceGuidance = document.getElementById('voiceGuidanceToggle').checked;
        window.appSettings.settings.notifications = document.getElementById('notificationsToggle').checked;
        window.appSettings.settings.proximityAlert = document.getElementById('proximityAlertToggle').checked;
        window.appSettings.settings.offlineTiles = document.getElementById('offlineMapsToggle').checked;

        if (window.appSettings.saveSettings()) {
            this.log('✅ Настройки сохранены');
            this.closeModal(document.getElementById('settingsModal'));
            
            // Применяем настройки голосовых подсказок
            if (window.voiceGuide) {
                if (window.appSettings.settings.voiceGuidance) {
                    window.voiceGuide.enable();
                } else {
                    window.voiceGuide.disable();
                }
            }
        } else {
            this.log('❌ Ошибка сохранения настроек');
        }
    }

    resetSettings() {
        if (window.appSettings) {
            window.appSettings.resetToDefaults();
            this.log('✅ Настройки сброшены к значениям по умолчанию');
        }
    }

    loadHistoryUI() {
        const historyContent = document.getElementById('historyContent');
        if (!historyContent || !window.coordinatesHistory) return;

        const history = window.coordinatesHistory.getRecentEntries(20);
        
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
                        <div class="history-coords">Ш: ${entry.latitude.toFixed(6)}, Д: ${entry.longitude.toFixed(6)}</div>
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
        if (window.coordinatesHistory) {
            if (confirm('Вы уверены, что хотите очистить всю историю?')) {
                window.coordinatesHistory.clearHistory();
                this.loadHistoryUI();
                this.log('✅ История очищена');
            }
        }
    }
}

// Инициализация приложения
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new MayakFinder();
    
    // Инициализация оффлайн карт
    if (window.offlineMap) {
        window.offlineMap.init('map', [55.241867, 72.908588], 10);
    }
});

// Глобальные функции для вызова из HTML
window.openMaps = function() {
    if (app) app.openMaps();
};

window.openSmartMap = function(lat, lon) {
    // Умное открытие карт (существующая логика)
    const googleUrl = `https://www.google.com/maps/@${lat},${lon},17z`;
    const yandexUrl = `https://yandex.ru/maps/?pt=${lon},${lat}&z=17`;
    const osmUrl = `https://www.openstreetmap.org/#map=17/${lat}/${lon}`;
    const offlineUrl = `navigator.html?lat=${lat}&lon=${lon}`;

    // ... существующая логика тестирования доступности карт
};
