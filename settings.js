// settings.js - Система настроек приложения
class SettingsManager {
    constructor() {
        this.defaultSettings = {
            // Единицы измерения
            units: 'metric', // 'metric' или 'imperial'
            
            // Тема
            theme: 'auto', // 'light', 'dark', 'auto'
            
            // Голосовые подсказки
            voiceGuidance: false,
            voiceVolume: 0.8,
            
            // Уведомления
            notifications: true,
            proximityAlert: true,
            proximityDistance: 0.1, // км
            
            // Карты
            defaultMap: 'auto',
            offlineTiles: true,
            
            // Навигация
            compassCalibration: true,
            highAccuracy: true
        };
        
        this.settings = this.loadSettings();
        this.applySettings();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('appSettings');
            const loaded = saved ? JSON.parse(saved) : {};
            return { ...this.defaultSettings, ...loaded };
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
            return { ...this.defaultSettings };
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('appSettings', JSON.stringify(this.settings));
            this.applySettings();
            return true;
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            return false;
        }
    }

    applySettings() {
        this.applyTheme();
        this.applyUnits();
        this.applyNotifications();
    }

    applyTheme() {
        const theme = this.settings.theme;
        let actualTheme = theme;
        
        if (theme === 'auto') {
            actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', actualTheme);
        
        // Обновляем мета-тег theme-color
        const themeColor = actualTheme === 'dark' ? '#2d3748' : '#667eea';
        document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);
    }

    applyUnits() {
        // Единицы будут применяться в навигаторе
        if (typeof updateUnitsDisplay === 'function') {
            updateUnitsDisplay();
        }
    }

    applyNotifications() {
        if (this.settings.notifications && 'Notification' in window) {
            this.requestNotificationPermission();
        }
    }

    async requestNotificationPermission() {
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }

    showNotification(title, options = {}) {
        if (!this.settings.notifications || Notification.permission !== 'granted') {
            return;
        }

        const notification = new Notification(title, {
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        setTimeout(() => notification.close(), 5000);
    }

    // Геттеры для удобства
    get isMetric() {
        return this.settings.units === 'metric';
    }

    get isDarkTheme() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    // Конвертация единиц
    convertDistance(km) {
        if (this.isMetric) {
            return { value: km, unit: 'km', text: `${km.toFixed(1)} км` };
        } else {
            const miles = km * 0.621371;
            return { value: miles, unit: 'mi', text: `${miles.toFixed(1)} миль` };
        }
    }

    convertSpeed(kmh) {
        if (this.isMetric) {
            return { value: kmh, unit: 'km/h', text: `${kmh.toFixed(0)} км/ч` };
        } else {
            const mph = kmh * 0.621371;
            return { value: mph, unit: 'mph', text: `${mph.toFixed(0)} миль/ч` };
        }
    }

    resetToDefaults() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
        location.reload();
    }
}

// Глобальный экземпляр
window.appSettings = new SettingsManager();

// Слушаем изменения системной темы
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (window.appSettings.settings.theme === 'auto') {
        window.appSettings.applyTheme();
    }
});
