class MayakFinder {
    constructor() {
        this.device = null;
        this.server = null;
        this.rxCharacteristic = null;
        this.txCharacteristic = null;
        
        // Фиктивные координаты для тестирования
        this.latitude = 55.241867942983404;
        this.longitude = 72.90858878021125;
        
        this.isConnected = false;
        this.deferredPrompt = null;
        
        this.initializePWA();
        this.initializeElements();
        this.setupEventListeners();
        this.initializeTestData();
    }
    
    initializePWA() {
        // Регистрируем Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('Service Worker зарегистрирован:', registration);
                    this.log('PWA: Service Worker активирован');
                })
                .catch(error => {
                    console.log('Ошибка регистрации Service Worker:', error);
                    this.log('PWA: Service Worker не доступен');
                });
        }

        // Обработчик установки PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
            this.log('PWA: Установка доступна');
        });

        // Проверяем, запущено ли приложение как PWA
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.log('PWA: Приложение запущено в standalone режиме');
            document.querySelector('.test-notice').innerHTML += 
                '<div style="margin-top: 5px; color: #155724;">✓ Запущено как приложение</div>';
        }
    }
    
    showInstallPrompt() {
        const installPrompt = document.getElementById('installPrompt');
        const installPwaBtn = document.getElementById('installPwaBtn');
        
        installPrompt.style.display = 'block';
        installPwaBtn.style.display = 'inline-block';
    }
    
    hideInstallPrompt() {
        const installPrompt = document.getElementById('installPrompt');
        installPrompt.style.display = 'none';
    }
    
    initializeElements() {
        this.connectBtn = document.getElementById('connectBtn');
        this.statusDiv = document.getElementById('status');
        this.coordinatesText = document.getElementById('coordinatesText');
        this.copyBtn = document.getElementById('copyBtn');
        this.openMapsBtn = document.getElementById('openMapsBtn');
        this.findBtn = document.getElementById('findBtn');
        this.testBtn = document.getElementById('testBtn');
        this.mapDiv = document.getElementById('map');
        this.staticMap = document.getElementById('staticMap');
        this.dataLog = document.getElementById('dataLog');
    }
    
    setupEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connectToDevice());
        this.copyBtn.addEventListener('click', () => this.copyCoordinates());
        this.openMapsBtn.addEventListener('click', () => this.openInMaps());
        this.findBtn.addEventListener('click', () => this.sendFindCommand());
        this.testBtn.addEventListener('click', () => this.simulateMayakData());
        
        // PWA кнопки установки
        document.getElementById('installBtn').addEventListener('click', () => this.installPWA());
        document.getElementById('dismissBtn').addEventListener('click', () => this.hideInstallPrompt());
        document.getElementById('installPwaBtn').addEventListener('click', () => this.installPWA());
    }
    
    async installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                this.log('PWA: Приложение установлено пользователем');
                this.hideInstallPrompt();
            } else {
                this.log('PWA: Пользователь отменил установку');
            }
            this.deferredPrompt = null;
        } else {
            this.log('PWA: Браузер не поддерживает установку');
            alert('Ваш браузер не поддерживает установку приложений. Попробуйте Chrome или Edge на Android.');
        }
    }
    
    initializeTestData() {
        this.log('Приложение загружено. Используются тестовые координаты.');
        this.updateCoordinates();
        this.updateMap();
        this.setButtonsState(true);
        this.updateStatus('Тестовый режим (фиктивные данные)', 'connected');
    }
    
    simulateMayakData() {
        const testCoordinates = [
            { lat: 55.241867942983404, lon: 72.90858878021125, name: "Основная позиция" },
            { lat: 55.2420, lon: 72.9090, name: "Смещение +10м" },
            { lat: 55.2415, lon: 72.9080, name: "Смещение -10м" },
            { lat: 55.2418, lon: 72.9085, name: "Текущее положение" }
        ];
        
        const randomCoord = testCoordinates[Math.floor(Math.random() * testCoordinates.length)];
        
        this.latitude = randomCoord.lat;
        this.longitude = randomCoord.lon;
        
        this.log(`[ТЕСТ] Получены координаты: ${randomCoord.name}`);
        this.log(`[ТЕСТ] GPS:${this.latitude},${this.longitude}`);
        
        this.updateCoordinates();
        this.updateMap();
    }
    
    async connectToDevice() {
        try {
            this.log('Поиск BLE устройств...');
            
            if (!navigator.bluetooth) {
                this.log('Ваш браузер не поддерживает Web Bluetooth API');
                this.updateStatus('Браузер не поддерживает Bluetooth', 'error');
                return;
            }
            
            const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
            const TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
            const RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
            
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { name: 'My nRF52 Beacon' },
                    { namePrefix: 'nRF52' },
                    { services: [UART_SERVICE_UUID] }
                ],
                optionalServices: [UART_SERVICE_UUID]
            });
            
            this.log(`Подключаюсь к ${this.device.name}...`);
            this.updateStatus('Подключение...', 'connecting');
            
            this.device.addEventListener('gattserverdisconnected', () => {
                this.onDisconnected();
            });
            
            const server = await this.device.gatt.connect();
            this.server = server;
            
            const service = await server.getPrimaryService(UART_SERVICE_UUID);
            
            this.txCharacteristic = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);
            this.rxCharacteristic = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);
            
            await this.txCharacteristic.startNotifications();
            this.txCharacteristic.addEventListener('characteristicvaluechanged', 
                (event) => this.handleDataReceived(event));
            
            this.isConnected = true;
            this.log('Успешно подключено! Ожидание реальных данных...');
            this.updateStatus('Подключено к маяку', 'connected');
            this.setButtonsState(true);
            
        } catch (error) {
            this.log(`Ошибка подключения: ${error}`);
            this.updateStatus('Ошибка подключения', 'error');
            this.log('Остаюсь в тестовом режиме с фиктивными координатами');
            this.updateStatus('Тестовый режим (Bluetooth недоступен)', 'connected');
        }
    }
    
    handleDataReceived(event) {
        const value = event.target.value;
        const decoder = new TextDecoder();
        const data = decoder.decode(value);
        
        this.log(`Получено с маяка: ${data}`);
        
        if (data.startsWith('GPS:')) {
            const coords = data.replace('GPS:', '').split(',');
            if (coords.length === 2) {
                this.latitude = parseFloat(coords[0]);
                this.longitude = parseFloat(coords[1]);
                this.updateCoordinates();
                this.log('Координаты обновлены с маяка');
            }
        }
    }
    
    updateCoordinates() {
        const coordsText = `Широта: ${this.latitude.toFixed(6)}, Долгота: ${this.longitude.toFixed(6)}`;
        this.coordinatesText.textContent = coordsText;
        this.updateMap();
    }
    
    updateMap() {
        if (!this.latitude || !this.longitude) return;
        
        this.staticMap.innerHTML = `
            <div class="map-content">
                <div style="font-size: 36px; margin-bottom: 10px;">📍</div>
                <div style="font-weight: bold; margin-bottom: 15px; color: #333;">Положение маяка</div>
                
                <div class="coordinates-display">
                    <div>Широта: <strong>${this.latitude.toFixed(6)}</strong></div>
                    <div>Долгота: <strong>${this.longitude.toFixed(6)}</strong></div>
                </div>
                
                <button onclick="window.open('https://yandex.ru/maps/?pt=${this.longitude},${this.latitude}&z=17', '_blank')" 
                        class="btn secondary" 
                        style="margin-top: 15px; padding: 8px 15px; font-size: 14px;">
                    🗺️ Открыть интерактивную карту
                </button>
            </div>
        `;
    }
    
    async sendFindCommand() {
        if (!this.isConnected) {
            this.log('[ТЕСТ] Команда FIND отправлена (имитация)');
            this.log('[ТЕСТ] Свет и звук на маяке должны включиться');
            alert('[ТЕСТ] Команда FIND отправлена! Свет и звук включены (имитация)');
            return;
        }
        
        if (!this.rxCharacteristic) {
            this.log('Не подключено к устройству');
            return;
        }
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode('FIND');
            await this.rxCharacteristic.writeValue(data);
            this.log('Команда FIND отправлена на маяк');
        } catch (error) {
            this.log(`Ошибка отправки команды: ${error}`);
        }
    }
    
    async copyCoordinates() {
        if (this.latitude && this.longitude) {
            const coords = `${this.latitude},${this.longitude}`;
            try {
                await navigator.clipboard.writeText(coords);
                this.log('Координаты скопированы в буфер обмена');
                
                const originalText = this.copyBtn.textContent;
                this.copyBtn.textContent = '✅ Скопировано!';
                setTimeout(() => {
                    this.copyBtn.textContent = originalText;
                }, 2000);
            } catch (error) {
                const textArea = document.createElement('textarea');
                textArea.value = coords;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.log('Координаты скопированы (старый метод)');
            }
        }
    }
    
    openInMaps() {
        if (this.latitude && this.longitude) {
            const choice = confirm('Открыть в Google Картах (OK) или Яндекс Картах (Отмена)?');
            
            if (choice) {
                const googleUrl = `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`;
                window.open(googleUrl, '_blank');
                this.log('Открываю в Google Картах');
            } else {
                const yandexUrl = `https://yandex.ru/maps/?pt=${this.longitude},${this.longitude}&z=17`;
                window.open(yandexUrl, '_blank');
                this.log('Открываю в Яндекс Картах');
            }
        }
    }
    
    onDisconnected() {
        this.log('Устройство отключено');
        this.updateStatus('Отключено', 'disconnected');
        this.setButtonsState(false);
        this.isConnected = false;
        this.device = null;
        this.server = null;
    }
    
    updateStatus(message, type) {
        this.statusDiv.textContent = message;
        this.statusDiv.className = `status ${type}`;
    }
    
    setButtonsState(enabled) {
        this.copyBtn.disabled = !enabled;
        this.openMapsBtn.disabled = !enabled;
        this.findBtn.disabled = !enabled;
    }
    
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${message}`;
        this.dataLog.appendChild(logEntry);
        this.dataLog.scrollTop = this.dataLog.scrollHeight;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new MayakFinder();
});
