class SchoolConnectivityMonitor {
    constructor() {
        this.map = null;
        this.markers = null;
        this.schools = [];
        this.filteredSchools = [];
        this.init();
    }

    init() {
        console.log('Initializing app...');
        this.updateStatus('Initializing map...');
        this.initMap();
        this.setupEventListeners();
        this.loadSampleData();
        
        // Hide loading screen after initialization
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
            this.updateStatus('Ready - Upload CSV for all 47,973 schools');
            const statusDot = document.getElementById('statusDot');
            if (statusDot) {
                statusDot.classList.remove('loading');
                statusDot.classList.add('online');
            }
        }, 800);
        
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

            // Initialize marker cluster group with custom clustering
            this.markers = L.markerClusterGroup({
                chunkedLoading: true,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: true,
                zoomToBoundsOnClick: true,
                maxClusterRadius: 60,
                disableClusteringAtZoom: 15,
                iconCreateFunction: this.createClusterIcon.bind(this)
            });

            // Add cluster event listeners for tooltips
            this.markers.on('clustermouseover', (e) => {
                const cluster = e.layer;
                const data = cluster.options.icon.connectivityData;
                if (data) {
                    const tooltipContent = `
                        <div style="text-align: center; font-weight: bold;">
                            ${data.total} Schools
                        </div>
                        <div style="margin-top: 4px;">
                            <span style="color: #28a745;">●</span> Online: ${data.online} (${data.onlinePercent}%)
                        </div>
                        <div>
                            <span style="color: #ffc107;">●</span> Limited: ${data.limited} (${data.limitedPercent}%)
                        </div>
                        <div>
                            <span style="color: #dc3545;">●</span> Offline: ${data.offline} (${data.offlinePercent}%)
                        </div>
                    `;
                    
                    cluster.bindTooltip(tooltipContent, {
                        permanent: false,
                        direction: 'top',
                        offset: [0, -10],
                        className: 'cluster-tooltip'
                    }).openTooltip();
                }
            });

            this.markers.on('clustermouseout', (e) => {
                e.layer.closeTooltip();
            });

            this.map.addLayer(this.markers);
            console.log('Map initialization complete');
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    updateStatus(message) {
        const statusElement = document.getElementById('dataStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log('Status:', message);
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Theme toggle handler
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const body = document.body;
                const currentTheme = body.getAttribute('data-theme');
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                body.setAttribute('data-theme', newTheme);
                
                // Update icon
                const icon = document.getElementById('themeIcon');
                if (icon) {
                    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                }
                
                // Save preference
                localStorage.setItem('theme', newTheme);
            });
            
            // Load saved theme preference
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.body.setAttribute('data-theme', savedTheme);
            const icon = document.getElementById('themeIcon');
            if (icon) {
                icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
        
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

        // View toggle handler
        const viewToggle = document.getElementById('viewToggle');
        if (viewToggle) {
            viewToggle.addEventListener('click', () => {
                viewToggle.classList.toggle('active');
                // Toggle between cluster and heatmap view
                const isHeatmap = viewToggle.classList.contains('active');
                viewToggle.querySelector('span').textContent = isHeatmap ? 'Heatmap View' : 'Cluster View';
                
                // Update legend visibility
                document.getElementById('clusterLegend').style.display = isHeatmap ? 'none' : 'block';
                document.getElementById('heatmapLegend').style.display = isHeatmap ? 'block' : 'none';
            });
        }

        console.log('Event listeners set up');
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
            const connectivity = marker.options.schoolData?.connectivity || 'unknown';
            counts[connectivity]++;
        });
        
        // Calculate percentages
        const onlinePercent = (counts.online / total) * 100;
        const offlinePercent = (counts.offline / total) * 100;
        const limitedPercent = (counts.limited / total) * 100;
        
        // Determine cluster size
        let size = 'small';
        let iconSize = 40;
        if (total >= 100) {
            size = 'large';
            iconSize = 55;
        } else if (total >= 20) {
            size = 'medium';
            iconSize = 47;
        }
        
        // Create different visualizations based on connectivity mix
        let html;
        const hasMultipleTypes = (onlinePercent > 0 && offlinePercent > 0) || 
                                (onlinePercent > 0 && limitedPercent > 0) || 
                                (offlinePercent > 0 && limitedPercent > 0);
        
        if (hasMultipleTypes && total >= 5) {
            // Create pie chart for mixed connectivity
            const onlineAngle = (onlinePercent / 100) * 360;
            const limitedAngle = (limitedPercent / 100) * 360;
            const offlineAngle = (offlinePercent / 100) * 360;
            
            html = `
                <div style="
                    width: ${iconSize}px; 
                    height: ${iconSize}px; 
                    border-radius: 50%; 
                    border: 3px solid white;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                    position: relative;
                    background: conic-gradient(
                        #28a745 0deg ${onlineAngle}deg,
                        #ffc107 ${onlineAngle}deg ${onlineAngle + limitedAngle}deg,
                        #dc3545 ${onlineAngle + limitedAngle}deg 360deg
                    );
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                ">
                    <div style="
                        background: rgba(255,255,255,0.95);
                        border-radius: 50%;
                        width: ${iconSize - 16}px;
                        height: ${iconSize - 16}px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: ${iconSize < 47 ? '11px' : '13px'};
                        color: #333;
                    ">${total}</div>
                </div>
            `;
        } else {
            // Single color cluster for dominant connectivity
            let dominantColor = '#6c757d';
            if (onlinePercent >= 60) {
                dominantColor = '#28a745';
            } else if (offlinePercent >= 60) {
                dominantColor = '#dc3545';
            } else if (limitedPercent >= 60) {
                dominantColor = '#ffc107';
            } else if (onlinePercent > offlinePercent && onlinePercent > limitedPercent) {
                dominantColor = '#5cb85c';
            } else if (offlinePercent > onlinePercent && offlinePercent > limitedPercent) {
                dominantColor = '#d9534f';
            } else {
                dominantColor = '#f0ad4e';
            }
            
            html = `
                <div style="
                    width: ${iconSize}px; 
                    height: ${iconSize}px; 
                    border-radius: 50%; 
                    background-color: ${dominantColor};
                    border: 3px solid white;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: ${iconSize < 47 ? '12px' : '14px'};
                    color: white;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
                    cursor: pointer;
                ">${total}</div>
            `;
        }
        
        const icon = L.divIcon({
            html: html,
            className: `custom-cluster-icon cluster-${size}`,
            iconSize: [iconSize, iconSize],
            iconAnchor: [iconSize/2, iconSize/2]
        });
        
        // Store connectivity info for tooltip
        icon.connectivityData = {
            total,
            online: counts.online,
            limited: counts.limited,
            offline: counts.offline,
            onlinePercent: onlinePercent.toFixed(1),
            limitedPercent: limitedPercent.toFixed(1),
            offlinePercent: offlinePercent.toFixed(1)
        };
        
        return icon;
    }

    loadSampleData() {
        console.log('Loading sample data...');
        
        // Update status
        document.getElementById('dataStatus').textContent = 'Loading sample data - Upload CSV for all 47,973 schools';
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
        
        // Debug: log first few records to see the actual data structure
        if (data.length > 0) {
            console.log('Sample record:', data[0]);
            console.log('Available columns:', Object.keys(data[0]));
        }
        
        this.schools = data.map((school, index) => {
            try {
                const normalizedSchool = {
                    name: school['School Name'] || school.name || 'Unknown School',
                    latitude: parseFloat(school['Latitude'] || school.latitude || 0),
                    longitude: parseFloat(school['Longitude'] || school.longitude || 0),
                    region: school['Region'] || school.region || 'Unknown Region',
                    province: school['Province'] || school.province || 'Unknown Province',
                    city: school['Municipality'] || school.municipality || school.city || 'Unknown City',
                    connectivity: this.normalizeConnectivityStatus(school['Connectivity Status'] || school.connectivity || 'unknown')
                };

                // Debug: log problematic records
                if (index < 5) {
                    console.log(`Record ${index}:`, {
                        name: normalizedSchool.name,
                        lat: normalizedSchool.latitude,
                        lng: normalizedSchool.longitude,
                        connectivity: normalizedSchool.connectivity,
                        rawLat: school['Latitude'],
                        rawLng: school['Longitude'],
                        rawConnectivity: school['Connectivity Status']
                    });
                }

                return {
                    ...normalizedSchool,
                    id: Math.random().toString(36).substr(2, 9)
                };
            } catch (error) {
                console.error('Error processing school record:', index, error, school);
                return null;
            }
        }).filter(school => {
            if (!school) return false;
            
            const hasValidCoords = school.latitude !== 0 && 
                                 school.longitude !== 0 && 
                                 !isNaN(school.latitude) && 
                                 !isNaN(school.longitude);
            
            // Only filter out completely invalid coordinates
            if (!hasValidCoords) {
                if (school.name !== 'Unknown School') {
                    console.log('Filtered out school with invalid coords:', school.name, school.latitude, school.longitude);
                }
                return false;
            }
            
            // Accept all schools with valid coordinates
            // They might be in remote islands or have slightly off coordinates
            return true;
        });

        const filteredOut = data.length - this.schools.length;
        console.log(`✅ Processed ${this.schools.length} schools with valid coordinates out of ${data.length} total records`);
        console.log(`🚫 Filtered out ${filteredOut} schools (${((filteredOut/data.length)*100).toFixed(1)}%)`);
        
        // Log coordinate bounds of accepted schools
        if (this.schools.length > 0) {
            const bounds = this.calculateBounds();
            console.log('📍 Accepted schools bounds:', {
                minLat: bounds.minLat.toFixed(4),
                maxLat: bounds.maxLat.toFixed(4), 
                minLng: bounds.minLng.toFixed(4),
                maxLng: bounds.maxLng.toFixed(4)
            });
        }
        
        // Reset filtered schools when new data is loaded
        this.filteredSchools = [];
        
        // Update status
        const statusElement = document.getElementById('dataStatus');
        if (this.schools.length > 1000) {
            statusElement.textContent = `Loaded ${this.schools.length.toLocaleString()} schools`;
            statusElement.style.color = '#28a745';
        } else if (this.schools.length > 0) {
            statusElement.textContent = `Loaded ${this.schools.length} schools`;
            statusElement.style.color = '#28a745';
        } else {
            statusElement.textContent = `Error: No valid schools found in data`;
            statusElement.style.color = '#dc3545';
        }
        
        this.updateRegionFilter();
        this.displaySchools();
        this.updateStatistics();
        
        // Auto-fit map bounds to show all schools
        if (this.schools.length > 0) {
            this.fitMapToSchools();
        }
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

    isWithinPhilippinesBounds(lat, lng) {
        // Convert to numbers for safety
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        // Check for obviously invalid coordinates
        if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
            return false;
        }
        
        // Broad Philippines bounds (more restrictive)
        const roughBounds = latitude >= 4.0 && latitude <= 21.2 &&
                           longitude >= 116.0 && longitude <= 126.8;
        
        if (!roughBounds) {
            return false;
        }
        
        // More precise regional validation
        // Northern Philippines (Luzon + Batanes)
        if (latitude >= 18.0 && latitude <= 21.2) {
            return longitude >= 120.0 && longitude <= 122.2;
        }
        
        // Central Luzon
        if (latitude >= 14.0 && latitude <= 18.0) {
            return longitude >= 119.5 && longitude <= 122.5;
        }
        
        // Southern Luzon and Northern Visayas
        if (latitude >= 10.0 && latitude <= 14.0) {
            return longitude >= 118.0 && longitude <= 126.0;
        }
        
        // Visayas region
        if (latitude >= 8.0 && latitude <= 12.0) {
            return longitude >= 121.0 && longitude <= 126.8;
        }
        
        // Mindanao
        if (latitude >= 4.0 && latitude <= 10.0) {
            return longitude >= 116.0 && longitude <= 126.8;
        }
        
        // Palawan (special case - extends westward)
        if (latitude >= 7.0 && latitude <= 12.0 && longitude >= 116.0 && longitude <= 119.5) {
            return true;
        }
        
        return false;
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
        console.log('displaySchools called');
        const schoolsToDisplay = this.filteredSchools.length > 0 ? this.filteredSchools : this.schools;
        console.log('Schools to display:', schoolsToDisplay.length);
        
        if (!this.markers) {
            console.error('Markers cluster group not initialized!');
            return;
        }
        
        // Clear existing markers
        this.markers.clearLayers();
        console.log('Cleared existing markers');

        let addedMarkers = 0;
        schoolsToDisplay.forEach((school, index) => {
            try {
                const marker = this.createSchoolMarker(school);
                this.markers.addLayer(marker);
                addedMarkers++;
                
                if (index < 5) {
                    console.log(`Added marker ${index} for:`, school.name, 'at', school.latitude, school.longitude);
                }
            } catch (error) {
                console.error('Error creating marker for school:', school.name, error);
            }
        });
        
        console.log(`Successfully added ${addedMarkers} markers to map out of ${schoolsToDisplay.length} schools`);
    }

    createSchoolMarker(school) {
        const color = this.getConnectivityColor(school.connectivity);
        
        // Create enhanced marker icon
        const markerIcon = L.divIcon({
            className: 'custom-school-marker',
            html: `
                <div class="marker-container">
                    <div class="marker-pulse" style="background-color: ${color}40;"></div>
                    <div class="marker-dot" style="background-color: ${color};"></div>
                </div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        
        const marker = L.marker([school.latitude, school.longitude], { 
            icon: markerIcon,
            schoolData: school  // Store school data for cluster analysis
        });
        
        const popupContent = `
            <div style="min-width: 250px;">
                <h4 style="margin: 0 0 10px 0; color: #1e3c72;">${school.name}</h4>
                <p><strong>Region:</strong> ${school.region}</p>
                <p><strong>Province:</strong> ${school.province}</p>
                <p><strong>City:</strong> ${school.city}</p>
                <p><strong>Status:</strong> <span style="color: ${color}; font-weight: bold; text-transform: uppercase;">${school.connectivity}</span></p>
                <p><strong>Coordinates:</strong> ${school.latitude.toFixed(4)}, ${school.longitude.toFixed(4)}</p>
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
        console.log('updateStatistics called');
        console.log('this.schools.length:', this.schools.length);
        console.log('this.filteredSchools.length:', this.filteredSchools.length);
        
        const schoolsToCount = this.filteredSchools.length > 0 ? this.filteredSchools : this.schools;
        
        console.log('Schools to count:', schoolsToCount.length);
        
        const total = schoolsToCount.length;
        const online = schoolsToCount.filter(school => school.connectivity === 'online').length;
        const offline = schoolsToCount.filter(school => school.connectivity === 'offline').length;
        const limited = schoolsToCount.filter(school => school.connectivity === 'limited').length;

        console.log('Calculated stats - Total:', total, 'Online:', online, 'Offline:', offline, 'Limited:', limited);

        // Make sure elements exist before updating
        const totalElement = document.getElementById('totalSchools');
        const onlineElement = document.getElementById('onlineSchools');
        const offlineElement = document.getElementById('offlineSchools');
        const limitedElement = document.getElementById('limitedSchools');

        if (totalElement) totalElement.textContent = total;
        if (onlineElement) onlineElement.textContent = online;
        if (offlineElement) offlineElement.textContent = offline;
        if (limitedElement) limitedElement.textContent = limited;
        
        console.log('Statistics elements updated');
    }

    calculateBounds() {
        if (this.schools.length === 0) return null;
        
        let minLat = this.schools[0].latitude;
        let maxLat = this.schools[0].latitude;
        let minLng = this.schools[0].longitude;
        let maxLng = this.schools[0].longitude;
        
        this.schools.forEach(school => {
            minLat = Math.min(minLat, school.latitude);
            maxLat = Math.max(maxLat, school.latitude);
            minLng = Math.min(minLng, school.longitude);
            maxLng = Math.max(maxLng, school.longitude);
        });
        
        return { minLat, maxLat, minLng, maxLng };
    }

    fitMapToSchools() {
        if (this.schools.length === 0) return;
        
        try {
            const bounds = this.calculateBounds();
            if (!bounds) return;
            
            console.log('🗺️ Fitting map to school bounds:', {
                minLat: bounds.minLat.toFixed(4),
                maxLat: bounds.maxLat.toFixed(4),
                minLng: bounds.minLng.toFixed(4),
                maxLng: bounds.maxLng.toFixed(4),
                latSpan: (bounds.maxLat - bounds.minLat).toFixed(4),
                lngSpan: (bounds.maxLng - bounds.minLng).toFixed(4)
            });
            
            // Constrain bounds to Philippines limits to prevent showing empty areas
            const constrainedBounds = {
                minLat: Math.max(bounds.minLat - 0.3, 4.0),
                maxLat: Math.min(bounds.maxLat + 0.3, 21.2),
                minLng: Math.max(bounds.minLng - 0.5, 116.0),
                maxLng: Math.min(bounds.maxLng + 0.5, 126.8)
            };
            
            // Create bounds with constrained padding
            const leafletBounds = L.latLngBounds(
                [constrainedBounds.minLat, constrainedBounds.minLng],  // Southwest
                [constrainedBounds.maxLat, constrainedBounds.maxLng]   // Northeast
            );
            
            // Fit the map to these bounds
            this.map.fitBounds(leafletBounds, {
                padding: [20, 20],  // Add padding around edges
                maxZoom: 7          // Don't zoom in too much
            });
            
            console.log('✅ Map fitted to constrained Philippines bounds');
            
        } catch (error) {
            console.error('❌ Error fitting map bounds:', error);
            // Fallback to Philippines center if bounds calculation fails
            this.map.setView([12.8797, 121.7740], 6);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    try {
        new SchoolConnectivityMonitor();
        
        // Fallback to ensure loading screen is removed
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen && loadingScreen.style.display !== 'none') {
                console.warn('Force removing loading screen');
                loadingScreen.style.display = 'none';
            }
        }, 3000);
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // Hide loading screen on error
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
});