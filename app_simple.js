class SchoolConnectivityMonitor {
    constructor() {
        this.map = null;
        this.markers = null;
        this.schools = [];
        this.init();
    }

    init() {
        console.log('Initializing app...');
        this.initMap();
        this.setupEventListeners();
        this.loadSampleData();
        console.log('App initialization complete');
    }

    initMap() {
        console.log('Initializing map...');
        try {
            // Initialize map centered on Philippines
            this.map = L.map('map').setView([12.8797, 121.7740], 6);
            console.log('Map object created');

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);
            console.log('Tile layer added');

            // Initialize marker cluster group
            this.markers = L.markerClusterGroup({
                chunkedLoading: true,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: true,
                zoomToBoundsOnClick: true
            });

            this.map.addLayer(this.markers);
            console.log('Map initialization complete');
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // File upload handler
        document.getElementById('csvFile').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        // Filter handlers
        document.getElementById('regionFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('connectivityFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        console.log('Event listeners set up');
    }

    loadSampleData() {
        console.log('Loading sample data...');
        
        // Update status
        document.getElementById('dataStatus').textContent = 'Loading sample data - Upload CSV for all 46,983 schools';
        document.getElementById('dataStatus').style.color = '#ffc107';
        
        // Sample data
        const sampleData = [
            {
                "School Name": "Manila High School",
                "Latitude": 14.5995,
                "Longitude": 120.9842,
                "Region": "NCR",
                "Province": "Metro Manila",
                "Municipality": "Manila",
                "Connectivity Status": "online"
            },
            {
                "School Name": "Cebu Central School",
                "Latitude": 10.3157,
                "Longitude": 123.8854,
                "Region": "Region VII",
                "Province": "Cebu",
                "Municipality": "Cebu City",
                "Connectivity Status": "limited"
            },
            {
                "School Name": "Davao Elementary",
                "Latitude": 7.0731,
                "Longitude": 125.6128,
                "Region": "Region XI",
                "Province": "Davao del Sur",
                "Municipality": "Davao City",
                "Connectivity Status": "offline"
            }
        ];

        console.log('Sample data created, processing...');
        this.processSchoolData(sampleData);
    }

    handleFileUpload(file) {
        if (!file) return;

        console.log('File uploaded:', file.name, file.type);
        const fileType = file.name.split('.').pop().toLowerCase();

        if (fileType === 'csv') {
            this.parseCSV(file);
        } else if (fileType === 'xlsx' || fileType === 'xls') {
            this.parseExcel(file);
        } else {
            alert('Please upload a CSV or Excel file');
        }
    }

    parseCSV(file) {
        console.log('Parsing CSV file...');
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                console.log('CSV parsed, records:', results.data.length);
                this.processSchoolData(results.data);
            },
            error: (error) => {
                console.error('CSV parsing error:', error);
                alert('Error parsing CSV file');
            }
        });
    }

    parseExcel(file) {
        console.log('Parsing Excel file...');
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                console.log('Excel parsed, records:', jsonData.length);
                this.processSchoolData(jsonData);
            } catch (error) {
                console.error('Excel parsing error:', error);
                alert('Error parsing Excel file');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    processSchoolData(data) {
        console.log('Processing school data, input records:', data.length);
        
        this.schools = data.map(school => {
            const normalizedSchool = {
                name: school['School Name'] || school.name || 'Unknown School',
                latitude: parseFloat(school['Latitude'] || school.latitude || 0),
                longitude: parseFloat(school['Longitude'] || school.longitude || 0),
                region: school['Region'] || school.region || 'Unknown Region',
                province: school['Province'] || school.province || 'Unknown Province',
                city: school['Municipality'] || school.municipality || school.city || 'Unknown City',
                connectivity: this.normalizeConnectivityStatus(school['Connectivity Status'] || school.connectivity || 'unknown')
            };

            return {
                ...normalizedSchool,
                id: Math.random().toString(36).substr(2, 9)
            };
        }).filter(school => 
            school.latitude !== 0 && 
            school.longitude !== 0 && 
            !isNaN(school.latitude) && 
            !isNaN(school.longitude)
        );

        console.log(`Processed ${this.schools.length} schools with valid coordinates`);
        
        // Update status
        const statusElement = document.getElementById('dataStatus');
        if (this.schools.length > 1000) {
            statusElement.textContent = `Loaded ${this.schools.length.toLocaleString()} schools`;
            statusElement.style.color = '#28a745';
        } else {
            statusElement.textContent = `Loaded ${this.schools.length} schools - Upload CSV for full dataset`;
            statusElement.style.color = '#28a745';
        }
        
        this.updateRegionFilter();
        this.displaySchools();
        this.updateStatistics();
    }

    normalizeConnectivityStatus(status) {
        if (!status) return 'unknown';
        
        const statusLower = status.toString().toLowerCase();
        
        if (statusLower.includes('online') || statusLower.includes('connected')) {
            return 'online';
        } else if (statusLower.includes('offline') || statusLower.includes('disconnected')) {
            return 'offline';
        } else if (statusLower.includes('limited') || statusLower.includes('mobile')) {
            return 'limited';
        }
        
        return 'unknown';
    }

    updateRegionFilter() {
        const regionFilter = document.getElementById('regionFilter');
        const regions = [...new Set(this.schools.map(school => school.region))].sort();
        
        regionFilter.innerHTML = '<option value="">All Regions</option>';
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionFilter.appendChild(option);
        });
        
        console.log('Region filter updated with', regions.length, 'regions');
    }

    applyFilters() {
        const regionFilter = document.getElementById('regionFilter').value;
        const connectivityFilter = document.getElementById('connectivityFilter').value;

        this.filteredSchools = this.schools.filter(school => {
            const regionMatch = !regionFilter || school.region === regionFilter;
            const connectivityMatch = !connectivityFilter || school.connectivity === connectivityFilter;
            return regionMatch && connectivityMatch;
        });

        console.log('Filters applied, showing', this.filteredSchools.length, 'schools');
        this.displaySchools();
        this.updateStatistics();
    }

    displaySchools() {
        const schoolsToDisplay = this.filteredSchools.length > 0 ? this.filteredSchools : this.schools;
        console.log('Displaying', schoolsToDisplay.length, 'schools');
        
        // Clear existing markers
        this.markers.clearLayers();

        schoolsToDisplay.forEach(school => {
            const marker = this.createSchoolMarker(school);
            this.markers.addLayer(marker);
        });
        
        console.log('Schools displayed on map');
    }

    createSchoolMarker(school) {
        const color = this.getConnectivityColor(school.connectivity);
        
        const marker = L.marker([school.latitude, school.longitude]);
        
        const popupContent = `
            <div>
                <h4>${school.name}</h4>
                <p><strong>Region:</strong> ${school.region}</p>
                <p><strong>Province:</strong> ${school.province}</p>
                <p><strong>City:</strong> ${school.city}</p>
                <p><strong>Status:</strong> <span style="color: ${color};">${school.connectivity.toUpperCase()}</span></p>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        return marker;
    }

    getConnectivityColor(connectivity) {
        switch (connectivity) {
            case 'online': return '#28a745';
            case 'offline': return '#dc3545';
            case 'limited': return '#ffc107';
            default: return '#6c757d';
        }
    }

    updateStatistics() {
        const schoolsToCount = this.filteredSchools.length > 0 ? this.filteredSchools : this.schools;
        
        const total = schoolsToCount.length;
        const online = schoolsToCount.filter(school => school.connectivity === 'online').length;
        const offline = schoolsToCount.filter(school => school.connectivity === 'offline').length;
        const limited = schoolsToCount.filter(school => school.connectivity === 'limited').length;

        document.getElementById('totalSchools').textContent = total;
        document.getElementById('onlineSchools').textContent = online;
        document.getElementById('offlineSchools').textContent = offline;
        document.getElementById('limitedSchools').textContent = limited;
        
        console.log('Statistics updated - Total:', total, 'Online:', online, 'Offline:', offline, 'Limited:', limited);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    try {
        new SchoolConnectivityMonitor();
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});