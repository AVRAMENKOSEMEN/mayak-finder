class SettingsManager {
    constructor() {
        this.defaultSettings = {
            theme: 'auto',
            units: 'metric',
            defaultMaps: 'internal',
            showLocation: true,
            highAccuracy: true
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

    convertDistance(km) {
        if (this.settings.units === 'metric') {
            if (km < 1) return { value: km * 1000, unit: 'м', text: Math.round(km * 1000) + ' м' };
            return { value: km, unit: 'км', text: km.toFixed(2) + ' км' };
        } else {
            const miles = km * 0.621371;
            if (miles < 0.5) return { value: miles * 5280, unit: 'фут', text: Math.round(miles * 5280) + ' фут' };
            return { value: miles, unit: 'миль', text: miles.toFixed(2) + ' миль' };
        }
    }

    convertSpeed(kmh) {
        if (this.settings.units === 'metric') {
            return { value: kmh, unit: 'км/ч', text: kmh.toFixed(1) + ' км/ч' };
        } else {
            const mph = kmh * 0.621371;
            return { value: mph, unit: 'миль/ч', text: mph.toFixed(1) + ' миль/ч' };
        }
    }

    resetToDefaults() {
        this.settings = {...this.defaultSettings};
        this.saveSettings();
    }
}

window.appSettings = new SettingsManager();
