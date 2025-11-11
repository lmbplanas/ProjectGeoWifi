# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**
```bash
npm run dev
# OR
npm start
# Both run: npx http-server -p 3000
```

**For Python server alternative:**
```bash
python3 server.py  # Runs on port 8001
```

**Build:**
```bash
npm run build  # Static site - no build required
```

## Architecture Overview

This is a static web application for visualizing Philippines school internet connectivity data using interactive maps. The core architecture consists of:

### Main Components

**SchoolConnectivityMonitor Class (`app.js:1-800+`)**
- Central application controller managing all functionality
- Handles data loading, processing, and visualization
- Manages map interactions and UI state
- Key methods:
  - `initMap()`: Leaflet.js map initialization with clustering
  - `processSchoolData()`: CSV/Excel data processing and validation
  - `displaySchools()`: Renders schools on map with clustering
  - `createClusterIcon()`: Custom cluster icons with connectivity pie charts

**Data Flow:**
1. User uploads CSV/Excel file through drag-and-drop interface
2. File processed using Papa Parse (CSV) or XLSX.js (Excel)
3. Data validated and coordinates parsed
4. Schools rendered as clustered markers with connectivity-based colors
5. Real-time statistics updated in sidebar

### Key Data Structures

**School Object Format:**
```javascript
{
  name: "School Name",
  latitude: 12.8797,
  longitude: 121.7740,
  region: "Region VII",
  province: "Cebu",
  municipality: "Cebu City", 
  connectivity: "online|offline|limited"  // Parsed from Excel columns
}
```

**Connectivity Status Mapping:**
- "online" → Green markers/clusters (full internet)
- "offline" → Red markers/clusters (no internet) 
- "limited" → Yellow markers/clusters (mobile/restricted internet)

### Dependencies

- **Leaflet.js**: Interactive mapping and clustering
- **Papa Parse**: CSV file processing
- **XLSX.js**: Excel file processing (handles .xlsx files from DICT)
- **Leaflet.markercluster**: Marker clustering with custom icons

### Data Source

The application expects DICT Philippines school data with these key columns:
- School Name, Latitude, Longitude, Region, Province, Municipality
- Connectivity columns: "With Internet", "Mobile", "Without Internet" (with possible line breaks in headers)

### UI Features

- **Theme Toggle**: Light/dark mode with Filipino-inspired colors
- **Filtering**: By region and connectivity status
- **Cluster Visualization**: Pie chart icons showing connectivity breakdown
- **Real-time Statistics**: Live updating sidebar with connectivity counts
- **File Upload**: Drag-and-drop CSV/Excel support

### Performance Considerations

- Handles 47,973+ school records efficiently
- Uses marker clustering to prevent browser overload
- Debounced filtering and search operations
- Progressive loading with status indicators

### Special Notes

- All coordinate filtering has been removed per user request - displays ALL schools regardless of geographic bounds
- Connectivity status parsing handles Excel columns with line breaks in headers
- Custom cluster icons dynamically generated with SVG pie charts
- Regional boundaries defined for Philippines (including Palawan, Mindanao, Visayas, Luzon)