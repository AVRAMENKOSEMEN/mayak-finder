class MayakFinder {
    constructor() {
        this.device = null;
        this.server = null;
        this.rxCharacteristic = null;
        this.txCharacteristic = null;
        
        // Фиктивные координаты для тестирования
        this.latitude = 55.241867942983404;
        this.longitude = 72.90858878021125;
        
        this.map = null;
        this.marker = null;
        this.isConnected = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeTestData(); // Инициализация тестовых данных
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
        
        // Добавляем кнопку для тестовых данных
        const testBtn = document.createElement('button');
        testBtn.textContent = '🧪 Тест: Имитация данных с маяка';
        testBtn.className = 'btn secondary';
        testBtn.addEventListener('click', () => this.simulateMayakData());
        document.querySelector('.actions').appendChild(testBtn);
    }
    
    // Инициализация тестовых данных при загрузке
    initializeTestData() {
        this.log('Приложение загружено. Используются тестовые координаты.');
        this.updateCoordinates();
        this.updateMap();
        this.setButtonsState(true); // Разблокируем кнопки для тестирования
        
        // Показываем тестовый статус
        this.updateStatus('Тестовый режим (фиктивные данные)', 'connected');
    }
    
    // Имитация получения данных с маяка
    simulateMayakData() {
        const testCoordinates = [
            { lat: 55.241867942983404, lon: 72.90858878021125, name: "Основная позиция" },
            { lat: 55.2420, lon: 72.9090, name: "Смещение +10м" },
            { lat: 55.2415, lon: 72.9080, name: "Смещение -10м" },
            { lat: 55.2419, lon: 72.9089, name: "Текущее положение" }
        ];
        
        const randomCoord = testCoordinates[Math.floor(Math.random() * testCoordinates.length)];
        
        this.latitude = randomCoord.lat;
        this.longitude = randomCoord.lon;
        
        // Имитируем получение данных по Bluetooth
        this.log(`[ИМИТАЦИЯ] Получены координаты: ${randomCoord.name}`);
        this.log(`[ИМИТАЦИЯ] GPS:${this.latitude},${this.longitude}`);
        
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
            
            // UUID для Nordic UART Service (NUS)
            const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
            const TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
            const RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
            
            // Запрашиваем устройство с UART сервисом
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { name: 'My nRF52 Beacon' },
                    { namePrefix: 'nRF52' },
                    { services: [UART_SERVICE_UUID] } // Фильтр по сервису
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
            
            this.isConnected = true;
            this.log('Успешно подключено! Ожидание реальных данных...');
            this.updateStatus('Подключено к маяку', 'connected');
            this.setButtonsState(true);
            
        } catch (error) {
            this.log(`Ошибка подключения: ${error}`);
            this.updateStatus('Ошибка подключения', 'error');
            
            // Если подключение не удалось, остаемся в тестовом режиме
            this.log('Остаюсь в тестовом режиме с фиктивными координатами');
            this.updateStatus('Тестовый режим (Bluetooth недоступен)', 'connected');
        }
    }
    
    handleDataReceived(event) {
        const value = event.target.value;
        const decoder = new TextDecoder();
        const data = decoder.decode(value);
        
        this.log(`Получено с маяка: ${data}`);
        
        // Парсим координаты из формата "GPS:55.75,37.61"
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
        
        // Простая мини-карта с OpenStreetMap
        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${this.longitude-0.001},${this.latitude-0.001},${this.longitude+0.001},${this.latitude+0.001}&marker=${this.latitude},${this.longitude}&layer=mapnik`;
        
        this.mapDiv.innerHTML = `
            <iframe 
                width="100%" 
                height="100%" 
                frameborder="0" 
                scrolling="no" 
                marginheight="0" 
                marginwidth="0" 
                src="${mapUrl}"
                style="border-radius: 5px;"
                title="Карта с координатами маяка">
            </iframe>
            <div style="text-align: center; margin-top: 5px; font-size: 12px; color: #666;">
                Координаты: ${this.latitude.toFixed(6)}, ${this.longitude.toFixed(6)}
            </div>
        `;
    }
    
    async sendFindCommand() {
        if (!this.isConnected) {
            this.log('[ТЕСТ] Команда FIND отправлена (имитация)');
            this.log('[ТЕСТ] Свет и звук на маяке должны включиться');
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
                
                // Временное уведомление
                const originalText = this.copyBtn.textContent;
                this.copyBtn.textContent = '✅ Скопировано!';
                setTimeout(() => {
                    this.copyBtn.textContent = originalText;
                }, 2000);
            } catch (error) {
                // Fallback для старых браузеров
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
            // Предлагаем выбор карт
            const choice = confirm('Открыть в Google Картах (OK) или Яндекс Картах (Отмена)?');
            
            if (choice) {
                // Google Карты
                const googleUrl = `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`;
                window.open(googleUrl, '_blank');
                this.log('Открываю в Google Картах');
            } else {
                // Яндекс Карты
                const yandexUrl = `https://yandex.ru/maps/?pt=${this.longitude},${this.latitude}&z=17`;
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

// Инициализация приложения когда страница загрузится
document.addEventListener('DOMContentLoaded', () => {
    new MayakFinder();
});
