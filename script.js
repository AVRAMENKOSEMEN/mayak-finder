class MayakFinder {
    constructor() {
        // ... существующий код конструктора ...
        
        this.initializePWA(); // Инициализация PWA
        this.initializeElements();
        this.setupEventListeners();
        this.initializeTestData();
    }

    // ДОБАВЛЯЕМ ЭТОТ МЕТОД
    initializePWA() {
        // Регистрируем Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('Service Worker зарегистрирован:', registration);
                })
                .catch(error => {
                    console.log('Ошибка регистрации Service Worker:', error);
                });
        }

        // Обработчик установки PWA
        let deferredPrompt;
        const installPrompt = document.getElementById('installPrompt');
        const installBtn = document.getElementById('installBtn');
        const dismissBtn = document.getElementById('dismissBtn');
        const installPwaBtn = document.getElementById('installPwaBtn');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installPrompt.style.display = 'block';
            
            // Показываем кнопку установки в уведомлении
            installPwaBtn.style.display = 'block';
        });

        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.log('Пользователь установил приложение');
                    installPrompt.style.display = 'none';
                }
                deferredPrompt = null;
            }
        });

        installPwaBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.log('PWA приложение установлено');
                }
                deferredPrompt = null;
            } else {
                this.log('Браузер не поддерживает установку PWA');
                alert('Ваш браузер не поддерживает установку приложений. Попробуйте Chrome или Edge на Android.');
            }
        });

        dismissBtn.addEventListener('click', () => {
            installPrompt.style.display = 'none';
        });

        // Проверяем, запущено ли приложение как PWA
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.log('Приложение запущено в standalone режиме (PWA)');
        }
    }

    // ... остальной код класса без изменений ...
}

// ... остальной код без изменений ...
