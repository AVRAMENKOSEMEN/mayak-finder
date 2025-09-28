class HistoryManager {
    constructor() {
        this.maxEntries = 100;
        this.history = this.loadHistory();
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('coordinatesHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            return [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem('coordinatesHistory', JSON.stringify(this.history));
        } catch (error) {
            console.error('Ошибка сохранения истории:', error);
        }
    }

    addEntry(latitude, longitude, timestamp = Date.now(), name = '') {
        const entry = {
            id: this.generateId(),
            latitude,
            longitude,
            timestamp,
            name: name || `Точка ${this.history.length + 1}`
        };

        this.history.unshift(entry);
        
        if (this.history.length > this.maxEntries) {
            this.history = this.history.slice(0, this.maxEntries);
        }

        this.saveHistory();
        return entry;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    deleteEntry(id) {
        this.history = this.history.filter(entry => entry.id !== id);
        this.saveHistory();
    }

    clearHistory() {
        this.history = [];
        this.saveHistory();
    }

    getRecentEntries(limit = 10) {
        return this.history.slice(0, limit);
    }

    exportToGPX() {
        const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Mayak Finder">
    <metadata>
        <name>История координат маяка</name>
        <time>${new Date().toISOString()}</time>
    </metadata>
    ${this.history.map(entry => `
    <wpt lat="${entry.latitude}" lon="${entry.longitude}">
        <time>${new Date(entry.timestamp).toISOString()}</time>
        <name>${this.escapeXml(entry.name)}</name>
    </wpt>`).join('')}
</gpx>`;

        this.downloadFile(gpx, 'mayak-history.gpx', 'application/gpx+xml');
    }

    exportToKML() {
        const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
        <name>История координат маяка</name>
        ${this.history.map(entry => `
        <Placemark>
            <name>${this.escapeXml(entry.name)}</name>
            <TimeStamp>
                <when>${new Date(entry.timestamp).toISOString()}</when>
            </TimeStamp>
            <Point>
                <coordinates>${entry.longitude},${entry.latitude},0</coordinates>
            </Point>
        </Placemark>`).join('')}
    </Document>
</kml>`;

        this.downloadFile(kml, 'mayak-history.kml', 'application/vnd.google-earth.kml+xml');
    }

    exportToCSV() {
        const headers = 'Имя,Широта,Долгота,Время\n';
        const rows = this.history.map(entry => 
            `"${entry.name}",${entry.latitude},${entry.longitude},"${new Date(entry.timestamp).toLocaleString()}"`
        ).join('\n');
        
        this.downloadFile(headers + rows, 'mayak-history.csv', 'text/csv');
    }

    escapeXml(unsafe) {
        return unsafe.replace(/[<>&'"]/g, c => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

window.coordinatesHistory = new HistoryManager();
