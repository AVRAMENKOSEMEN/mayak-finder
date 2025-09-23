class MayakFinder {
    constructor() {
        this.device = null;
        this.server = null;
        this.rxCharacteristic = null;
        this.txCharacteristic = null;
        
        this.latitude = null;
        this.longitude = null;
        this.map = null;
        this.marker = null;
        
        this.initializeElements();
        this.setupEventListeners();
    }
    
    initializeElements() {
        this.connectBtn = document.getElementById('connectBtn');
        this.statusDiv = document.getElementById('status');
        this.coordinatesText = document.getElementById('coordinatesText');
        this.copyBtn = document.getElementById('copyBtn');
        this.openMapsBtn = document.getElementById('openMapsBtn');
        this.findBtn = document.getElementById('findBtn');
        this.mapDiv = document.getElementById('map');
        this.dataLog = document.getElementById('dataLog');
    }
    
    setupEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connectToDevice());
        this.copyBtn.addEventListener('click', () => this.copyCoordinates());
        this.openMapsBtn.addEventListener('click', () => this.openInMaps());
        this.findBtn.addEventListener('click', () => this.sendFindCommand());
    }
    
    async connectToDevice() {
        try {
            this.log('Поиск BLE устройств...');
            
            // UUID для Nordic UART Service (NUS)
            const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
            const TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
            const RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
            
            // Запрашиваем устройство с UART сервисом
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { name: 'My nRF52 Beacon' }, // Имя вашего устройства
                    { namePrefix: 'nRF52' },     // Или по префиксу
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
            
            // Получаем UART сервис
            const service = await server.getPrimaryService(UART_SERVICE_UUID);
            
            // Получаем характеристики для приема (TX) и отправки (RX) данных
            this.txCharacteristic = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);
            this.rxCharacteristic = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);
            
            // Подписываемся на получение данных
            await this.txCharacteristic.startNotifications();
            this.txCharacteristic.addEventListener('characteristicvaluechanged', 
                (event) => this.handleDataReceived(event));
            
            this.log('Успешно подключено! Ожидание данных...');
            this.updateStatus('Подключено', 'connected');
            this.setButtonsState(true);
            
        } catch (error) {
            this.log(`Ошибка подключения: ${error}`);
            this.updateStatus('Ошибка подключения', 'error');
        }
    }
    
    handleDataReceived(event) {
        const value = event.target.value;
        const decoder = new TextDecoder();
        const data = decoder.decode(value);
        
        this.log(`Получено: ${data}`);
        
        // Парсим координаты из формата "GPS:55.75,37.61"
        if (data.startsWith('GPS:')) {
            const coords = data.replace('GPS:', '').split(',');
            if (coords.length === 2) {
                this.latitude = parseFloat(coords[0]);
                this.longitude = parseFloat(coords[1]);
                this.updateCoordinates();
            }
        }
    }
    
    updateCoordinates() {
        if (this.latitude && this.longitude) {
            const coordsText = `Широта: ${this.latitude}, Долгота: ${this.longitude}`;
            this.coordinatesText.textContent = coordsText;
            this.updateMap();
        }
    }
    
    updateMap() {
        if (!this.latitude || !this.longitude) return;
        
        // Простая мини-карта с OpenStreetMap
        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${this.longitude-0.01},${this.latitude-0.01},${this.longitude+0.01},${this.latitude+0.01}&marker=${this.latitude},${this.longitude}`;
        
        this.mapDiv.innerHTML = `
            <iframe 
                width="100%" 
                height="100%" 
                frameborder="0" 
                scrolling="no" 
                marginheight="0" 
                marginwidth="0" 
                src="${mapUrl}"
                style="border-radius: 5px;">
            </iframe>
        `;
    }
    
    async sendFindCommand() {
        if (!this.rxCharacteristic) {
            this.log('Не подключено к устройству');
            return;
        }
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode('FIND');
            await this.rxCharacteristic.writeValue(data);
            this.log('Команда FIND отправлена');
        } catch (error) {
            this.log(`Ошибка отправки команды: ${error}`);
        }
    }
    
    async copyCoordinates() {
        if (this.latitude && this.longitude) {
            const coords = `${this.latitude},${this.longitude}`;
            await navigator.clipboard.writeText(coords);
            this.log('Координаты скопированы в буфер');
            alert('Координаты скопированы!');
        }
    }
    
    openInMaps() {
        if (this.latitude && this.longitude) {
            // Открываем в Google Картах
            const googleUrl = `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`;
            // Или в Яндекс Картах
            const yandexUrl = `https://yandex.ru/maps/?pt=${this.longitude},${this.latitude}&z=15`;
            
            window.open(googleUrl, '_blank');
        }
    }
    
    onDisconnected() {
        this.log('Устройство отключено');
        this.updateStatus('Отключено', 'disconnected');
        this.setButtonsState(false);
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

// Инициализация приложения когда страница загрузится
document.addEventListener('DOMContentLoaded', () => {
    new MayakFinder();
});