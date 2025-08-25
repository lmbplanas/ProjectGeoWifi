# Philippines Schools Internet Connectivity Monitor

A visual web application for monitoring internet connectivity across 47,000+ schools in the Philippines using official DepEd-DICT data.

## 📊 Features

### Visual Cluster Mapping
- **Smart Clustering**: Connectivity-based cluster colors and pie charts
- **Heat Map View**: Toggle to density visualization mode
- **Interactive Clusters**: Hover for connectivity breakdowns
- **Performance Optimized**: Handles 46,983+ schools smoothly

### Data Insights
- **Real-Time Statistics**: Live connectivity counts and percentages
- **Regional Filtering**: Filter by 18 Philippine regions
- **Status Filtering**: View online, offline, or limited connectivity schools
- **Detailed Information**: Click schools for comprehensive details

### Connectivity Status Breakdown
- 🟢 **Online (71.4%)**: 33,546 schools with internet connectivity
- 🔴 **Offline (21.5%)**: 10,116 schools without internet
- 🟡 **Limited (7.1%)**: 3,321 schools with mobile/limited connectivity

## 📁 Files

- `index.html` - Main web application
- `app.js` - Core functionality and visualization
- `styles.css` - Visual styling and responsive design
- `dict_schools_masterlist.csv` - Processed DICT data (46,983 schools)
- `server.py` - Local web server
- `Final_Masterlist_updated_11Aug2025_tobeshared_withDICT.xlsx` - Original DICT Excel file

## 🎯 Usage Tips

### Cluster View (Default)
- **Zoom in/out** to see different clustering levels
- **Hover clusters** to see connectivity breakdown tooltips
- **Click clusters** to zoom into the area
- **Individual schools** appear at high zoom levels with pulsing markers

### Heat Map View
- **Toggle checkbox** in header to switch to density view
- **Circle size** indicates number of schools in area
- **Circle color** shows dominant connectivity type
- **Click circles** for area breakdown

### Filtering
- **Region Filter**: Focus on specific regions (NCR, CAR, Regions I-XII, etc.)
- **Connectivity Filter**: Show only online, offline, or limited connectivity schools
- **Combined Filters**: Use both filters together for targeted analysis

## 📈 Data Source

**DICT Final Masterlist (August 2025)**
- Total schools: 46,983 with valid coordinates
- Data includes: School details, connectivity status, enrollment, electricity, location
- Covers all 18 regions of the Philippines including BARMM

## 🛠️ Technical Details

- **Frontend**: Pure HTML/CSS/JavaScript with Leaflet.js mapping
- **Data Processing**: Papa Parse for CSV handling, XLSX for Excel files
- **Visualization**: Custom clustering algorithm with connectivity awareness
- **Performance**: Optimized for large datasets with efficient rendering

## 🎨 Visual Legend

### Cluster Colors
- 🟢 **Green**: Predominantly online areas (>60% connected)
- 🔴 **Red**: Predominantly offline areas (>60% disconnected)  
- 🟡 **Yellow**: Areas with significant limited connectivity (>30%)
- **Mixed Colors**: Pie chart visualization for balanced areas

### Individual Markers
- Pulsing animation indicates connectivity status
- Click for detailed school information
- Color-coded by connectivity type

---

**Ready to explore Philippines school connectivity?** Start the server and upload the CSV file to see all 46,983 schools visualized on the interactive map!
