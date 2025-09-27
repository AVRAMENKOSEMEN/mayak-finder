openMaps() {
    if (this.latitude && this.longitude) {
        // Пробуем разные способы открытия карт
        this.openSmartMap(this.latitude, this.longitude);
    }
}

openSmartMap(lat, lon) {
    // 1. Пробуем Google Maps через простую ссылку (без ключа)
    const googleUrl = `https://www.google.com/maps/@${lat},${lon},17z`;
    
    // 2. Пробуем Яндекс Карты (часто работают без ключа)
    const yandexUrl = `https://yandex.ru/maps/?pt=${lon},${lat}&z=17`;
    
    // 3. OpenStreetMap (точно работает без ключа)
    const osmUrl = `https://www.openstreetmap.org/#map=17/${lat}/${lon}`;
    
    // 4. Наш оффлайн навигатор (гарантированно работает)
    const offlineUrl = `navigator.html?lat=${lat}&lon=${lon}`;
    
    // Создаем тестовое изображение для проверки доступности
    this.testMapAvailability([googleUrl, yandexUrl, osmUrl, offlineUrl]);
}

async testMapAvailability(urls) {
    // Проверяем онлайн статус
    if (!navigator.onLine) {
        this.log('🔴 Нет интернета, открываю оффлайн навигатор');
        window.open(urls[3], '_blank');
        return;
    }
    
    this.log('🟢 Есть интернет, проверяем доступность карт...');
    
    // Быстрая проверка что хоть одна карта доступна
    try {
        // Пробуем открыть Google Maps (самый популярный)
        const googleWindow = window.open(urls[0], 'map');
        
        // Проверяем через 2 секунды не закрылось ли окно
        setTimeout(() => {
            if (googleWindow && !googleWindow.closed) {
                this.log('✅ Google Maps открылся успешно');
            } else {
                // Если Google не сработал, пробуем Яндекс
                this.log('❌ Google Maps не доступен, пробуем Яндекс');
                const yandexWindow = window.open(urls[1], 'map');
                
                setTimeout(() => {
                    if (yandexWindow && !yandexWindow.closed) {
                        this.log('✅ Яндекс Карты открылись успешно');
                    } else {
                        // Если и Яндекс не сработал, OpenStreetMap
                        this.log('❌ Яндекс Карты не доступны, пробуем OpenStreetMap');
                        window.open(urls[2], 'map');
                    }
                }, 1000);
            }
        }, 2000);
        
    } catch (error) {
        this.log('❌ Все онлайн карты недоступны, открываю оффлайн навигатор');
        window.open(urls[3], '_blank');
    }
}
