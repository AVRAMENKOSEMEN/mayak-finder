class MayakFinder {
    constructor() {
        this.device = null;
        this.server = null;
        this.rxCharacteristic = null;
        this.txCharacteristic = null;
        
        this.latitude = null;
        this.longitude = null;
        this.isConnected = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupOfflineHandling();
        this.initializeTestData();
    }
    
    initializeElements() {
        this.connectBtn = document.getElementById('connectBtn');
        this.statusDiv = document.getElementById('status');
        this.onlineStatus = document.getElementById('onlineStatus');
        this.coordinatesText = document.getElementById('coordinatesText');
        this.copyBtn = document.getElementById('copyBtn');
        this.openNavBtn = document.getElementById('openNavBtn');
        this.lightOnBtn = document.getElementById('lightOnBtn');
        this.lightOffBtn = document.getElementById('lightOffBtn');
        this.testBtn = document.getElementById('testBtn');
        this.staticMap = document.getElementById('staticMap');
        this.dataLog = document.getElementById('dataLog');
    }
    
    setupEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connectToDevice());
        this.copyBtn.addEventListener('click', () => this.copyCoordinates());
        this.openNavBtn.addEventListener('click', () => this.openNavigator());
        this.lightOnBtn.addEventListener('click', () => this.turnLightOn());
        this.lightOffBtn.addEventListener('click', () => this.turnLightOff());
        this.testBtn.addEventListener('click', () => this.simulateMayakData());
    }
    
    setupOfflineHandling() {
        // Проверяем онлайн статус при загрузке
        this.updateOnlineStatus();
        
        // Слушаем изменения онлайн статуса
        window.addEventListener('online', () => {
            this.log('✅ Интернет подключен');
            this.updateOnlineStatus();
        });
        
        window.addEventListener('offline', () => {
            this.log('🔴 Интернет отключен, работаем оффлайн');
            this.updateOnlineStatus();
        });
    }
    
    updateOnlineStatus() {
        const isOnline = navigator.onLine;
        this.onlineStatus.textContent = isOnline ? '🟢 Онлайн режим' : '🔴 Оффлайн режим';
        this.onlineStatus.className = `status ${isOnline ? 'online' : 'offline'};
    }
    
    initializeTestData() {
        this.log('Приложение загружено. Ожидание подключения к маяку.');
        this.setButtonsState(false);
        this.updateStatus('Готов к работе', 'online');
    }
    
    simulateMayakData() {
        const testCoordinates = [
            { lat: 55.241867, lon: 72.908588, name: "Основная позиция" },
            { lat: 55.2420, lon: 72.9090, name: "Смещение +10м" },
            { lat: 55.2415, lon: 72.9080, name: "Смещение -10м" }
        ];
        
        const randomCoord = testCoordinates[Math.floor(Math.random() * testCoordinates.length)];
        
        this.latitude = randomCoord.lat;
        this.longitude = randomCoord.lon;
        
        this.log(`[ТЕСТ] Получены координаты: ${randomCoord.name}`);
        this.processCoordinates(this.latitude, this.longitude, -45, 85);
    }
    
    async connectToDevice() {
        try {
            this.log('Поиск BLE устройств...');
            
            if (!navigator.bluetooth) {
                this.log('Браузер не поддерживает Web Bluetooth API');
                this.updateStatus('Bluetooth не поддерживается', 'offline');
                return;
            }
            
            const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
            
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [UART_SERVICE_UUID] }],
                optionalServices: [UART_SERVICE_UUID]
            });
            
            this.log(`Подключение к ${this.device.name}...`);
            this.updateStatus('Подключение...', 'online');
            
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
            this.log('Успешно подключено! Ожидание данных от маяка...');
            this.updateStatus('Подключено к маяку', 'online');
            this.setButtonsState(true);
            
        } catch (error) {
            this.log('Ошибка подключения: ' + error);
            this.updateStatus('Ошибка подключения', 'offline');
        }
    }
    
    handleDataReceived(event) {
        try {
            const value = event.target.value;
            const decoder = new TextDecoder();
            const data = decoder.decode(value);
            
            this.log(`Данные с маяка: ${data}`);
            
            if (data.startsWith('GPS:')) {
                this.parseAndProcessData(data);
            }
        } catch (error) {
            this.log('Ошибка обработки данных: ' + error);
        }
    }
    
    parseAndProcessData(data) {
        // Формат: "GPS:55.241867,72.908588,RSSI:-45,BAT:85"
        const parts = data.split(',');
        let lat, lon, rssi = -45, bat = 0;
        
        if (parts[0].startsWith('GPS:')) {
            const coords = parts[0].substring(4).split(',');
            if (coords.length >= 2) {
                lat = parseFloat(coords[0]);
                lon = parseFloat(coords[1]);
            }
        }
        
        // Парсим RSSI и BAT
        parts.forEach(part => {
            if (part.startsWith('RSSI:')) rssi = parseInt(part.substring(5));
            if (part.startsWith('BAT:')) bat = parseInt(part.substring(4));
        });
        
        if (lat && lon) {
            this.processCoordinates(lat, lon, rssi, bat);
        }
    }
    
    processCoordinates(lat, lon, rssi, battery) {
        this.latitude = lat;
        this.longitude = lon;
        
        // Обновляем интерфейс
        const coordsText = `Широта: ${lat.toFixed(6)}, Долгота: ${lon.toFixed(6)}`;
        if (rssi) coordsText += `, Сигнал: ${rssi}dBm`;
        if (battery) coordsText += `, Батарея: ${battery}%`;
        
        this.coordinatesText.textContent = coordsText;
        this.updateMap();
        
        this.log(`Координаты обновлены: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
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
                
                <button onclick="window.open('navigator.html?lat=${this.latitude}&lon=${this.longitude}', '_blank')" 
                        class="btn secondary" 
                        style="margin-top: 15px; padding: 8px 15px; font-size: 14px;">
                    🧭 Открыть навигатор
                </button>
            </div>
        `;
    }
    
    openNavigator() {
        if (this.latitude && this.longitude) {
            window.open(`navigator.html?lat=${this.latitude}&lon=${this.longitude}`, '_blank');
            this.log('Открываю оффлайн-навигатор');
        }
    }
    
    async turnLightOn() {
        if (!this.isConnected) {
            this.log('[ТЕСТ] Команда ВКЛЮЧИТЬ свет отправлена');
            alert('[ТЕСТ] Свет включен!');
            return;
        }
        
        if (!this.rxCharacteristic) return;
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode('CMD:LED_ON');
            await this.rxCharacteristic.writeValue(data);
            this.log('Команда включения света отправлена');
        } catch (error) {
            this.log('Ошибка отправки: ' + error);
        }
    }
    
    async turnLightOff() {
        if (!this.isConnected) {
            this.log('[ТЕСТ] Команда ВЫКЛЮЧИТЬ свет отправлена');
            alert('[ТЕСТ] Свет выключен!');
            return;
        }
        
        if (!this.rxCharacteristic) return;
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode('CMD:LED_OFF');
            await this.rxCharacteristic.writeValue(data);
            this.log('Команда выключения света отправлена');
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
                
                const originalText = this.copyBtn.textContent;
                this.copyBtn.textContent = '✅ Скопировано!';
                setTimeout(() => {
                    this.copyBtn.textContent = originalText;
                }, 2000);
            } catch (error) {
                // Fallback
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
    
    onDisconnected() {
        this.log('Устройство отключено');
        this.updateStatus('Отключено', 'offline');
        this.setButtonsState(false);
        this.isConnected = false;
    }
    
    updateStatus(message, type) {
        this.statusDiv.textContent = message;
        this.statusDiv.className = `status ${type}`;
    }
    
    setButtonsState(enabled) {
        this.copyBtn.disabled = !enabled;
        this.openNavBtn.disabled = !enabled;
        this.lightOnBtn.disabled = !enabled;
        this.lightOffBtn.disabled = !enabled;
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
