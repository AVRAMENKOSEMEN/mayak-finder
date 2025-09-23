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
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeTestData();
        this.initializePWA(); // Инициализацию PWA делаем после загрузки DOM
    }
    
    initializePWA() {
        // Регистрируем Service Worker с задержкой
        setTimeout(() => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('Service Worker зарегистрирован');
                        this.log('PWA: Service Worker активирован');
                    })
                    .catch(error => {
                        console.log('Ошибка Service Worker:', error);
                    });
            }
        }, 1000);

        // Обработчик установки PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
            this.log('PWA: Установка доступна');
        });

        // Проверяем, запущено ли приложение как PWA
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.log('PWA: Запущено как приложение');
        }
    }
    
    showInstallPrompt() {
        const installPrompt = document.getElementById('installPrompt');
        const installPwaBtn = document.getElementById('installPwaBtn');
        
        if (installPrompt) installPrompt.style.display = 'block';
        if (installPwaBtn) installPwaBtn.style.display = 'inline-block';
    }
    
    hideInstallPrompt() {
        const installPrompt = document.getElementById('installPrompt');
        if (installPrompt) installPrompt.style.display = 'none';
    }
    
    initializeElements() {
        this.connectBtn = document.getElementById('connectBtn');
        this.statusDiv = document.getElementById('status');
        this.coordinatesText = document.getElementById('coordinatesText');
        this.copyBtn = document.getElementById('copyBtn');
        this.openMapsBtn = document.getElementById('openMapsBtn');
        this.findBtn = document.getElementById('findBtn');
        this.testBtn = document.getElementById('testBtn');
        this.staticMap = document.getElementById('staticMap');
        this.dataLog = document.getElementById('dataLog');
    }
    
    setupEventListeners() {
        if (this.connectBtn) this.connectBtn.addEventListener('click', () => this.connectToDevice());
        if (this.copyBtn) this.copyBtn.addEventListener('click', () => this.copyCoordinates());
        if (this.openMapsBtn) this.openMapsBtn.addEventListener('click', () => this.openInMaps());
        if (this.findBtn) this.findBtn.addEventListener('click', () => this.sendFindCommand());
        if (this.testBtn) this.testBtn.addEventListener('click', () => this.simulateMayakData());
        
        // PWA кнопки установки
        const installBtn = document.getElementById('installBtn');
        const dismissBtn = document.getElementById('dismissBtn');
        const installPwaBtn = document.getElementById('installPwaBtn');
        
        if (installBtn) installBtn.addEventListener('click', () => this.installPWA());
        if (dismissBtn) dismissBtn.addEventListener('click', () => this.hideInstallPrompt());
        if (installPwaBtn) installPwaBtn.addEventListener('click', () => this.installPWA());
    }
    
    async installPWA() {
        if (this.deferredPrompt) {
            try {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    this.log('PWA: Приложение установлено');
                    this.hideInstallPrompt();
                } else {
                    this.log('PWA: Установка отменена');
                }
                this.deferredPrompt = null;
            } catch (error) {
                this.log('PWA: Ошибка установки: ' + error);
            }
        } else {
            this.log('PWA: Установка не доступна');
            // Показываем ручную инструкцию
            alert('Для установки приложения:\n1. В меню браузера (три точки)\n2. Выберите "Добавить на главный экран"\n3. Нажмите "Добавить"');
        }
    }
    
    initializeTestData() {
        this.log('Приложение загружено. Тестовый режим.');
        this.updateCoordinates();
        this.updateMap();
        this.setButtonsState(true);
        this.updateStatus('Тестовый режим', 'connected');
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
        
        this.log(`[ТЕСТ] Координаты: ${randomCoord.name}`);
        this.log(`[ТЕСТ] GPS:${this.latitude},${this.longitude}`);
        
        this.updateCoordinates();
        this.updateMap();
    }
    
    async connectToDevice() {
        try {
            this.log('Поиск BLE устройств...');
            
            if (!navigator.bluetooth) {
                this.log('Браузер не поддерживает Bluetooth');
                this.updateStatus('Bluetooth не поддерживается', 'error');
                return;
            }
            
            const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
            
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [UART_SERVICE_UUID] }],
                optionalServices: [UART_SERVICE_UUID]
            });
            
            this.log(`Подключение к ${this.device.name}...`);
            this.updateStatus('Подключение...', 'connecting');
            
            this.device.addEventListener('gattserverdisconnected', () => {
                this.onDisconnected();
            });
            
            const server = await this.device.gatt.connect();
            this.server = server;
            
            const service = await server.getPrimaryService(UART_SERVICE_UUID);
            const txCharacteristic = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
            this.rxCharacteristic = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');
            
            await txCharacteristic.startNotifications();
            txCharacteristic.addEventListener('characteristicvaluechanged', 
                (event) => this.handleDataReceived(event));
            
            this.isConnected = true;
            this.log('Успешно подключено!');
            this.updateStatus('Подключено к маяку', 'connected');
            this.setButtonsState(true);
            
        } catch (error) {
            this.log('Ошибка подключения: ' + error);
            this.updateStatus('Bluetooth недоступен', 'error');
        }
    }
    
    handleDataReceived(event) {
        try {
            const value = event.target.value;
            const decoder = new TextDecoder();
            const data = decoder.decode(value);
            
            this.log(`Данные с маяка: ${data}`);
            
            if (data.startsWith('GPS:')) {
                const coords = data.replace('GPS:', '').split(',');
                if (coords.length === 2) {
                    this.latitude = parseFloat(coords[0]);
                    this.longitude = parseFloat(coords[1]);
                    this.updateCoordinates();
                }
            }
        } catch (error) {
            this.log('Ошибка обработки данных: ' + error);
        }
    }
    
    updateCoordinates() {
        if (this.coordinatesText) {
            const coordsText = `Широта: ${this.latitude.toFixed(6)}, Долгота: ${this.longitude.toFixed(6)}`;
            this.coordinatesText.textContent = coordsText;
            this.updateMap();
        }
    }
    
    updateMap() {
        if (!this.latitude || !this.longitude || !this.staticMap) return;
        
        this.staticMap.innerHTML = `
            <div class="map-content">
                <div style="font-size: 36px; margin-bottom: 10px;">📍</div>
                <div style="font-weight: bold; margin-bottom: 15px;">Положение маяка</div>
                
                <div class="coordinates-display">
                    <div>Широта: <strong>${this.latitude.toFixed(6)}</strong></div>
                    <div>Долгота: <strong>${this.longitude.toFixed(6)}</strong></div>
                </div>
                
                <button onclick="window.open('https://yandex.ru/maps/?pt=${this.longitude},${this.latitude}&z=17', '_blank')" 
                        class="btn secondary" 
                        style="margin-top: 15px; padding: 8px 15px;">
                    🗺️ Открыть карту
                </button>
            </div>
        `;
    }
    
    async sendFindCommand() {
        if (!this.isConnected) {
            this.log('[ТЕСТ] Команда FIND отправлена');
            alert('[ТЕСТ] Свет и звук включены!');
            return;
        }
        
        if (!this.rxCharacteristic) {
            this.log('Нет подключения');
            return;
        }
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode('FIND');
            await this.rxCharacteristic.writeValue(data);
            this.log('Команда отправлена');
        } catch (error) {
            this.log('Ошибка отправки: ' + error);
        }
    }
    
    async copyCoordinates() {
        if (this.latitude && this.longitude) {
            const coords = `${this.latitude},${this.longitude}`;
            try {
                await navigator.clipboard.writeText(coords);
                this.log('Координаты скопированы');
                
                if (this.copyBtn) {
                    const originalText = this.copyBtn.textContent;
                    this.copyBtn.textContent = '✅ Скопировано!';
                    setTimeout(() => {
                        if (this.copyBtn) this.copyBtn.textContent = originalText;
                    }, 2000);
                }
            } catch (error) {
                // Fallback
                const textArea = document.createElement('textarea');
                textArea.value = coords;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.log('Координаты скопированы');
            }
        }
    }
    
    openInMaps() {
        if (this.latitude && this.longitude) {
            const url = `https://yandex.ru/maps/?pt=${this.longitude},${this.latitude}&z=17`;
            window.open(url, '_blank');
            this.log('Карта открыта');
        }
    }
    
    onDisconnected() {
        this.log('Устройство отключено');
        this.updateStatus('Отключено', 'disconnected');
        this.setButtonsState(false);
        this.isConnected = false;
    }
    
    updateStatus(message, type) {
        if (this.statusDiv) {
            this.statusDiv.textContent = message;
            this.statusDiv.className = `status ${type}`;
        }
    }
    
    setButtonsState(enabled) {
        if (this.copyBtn) this.copyBtn.disabled = !enabled;
        if (this.openMapsBtn) this.openMapsBtn.disabled = !enabled;
        if (this.findBtn) this.findBtn.disabled = !enabled;
    }
    
    log(message) {
        if (!this.dataLog) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${message}`;
        this.dataLog.appendChild(logEntry);
        this.dataLog.scrollTop = this.dataLog.scrollHeight;
    }
}

// Запуск приложения
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new MayakFinder();
    });
} else {
    new MayakFinder();
}
