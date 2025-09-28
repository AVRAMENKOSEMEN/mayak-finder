// notifications.js - Система уведомлений
class NotificationManager {
    constructor() {
        this.lastProximityNotification = 0;
        this.proximityCooldown = 30000; // 30 секунд
        this.init();
    }

    async init() {
        await this.requestPermission();
        this.setupProximityAlerts();
    }

    async requestPermission() {
        if (!('Notification' in window)) return false;
        
        if (Notification.permission === 'default') {
            return await Notification.requestPermission() === 'granted';
        }
        
        return Notification.permission === 'granted';
    }

    setupProximityAlerts() {
        // Эта функция будет вызываться из навигатора при обновлении позиции
        window.monitorProximity = (distance, coordinates) => {
            if (!window.appSettings.settings.proximityAlert) return;
            
            const alertDistance = window.appSettings.settings.proximityDistance;
            const now = Date.now();
            
            if (distance <= alertDistance && 
                now - this.lastProximityNotification > this.proximityCooldown) {
                
                this.showProximityAlert(distance, coordinates);
                this.lastProximityNotification = now;
            }
        };
    }

    showProximityAlert(distance, coordinates) {
        const distanceText = window.appSettings.convertDistance(distance).text;
        const title = '🎯 Приближаетесь к маяку!';
        const body = `Расстояние: ${distanceText}`;

        // Голосовое уведомление
        if (window.voiceGuide && window.appSettings.settings.voiceGuidance) {
            window.voiceGuide.speak(`Внимание! Маяк близко, ${distanceText}`, 'high');
        }

        // Browser notification
        if (window.appSettings.settings.notifications) {
            window.appSettings.showNotification(title, {
                body: body,
                tag: 'proximity-alert',
                requireInteraction: true
            });
        }

        // Вибрация (если доступна)
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }

        // Визуальное уведомление в интерфейсе
        this.showVisualAlert(distance);
    }

    showVisualAlert(distance) {
        // Создаем всплывающее уведомление в UI
        const alert = document.createElement('div');
        alert.className = 'proximity-alert';
        alert.innerHTML = `
            <div class="alert-content">
                <span class="alert-icon">🎯</span>
                <div class="alert-text">
                    <strong>Близко к маяку!</strong>
                    <div>Расстояние: ${window.appSettings.convertDistance(distance).text}</div>
                </div>
                <button class="alert-close">&times;</button>
            </div>
        `;

        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .proximity-alert .alert-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .proximity-alert .alert-close {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(alert);

        // Закрытие по кнопке
        alert.querySelector('.alert-close').onclick = () => {
            alert.remove();
        };

        // Автоматическое закрытие через 5 секунд
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    // Уведомление о подключении/отключении
    showConnectionNotification(isConnected, deviceName = '') {
        if (!window.appSettings.settings.notifications) return;

        const title = isConnected ? '📡 Подключено к маяку' : '🔴 Отключено от маяка';
        const body = isConnected ? `Устройство: ${deviceName}` : 'Потеряно соединение';

        window.appSettings.showNotification(title, { body });
    }

    // Уведомление о низком заряде
    showBatteryAlert(level) {
        if (level <= 20) {
            const title = '🔋 Низкий заряд батареи';
            const body = `Уровень заряда: ${level}%`;

            if (window.appSettings.settings.notifications) {
                window.appSettings.showNotification(title, { body });
            }

            if (window.voiceGuide && window.appSettings.settings.voiceGuidance) {
                window.voiceGuide.speak(`Внимание! Низкий заряд батареи, ${level} процентов`, 'high');
            }
        }
    }

    // Уведомление о новой координате
    showNewCoordinateAlert(coordinate) {
        if (!window.appSettings.settings.notifications) return;

        const title = '📍 Получены новые координаты';
        const body = `Ш: ${coordinate.lat.toFixed(6)}, Д: ${coordinate.lon.toFixed(6)}`;

        window.appSettings.showNotification(title, { body, icon: '/icons/map-icon.png' });
    }
}

// Глобальный экземпляр
window.notificationManager = new NotificationManager();
