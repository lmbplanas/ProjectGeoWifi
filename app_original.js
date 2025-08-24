class SchoolConnectivityMonitor {
    constructor() {
        this.map = null;
        this.markers = null;
        this.heatLayer = null;
        this.schools = [];
        this.filteredSchools = [];
        this.isHeatmapView = false;
        this.init();
    }

    init() {
        this.initMap();
        this.setupEventListeners();
        this.loadSampleData();
    }

    initMap() {
        // Initialize map centered on Philippines
        this.map = L.map('map').setView([12.8797, 121.7740], 6);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Initialize marker cluster group with custom clustering
        this.markers = L.markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true,
            maxClusterRadius: 50,
            disableClusteringAtZoom: 15,
            iconCreateFunction: this.createClusterIcon.bind(this)
        });

        // Add cluster event listeners
        this.markers.on('clustermouseover', (e) => {
            const cluster = e.layer;
            const tooltipContent = cluster.options.icon.options.tooltipContent;
            if (tooltipContent) {
                cluster.bindTooltip(tooltipContent, {
                    permanent: false,
                    direction: 'top',
                    offset: [0, -10]
                }).openTooltip();
            }
        });

        this.markers.on('clustermouseout', (e) => {
            e.layer.closeTooltip();
        });

        this.map.addLayer(this.markers);
    }

    createClusterIcon(cluster) {
        const markers = cluster.getAllChildMarkers();
        const total = markers.length;
        
        // Count connectivity status in cluster
        const counts = {
            online: 0,
            limited: 0,
            offline: 0,
            unknown: 0
        };
        
        markers.forEach(marker => {
            const connectivity = marker.options.connectivity || 'unknown';
            counts[connectivity]++;
        });
        
        // Calculate percentages
        const onlinePercent = (counts.online / total) * 100;
        const offlinePercent = (counts.offline / total) * 100;
        const limitedPercent = (counts.limited / total) * 100;
        
        // Determine dominant color
        let dominantColor = '#6c757d'; // gray for unknown
        let borderColor = '#ffffff';
        
        if (onlinePercent > 60) {
            dominantColor = '#28a745'; // green for mostly online
        } else if (offlinePercent > 60) {
            dominantColor = '#dc3545'; // red for mostly offline
        } else if (limitedPercent > 30) {
            dominantColor = '#ffc107'; // yellow for significant limited
        } else if (onlinePercent > offlinePercent) {
            dominantColor = '#6f9654'; // light green for more online than offline
        } else {
            dominantColor = '#d67b7b'; // light red for more offline than online
        }
        
        // Create size categories
        let size = 'small';
        let iconSize = 40;
        if (total >= 100) {
            size = 'large';
            iconSize = 50;
        } else if (total >= 20) {
            size = 'medium';
            iconSize = 45;
        }
        
        // Create pie chart style cluster if mixed connectivity
        let html;
        if (onlinePercent > 0 && offlinePercent > 0) {
            // Create a pie chart representation
            const onlineAngle = (onlinePercent / 100) * 360;
            const limitedAngle = (limitedPercent / 100) * 360;
            const offlineAngle = (offlinePercent / 100) * 360;
            
            html = `
                <div style="
                    width: ${iconSize}px; 
                    height: ${iconSize}px; 
                    border-radius: 50%; 
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    position: relative;
                    background: conic-gradient(
                        #28a745 0deg ${onlineAngle}deg,
                        #ffc107 ${onlineAngle}deg ${onlineAngle + limitedAngle}deg,
                        #dc3545 ${onlineAngle + limitedAngle}deg 360deg
                    );
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="
                        background: rgba(255,255,255,0.9);
                        border-radius: 50%;
                        width: ${iconSize - 14}px;
                        height: ${iconSize - 14}px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: ${iconSize < 45 ? '11px' : '12px'};
                        color: #333;
                    ">${total}</div>
                </div>
            `;
        } else {
            // Single color cluster
            html = `
                <div style="
                    width: ${iconSize}px; 
                    height: ${iconSize}px; 
                    border-radius: 50%; 
                    background-color: ${dominantColor};
                    border: 3px solid ${borderColor};
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: ${iconSize < 45 ? '12px' : '14px'};
                    color: white;
                    text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
                ">${total}</div>
            `;
        }
        
        const icon = L.divIcon({
            html: html,
            className: `custom-cluster-icon cluster-${size}`,
            iconSize: [iconSize, iconSize],
            iconAnchor: [iconSize/2, iconSize/2]
        });
        
        // Add tooltip with connectivity breakdown
        const tooltipContent = `
            <div style="text-align: center;">
                <strong>${total} Schools</strong><br>
                <span style="color: #28a745;">●</span> Online: ${counts.online} (${onlinePercent.toFixed(1)}%)<br>
                <span style="color: #ffc107;">●</span> Limited: ${counts.limited} (${limitedPercent.toFixed(1)}%)<br>
                <span style="color: #dc3545;">●</span> Offline: ${counts.offline} (${offlinePercent.toFixed(1)}%)
            </div>
        `;
        
        // Store tooltip content for later use
        icon.options.tooltipContent = tooltipContent;
        
        return icon;
    }

    setupEventListeners() {
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

        // Heat map toggle handler
        document.getElementById('heatmapToggle').addEventListener('change', (e) => {
            this.isHeatmapView = e.target.checked;
            this.toggleViewMode();
        });
    }

    handleFileUpload(file) {
        if (!file) return;

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
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                this.processSchoolData(results.data);
            },
            error: (error) => {
                console.error('CSV parsing error:', error);
                alert('Error parsing CSV file');
            }
        });
    }

    parseExcel(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                this.processSchoolData(jsonData);
            } catch (error) {
                console.error('Excel parsing error:', error);
                alert('Error parsing Excel file');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    processSchoolData(data) {
        this.schools = data.map(school => {
            // Handle the specific format from the DICT Excel file
            const normalizedSchool = {
                name: school['School Name'] || school['school name'] || school.name || 'Unknown School',
                latitude: parseFloat(school['Latitude'] || school.latitude || 0),
                longitude: parseFloat(school['Longitude'] || school.longitude || 0),
                region: school['Region'] || school.region || 'Unknown Region',
                province: school['Province'] || school.province || 'Unknown Province',
                city: school['Municipality'] || school.municipality || school.city || 'Unknown City',
                barangay: school['Barangay'] || school.barangay || '',
                schoolId: school['BEIS School ID'] || school['school id'] || '',
                enrollment: school['Enrollment'] || school.enrollment || 0,
                sizeCategory: school['Size Category'] || '',
                sector: school['Sector'] || '',
                electricityStatus: school['Overall  Status Electricity'] || school['electricity status'] || 'Unknown',
                division: school['Division'] || school.division || '',
                district: school['District'] || school.district || '',
                streetAddress: school['Street Address'] || school['address'] || ''
            };

            // Determine connectivity status from multiple columns
            let connectivity = 'unknown';
            const withInternet = school['With Internet\n(By School ID)'] || school['with internet'] || 0;
            const mobileData = school['Mobile Data\n(By School ID)'] || school['mobile data'] || 0;
            const noInternet = school['No Internet\n(By School ID)'] || school['no internet'] || 0;
            const connectionType = school['With Internet\n(Type of Connection)'] || school['connection type'] || '';
            const dictFreeWifi = school['DICT Free Wifi'] || school['dict wifi'] || '';
            const bayanihanSim = school['Bayanihan Sim'] || school['bayanihan sim'] || '';

            if (parseInt(withInternet) === 1 || connectionType.toLowerCase().includes('connected')) {
                connectivity = 'online';
            } else if (parseInt(mobileData) === 1 || bayanihanSim || dictFreeWifi) {
                connectivity = 'limited';
            } else if (parseInt(noInternet) === 1) {
                connectivity = 'offline';
            }

            // Determine provider/speed info
            let provider = 'Unknown';
            let speed = 'Unknown';
            
            if (connectionType) {
                if (connectionType.toLowerCase().includes('wired')) {
                    provider = 'Fixed Broadband';
                } else if (connectionType.toLowerCase().includes('wireless')) {
                    provider = 'Wireless';
                }
            }
            
            if (dictFreeWifi) {
                provider = 'DICT Free WiFi';
            }
            
            if (bayanihanSim) {
                provider += (provider === 'Unknown' ? '' : ' + ') + 'Bayanihan SIM';
            }

            return {
                ...normalizedSchool,
                connectivity,
                provider,
                speed,
                connectionType,
                withInternet: parseInt(withInternet),
                mobileData: parseInt(mobileData),
                noInternet: parseInt(noInternet),
                dictFreeWifi,
                bayanihanSim,
                id: normalizedSchool.schoolId || Math.random().toString(36).substr(2, 9)
            };
        }).filter(school => 
            school.latitude !== 0 && 
            school.longitude !== 0 && 
            !isNaN(school.latitude) && 
            !isNaN(school.longitude)
        );

        console.log(`Processed ${this.schools.length} schools with valid coordinates`);
        
        // Update status display
        const statusElement = document.getElementById('dataStatus');
        if (this.schools.length > 1000) {
            statusElement.textContent = `Loaded ${this.schools.length.toLocaleString()} schools from DICT masterlist`;
            statusElement.style.color = '#28a745';
        } else if (this.schools.length > 10) {
            statusElement.textContent = `Loaded ${this.schools.length} schools from uploaded file`;
            statusElement.style.color = '#28a745';
        }
        
        this.updateRegionFilter();
        this.displaySchools();
        this.updateStatistics();
        this.createHeatMapLayers();
    }

    normalizeConnectivityStatus(status) {
        if (!status) return 'unknown';
        
        const statusLower = status.toString().toLowerCase();
        
        if (statusLower.includes('online') || statusLower.includes('connected') || statusLower.includes('good')) {
            return 'online';
        } else if (statusLower.includes('offline') || statusLower.includes('disconnected') || statusLower.includes('no connection')) {
            return 'offline';
        } else if (statusLower.includes('limited') || statusLower.includes('slow') || statusLower.includes('poor')) {
            return 'limited';
        } else if (statusLower.includes('1') || statusLower === 'true') {
            return 'online';
        } else if (statusLower.includes('0') || statusLower === 'false') {
            return 'offline';
        }
        
        return 'unknown';
    }

    updateRegionFilter() {
        const regionFilter = document.getElementById('regionFilter');
        const regions = [...new Set(this.schools.map(school => school.region))].sort();
        
        // Clear existing options except "All Regions"
        regionFilter.innerHTML = '<option value="">All Regions</option>';
        
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionFilter.appendChild(option);
        });
    }

    applyFilters() {
        const regionFilter = document.getElementById('regionFilter').value;
        const connectivityFilter = document.getElementById('connectivityFilter').value;

        this.filteredSchools = this.schools.filter(school => {
            const regionMatch = !regionFilter || school.region === regionFilter;
            const connectivityMatch = !connectivityFilter || school.connectivity === connectivityFilter;
            return regionMatch && connectivityMatch;
        });

        this.displaySchools();
        this.updateStatistics();
        
        // Update heat map if in heat map view
        if (this.isHeatmapView) {
            this.createHeatMapLayers();
            this.displayHeatMapLayers();
        }
    }

    displaySchools() {
        const schoolsToDisplay = this.filteredSchools.length > 0 ? this.filteredSchools : this.schools;
        
        // Clear existing markers
        this.markers.clearLayers();

        schoolsToDisplay.forEach(school => {
            const marker = this.createSchoolMarker(school);
            this.markers.addLayer(marker);
        });
    }

    createSchoolMarker(school) {
        const icon = this.getConnectivityIcon(school.connectivity);
        const marker = L.marker([school.latitude, school.longitude], { 
            icon,
            connectivity: school.connectivity // Pass connectivity for clustering
        });

        const popupContent = this.createPopupContent(school);
        marker.bindPopup(popupContent);

        marker.on('click', () => {
            this.showSchoolDetails(school);
        });

        return marker;
    }

    getConnectivityIcon(connectivity) {
        let color, pulseColor;
        switch (connectivity) {
            case 'online':
                color = '#28a745';
                pulseColor = 'rgba(40, 167, 69, 0.3)';
                break;
            case 'offline':
                color = '#dc3545';
                pulseColor = 'rgba(220, 53, 69, 0.3)';
                break;
            case 'limited':
                color = '#ffc107';
                pulseColor = 'rgba(255, 193, 7, 0.3)';
                break;
            default:
                color = '#6c757d';
                pulseColor = 'rgba(108, 117, 125, 0.3)';
        }

        return L.divIcon({
            className: 'custom-marker',
            html: `
                <div class="marker-container">
                    <div class="marker-pulse" style="background-color: ${pulseColor};"></div>
                    <div class="marker-dot" style="background-color: ${color};"></div>
                </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    }

    createPopupContent(school) {
        return `
            <div class="popup-content">
                <h4>${school.name}</h4>
                <p><strong>School ID:</strong> ${school.schoolId}</p>
                <p><strong>Region:</strong> ${school.region}</p>
                <p><strong>Province:</strong> ${school.province}</p>
                <p><strong>Municipality:</strong> ${school.city}</p>
                <p><strong>Barangay:</strong> ${school.barangay}</p>
                <p><strong>Status:</strong> <span class="connectivity-status ${school.connectivity}">${school.connectivity.toUpperCase()}</span></p>
                <p><strong>Connection:</strong> ${school.connectionType || 'None'}</p>
                <p><strong>Provider:</strong> ${school.provider}</p>
                <p><strong>Enrollment:</strong> ${school.enrollment}</p>
                <p><strong>Electricity:</strong> ${school.electricityStatus}</p>
            </div>
        `;
    }

    showSchoolDetails(school) {
        const schoolInfo = document.getElementById('schoolInfo');
        schoolInfo.innerHTML = `
            <div class="school-name">${school.name}</div>
            <div class="detail-row">
                <span class="detail-label">School ID:</span>
                <span>${school.schoolId}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Region:</span>
                <span>${school.region}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Province:</span>
                <span>${school.province}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Municipality:</span>
                <span>${school.city}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Barangay:</span>
                <span>${school.barangay}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Division:</span>
                <span>${school.division}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">District:</span>
                <span>${school.district}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="connectivity-status ${school.connectivity}">${school.connectivity.toUpperCase()}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Connection Type:</span>
                <span>${school.connectionType || 'None'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Provider:</span>
                <span>${school.provider}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Enrollment:</span>
                <span>${school.enrollment}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Size Category:</span>
                <span>${school.sizeCategory}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Sector:</span>
                <span>${school.sector}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Electricity:</span>
                <span>${school.electricityStatus}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">DICT Free WiFi:</span>
                <span>${school.dictFreeWifi || 'No'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Bayanihan SIM:</span>
                <span>${school.bayanihanSim || 'No'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Coordinates:</span>
                <span>${school.latitude.toFixed(4)}, ${school.longitude.toFixed(4)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Address:</span>
                <span>${school.streetAddress}</span>
            </div>
        `;
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
    }

    toggleViewMode() {
        if (this.isHeatmapView) {
            this.showHeatMap();
            // Switch legend
            document.getElementById('clusterLegend').style.display = 'none';
            document.getElementById('heatmapLegend').style.display = 'block';
        } else {
            this.showClusterView();
            // Switch legend
            document.getElementById('clusterLegend').style.display = 'block';
            document.getElementById('heatmapLegend').style.display = 'none';
        }
    }

    showHeatMap() {
        // Hide cluster markers
        if (this.markers) {
            this.map.removeLayer(this.markers);
        }
        
        // Show heat map layers
        this.createHeatMapLayers();
        this.displayHeatMapLayers();
    }

    showClusterView() {
        // Hide heat map layers
        this.hideHeatMapLayers();
        
        // Show cluster markers
        if (this.markers) {
            this.map.addLayer(this.markers);
        }
    }

    createHeatMapLayers() {
        const schoolsToDisplay = this.filteredSchools.length > 0 ? this.filteredSchools : this.schools;
        
        // Create separate layers for each connectivity status
        this.heatLayers = {
            online: [],
            limited: [],
            offline: []
        };

        schoolsToDisplay.forEach(school => {
            const point = [school.latitude, school.longitude, 1]; // lat, lng, intensity
            
            switch (school.connectivity) {
                case 'online':
                    this.heatLayers.online.push(point);
                    break;
                case 'limited':
                    this.heatLayers.limited.push(point);
                    break;
                case 'offline':
                    this.heatLayers.offline.push(point);
                    break;
            }
        });
    }

    displayHeatMapLayers() {
        // Remove existing heat layers
        this.hideHeatMapLayers();

        // Note: Leaflet.heat plugin would be needed for this functionality
        // For now, we'll create a visual representation using circle markers
        this.createDensityVisualization();
    }

    createDensityVisualization() {
        const schoolsToDisplay = this.filteredSchools.length > 0 ? this.filteredSchools : this.schools;
        
        // Group schools by connectivity and create larger, semi-transparent markers
        const densityMarkers = L.layerGroup();
        
        // Create density grid
        const gridSize = 0.1; // degrees
        const densityGrid = {};
        
        schoolsToDisplay.forEach(school => {
            const gridX = Math.floor(school.longitude / gridSize) * gridSize;
            const gridY = Math.floor(school.latitude / gridSize) * gridSize;
            const key = `${gridX},${gridY}`;
            
            if (!densityGrid[key]) {
                densityGrid[key] = {
                    lat: gridY + gridSize/2,
                    lng: gridX + gridSize/2,
                    online: 0,
                    limited: 0,
                    offline: 0,
                    total: 0
                };
            }
            
            densityGrid[key][school.connectivity]++;
            densityGrid[key].total++;
        });
        
        // Create density markers
        Object.values(densityGrid).forEach(grid => {
            if (grid.total === 0) return;
            
            // Calculate dominant connectivity
            let dominantType = 'offline';
            let maxCount = grid.offline;
            
            if (grid.online > maxCount) {
                dominantType = 'online';
                maxCount = grid.online;
            }
            if (grid.limited > maxCount) {
                dominantType = 'limited';
                maxCount = grid.limited;
            }
            
            // Color based on dominant type
            let color;
            switch (dominantType) {
                case 'online': color = '#28a745'; break;
                case 'limited': color = '#ffc107'; break;
                case 'offline': color = '#dc3545'; break;
                default: color = '#6c757d';
            }
            
            // Size based on total schools
            const radius = Math.min(50, Math.max(10, grid.total * 2));
            
            const circle = L.circle([grid.lat, grid.lng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.3,
                radius: radius * 100, // meters
                weight: 2
            }).bindPopup(`
                <strong>${grid.total} Schools in this area</strong><br>
                Online: ${grid.online}<br>
                Limited: ${grid.limited}<br>
                Offline: ${grid.offline}
            `);
            
            densityMarkers.addLayer(circle);
        });
        
        this.densityLayer = densityMarkers;
        this.map.addLayer(this.densityLayer);
    }

    hideHeatMapLayers() {
        if (this.densityLayer) {
            this.map.removeLayer(this.densityLayer);
            this.densityLayer = null;
        }
    }

    loadSampleData() {
        // Show sample data with instruction to upload the real file
        document.getElementById('dataStatus').textContent = 'Showing sample data - Upload dict_schools_masterlist.csv to see all 46,983 schools';
        document.getElementById('dataStatus').style.color = '#ffc107';
        
        // Load small sample data for demonstration
        const sampleData = [
                {
                    "School Name": "Manila High School",
                    "Latitude": 14.5995,
                    "Longitude": 120.9842,
                    "Region": "NCR",
                    "Province": "Metro Manila",
                    "Municipality": "Manila",
                    "Connectivity Status": "online",
                    "Connection Type": "Fixed Broadband",
                    "With Internet": 1,
                    "Mobile Data": 0,
                    "No Internet": 0
                },
                {
                    "School Name": "Cebu Central School",
                    "Latitude": 10.3157,
                    "Longitude": 123.8854,
                    "Region": "Region VII",
                    "Province": "Cebu",
                    "Municipality": "Cebu City",
                    "Connectivity Status": "limited",
                    "Connection Type": "Mobile Data",
                    "With Internet": 0,
                    "Mobile Data": 1,
                    "No Internet": 0
                },
                {
                    "School Name": "Davao Elementary",
                    "Latitude": 7.0731,
                    "Longitude": 125.6128,
                    "Region": "Region XI",
                    "Province": "Davao del Sur",
                    "Municipality": "Davao City",
                    "Connectivity Status": "offline",
                    "Connection Type": "",
                    "With Internet": 0,
                    "Mobile Data": 0,
                    "No Internet": 1
                }
            ];

            this.processSchoolData(sampleData);
        });
    }

    async loadDICTMasterlist() {
        try {
            console.log('Attempting to load DICT masterlist...');
            const response = await fetch('./dict_schools_masterlist.csv');
            
            if (!response.ok) {
                console.error('Fetch failed:', response.status, response.statusText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            console.log('CSV loaded, size:', csvText.length, 'characters');
            
            if (csvText.length < 1000) {
                console.error('CSV file seems too small:', csvText.substring(0, 200));
                throw new Error('CSV file appears to be empty or corrupted');
            }
            
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    console.log(`Successfully parsed ${results.data.length} schools from DICT masterlist`);
                    if (results.data.length > 0) {
                        console.log('Sample data:', results.data[0]);
                        this.processSchoolData(results.data);
                    } else {
                        throw new Error('No data found in CSV file');
                    }
                },
                error: (error) => {
                    console.error('Error parsing DICT CSV:', error);
                    throw error;
                }
            });
        } catch (error) {
            console.error('Failed to load DICT masterlist:', error.message);
            console.log('Falling back to sample data...');
            throw error;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SchoolConnectivityMonitor();
});