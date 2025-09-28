// voice-guidance.js - Голосовые подсказки для навигатора
class VoiceGuidance {
    constructor() {
        this.synth = window.speechSynthesis;
        this.isEnabled = false;
        this.lastInstruction = '';
        this.voice = null;
        
        this.init();
    }

    init() {
        // Ждем загрузки голосов
        setTimeout(() => this.loadVoices(), 1000);
        
        // Запрос разрешения на голосовые подсказки
        if ('speechSynthesis' in window) {
            this.isEnabled = localStorage.getItem('voiceGuidance') === 'true';
        }
    }

    loadVoices() {
        const voices = this.synth.getVoices();
        // Предпочитаем русский голос
        this.voice = voices.find(voice => 
            voice.lang.includes('ru') || voice.lang.includes('RU')
        ) || voices[0];
    }

    enable() {
        this.isEnabled = true;
        localStorage.setItem('voiceGuidance', 'true');
        this.speak('Голосовые подсказки включены');
    }

    disable() {
        this.isEnabled = false;
        localStorage.setItem('voiceGuidance', 'false');
        this.speak('Голосовые подсказки выключены');
    }

    speak(text, priority = 'normal') {
        if (!this.isEnabled || !this.voice) return;

        // Не повторять одинаковые инструкции
        if (text === this.lastInstruction && priority === 'normal') return;

        // Остановить предыдущую речь
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.voice;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        this.synth.speak(utterance);
        this.lastInstruction = text;
    }

    giveNavigationInstruction(distance, bearing, accuracy) {
        if (!this.isEnabled) return;

        let instruction = '';
        
        if (distance < 0.01) { // Менее 10 метров
            instruction = 'Вы прибыли к цели! Маяк прямо перед вами';
        } else if (distance < 0.05) { // Менее 50 метров
            instruction = 'Маяк очень близко, примерно ' + Math.round(distance * 1000) + ' метров';
        } else if (distance < 0.1) { // Менее 100 метров
            instruction = 'Продолжайте движение, осталось ' + Math.round(distance * 1000) + ' метров';
        } else {
            const direction = this.getDirectionText(bearing);
            instruction = `Двигайтесь ${direction}, расстояние ${distance.toFixed(1)} километров`;
        }

        // Добавляем информацию о точности
        if (accuracy > 50) {
            instruction += '. Внимание: низкая точность GPS';
        }

        this.speak(instruction);
    }

    getDirectionText(bearing) {
        if (bearing >= 337.5 || bearing < 22.5) return 'прямо';
        if (bearing >= 22.5 && bearing < 67.5) return 'направо вперёд';
        if (bearing >= 67.5 && bearing < 112.5) return 'направо';
        if (bearing >= 112.5 && bearing < 157.5) return 'направо назад';
        if (bearing >= 157.5 && bearing < 202.5) return 'назад';
        if (bearing >= 202.5 && bearing < 247.5) return 'налево назад';
        if (bearing >= 247.5 && bearing < 292.5) return 'налево';
        if (bearing >= 292.5 && bearing < 337.5) return 'налево вперёд';
        return 'прямо';
    }

    // Специальные уведомления
    notifyApproaching(distance) {
        if (distance < 0.2) {
            this.speak('Внимание! Приближаетесь к маяку', 'high');
        }
    }

    notifyLowBattery() {
        this.speak('Внимание! Низкий заряд батареи устройства', 'high');
    }

    notifySignalLost() {
        this.speak('Потеря сигнала GPS. Проверьте соединение', 'high');
    }
}

// Создаем глобальный экземпляр
window.voiceGuide = new VoiceGuidance();
