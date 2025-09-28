class SettingsManager {
    constructor() {
        this.defaultSettings = {
            theme: 'auto',
            defaultMap: 'internal',
            highAccuracy: true,
            showLocation: true
        };
        
        this.settings = this.loadSettings();
        this.applySettings();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('appSettings');
            return saved ? {...this.defaultSettings, ...JSON.parse(saved)} : {...this.defaultSettings};
        } catch (error) {
            return {...this.defaultSettings};
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('appSettings', JSON.stringify(this.settings));
            this.applySettings();
            return true;
        } catch (error) {
            return false;
        }
    }

    applySettings() {
        this.applyTheme();
    }

    applyTheme() {
        const theme = this.settings.theme;
        let actualTheme = theme;
        
        if (theme === 'auto') {
            actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', actualTheme);
        
        const themeColor = actualTheme === 'dark' ? '#2d3748' : '#667eea';
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', themeColor);
        }
    }

    resetToDefaults() {
        this.settings = {...this.defaultSettings};
        this.saveSettings();
    }

    // Получить URL для выбранных карт
    getMapUrl(lat, lon, mapType = null) {
        const type = mapType || this.settings.defaultMap;
        
        const mapUrls = {
            'google': `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
            'yandex': `https://yandex.ru/maps/?text=${lat},${lon}`,
            '2gis': `https://2gis.ru/geo/${lon},${lat}`,
            'apple': `https://maps.apple.com/?q=${lat},${lon}`,
            'osm': `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`,
            'internal': `map.html?lat=${lat}&lon=${lon}`
        };

        return mapUrls[type] || mapUrls.internal;
    }
}

window.appSettings = new SettingsManager();
