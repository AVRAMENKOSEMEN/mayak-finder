class MayakFinder {
    constructor() {
        this.device = null;
        this.server = null;
        this.rxCharacteristic = null;
        this.txCharacteristic = null;
        
        this.latitude = 55.241867942983404;
        this.longitude = 72.90858878021125;
        
        this.isConnected = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeTestData();
    }
    
    initializeElements() {
        this.connectBtn = document.getElementById('connectBtn');
        this.statusDiv = document.getElementById('status');
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
        
        this.log(`[ТЕСТ] Новые координаты: ${randomCoord.name}`);
        this.log(`[ТЕСТ] GPS:${this.latitude},${this.longitude}`);
        
        this.updateCoordinates();
        this.updateMap();
    }
    
    async connectToDevice() {
        try {
            this.log('Поиск BLE устройств...');
            
            if (!navigator.bluetooth) {
                this.log('Браузер не поддерживает Web Bluetooth API');
                this.updateStatus('Bluetooth не поддерживается', 'error');
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
                
                <button onclick="window.open('navigator.html?lat=${this.latitude}&lon=${this.longitude}', '_blank')" 
                        class="btn secondary" 
                        style="margin-top: 15px; padding: 8px 15px; font-size: 14px;">
                    🧭 Открыть навигатор
                </button>
            </div>
        `;
    }
    
    async turnLightOn() {
        if (!this.isConnected) {
            this.log('[ТЕСТ] Команда ВКЛЮЧИТЬ свет отправлена');
            this.log('[ТЕСТ] Свет и звук на маяке должны включиться');
            alert('[ТЕСТ] Команда "Включить свет" отправлена! Свет и звук включены (имитация)');
            return;
        }
        
        if (!this.rxCharacteristic) {
            this.log('Не подключено к устройству');
            return;
        }
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode('CMD:LED_ON');
            await this.rxCharacteristic.writeValue(data);
            this.log('Команда включения света отправлена на маяк');
        } catch (error) {
            this.log(`Ошибка отправки команды: ${error}`);
        }
    }
    
    async turnLightOff() {
        if (!this.isConnected) {
            this.log('[ТЕСТ] Команда ВЫКЛЮЧИТЬ свет отправлена');
            this.log('[ТЕСТ] Свет и звук на маяке должны выключиться');
            alert('[ТЕСТ] Команда "Выключить свет" отправлена! Свет и звук выключены (имитация)');
            return;
        }
        
        if (!this.rxCharacteristic) {
            this.log('Не подключено к устройству');
            return;
        }
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode('CMD:LED_OFF');
            await this.rxCharacteristic.writeValue(data);
            this.log('Команда выключения света отправлена на маяк');
        } catch (error) {
            this.log(`Ошибка отправки команды: ${error}`);
        }
    }
    
    openNavigator() {
        if (this.latitude && this.longitude) {
            window.open(`navigator.html?lat=${this.latitude}&lon=${this.longitude}`, '_blank');
            this.log('Открываю навигатор');
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
