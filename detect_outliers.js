const fs = require('fs');
const Papa = require('papaparse');

// Philippines boundaries (approximate)
const PHILIPPINES_BOUNDS = {
    // Main archipelago boundaries with some buffer
    minLat: 4.5,   // Southernmost (Tawi-Tawi)
    maxLat: 21.0,  // Northernmost (Batanes)
    minLng: 116.0, // Westernmost (Palawan)
    maxLng: 127.0  // Easternmost (Mindanao)
};

// More restrictive core boundaries
const CORE_PHILIPPINES_BOUNDS = {
    minLat: 5.0,   
    maxLat: 19.0,  
    minLng: 117.0, 
    maxLng: 126.0  
};

function isWithinBounds(lat, lng, bounds) {
    return lat >= bounds.minLat && lat <= bounds.maxLat && 
           lng >= bounds.minLng && lng <= bounds.maxLng;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function analyzeOutliers() {
    console.log('🔍 Analyzing coordinate outliers in Philippines Schools dataset...\n');
    
    // Read the CSV file
    const csvData = fs.readFileSync('dict_schools_masterlist.csv', 'utf8');
    const parsed = Papa.parse(csvData, { header: true });
    const schools = parsed.data;
    
    console.log(`📊 Total schools in dataset: ${schools.length}`);
    
    // Philippines center point for distance calculations
    const philippinesCenter = { lat: 12.8797, lng: 121.7740 };
    
    let outliers = [];
    let suspiciousCoordinates = [];
    let validCoordinates = 0;
    let invalidCoordinates = 0;
    let zeroCoordinates = 0;
    
    // Statistics tracking
    let latStats = { min: Infinity, max: -Infinity, sum: 0, count: 0 };
    let lngStats = { min: Infinity, max: -Infinity, sum: 0, count: 0 };
    
    schools.forEach((school, index) => {
        const lat = parseFloat(school.Latitude);
        const lng = parseFloat(school.Longitude);
        
        // Skip invalid coordinates
        if (isNaN(lat) || isNaN(lng)) {
            invalidCoordinates++;
            return;
        }
        
        // Check for zero coordinates
        if (lat === 0 && lng === 0) {
            zeroCoordinates++;
            return;
        }
        
        validCoordinates++;
        
        // Update statistics
        latStats.min = Math.min(latStats.min, lat);
        latStats.max = Math.max(latStats.max, lat);
        latStats.sum += lat;
        latStats.count++;
        
        lngStats.min = Math.min(lngStats.min, lng);
        lngStats.max = Math.max(lngStats.max, lng);
        lngStats.sum += lng;
        lngStats.count++;
        
        // Calculate distance from Philippines center
        const distanceFromCenter = calculateDistance(lat, lng, philippinesCenter.lat, philippinesCenter.lng);
        
        // Check if outside Philippines boundaries
        const withinLooseBounds = isWithinBounds(lat, lng, PHILIPPINES_BOUNDS);
        const withinCoreBounds = isWithinBounds(lat, lng, CORE_PHILIPPINES_BOUNDS);
        
        const schoolInfo = {
            index: index + 1,
            name: school['School Name'] || 'Unknown',
            latitude: lat,
            longitude: lng,
            region: school.Region || 'Unknown',
            province: school.Province || 'Unknown',
            municipality: school.Municipality || 'Unknown',
            distanceFromCenter: Math.round(distanceFromCenter),
            withinLooseBounds,
            withinCoreBounds
        };
        
        // Classify as outlier if outside loose bounds or extremely far
        if (!withinLooseBounds || distanceFromCenter > 2000) {
            outliers.push(schoolInfo);
        } else if (!withinCoreBounds || distanceFromCenter > 1000) {
            suspiciousCoordinates.push(schoolInfo);
        }
    });
    
    // Calculate averages
    const avgLat = latStats.sum / latStats.count;
    const avgLng = lngStats.sum / lngStats.count;
    
    console.log('\n📍 COORDINATE STATISTICS:');
    console.log(`Valid coordinates: ${validCoordinates}`);
    console.log(`Invalid coordinates: ${invalidCoordinates}`);
    console.log(`Zero coordinates: ${zeroCoordinates}`);
    console.log(`\nLatitude range: ${latStats.min.toFixed(6)} to ${latStats.max.toFixed(6)}`);
    console.log(`Longitude range: ${lngStats.min.toFixed(6)} to ${lngStats.max.toFixed(6)}`);
    console.log(`Center point: ${avgLat.toFixed(4)}, ${avgLng.toFixed(4)}`);
    
    console.log('\n🚨 DEFINITE OUTLIERS (Outside Philippines bounds):');
    console.log(`Found ${outliers.length} schools with coordinates outside Philippines`);
    
    if (outliers.length > 0) {
        console.log('\nTop 10 most extreme outliers:');
        outliers
            .sort((a, b) => b.distanceFromCenter - a.distanceFromCenter)
            .slice(0, 10)
            .forEach(school => {
                console.log(`  ${school.name}`);
                console.log(`    📍 ${school.latitude}, ${school.longitude}`);
                console.log(`    📍 Region: ${school.region}, Province: ${school.province}`);
                console.log(`    📏 ${school.distanceFromCenter}km from PH center`);
                console.log(`    🌍 Row ${school.index} in CSV`);
                console.log('');
            });
    }
    
    console.log('\n⚠️  SUSPICIOUS COORDINATES (Outside core Philippines area):');
    console.log(`Found ${suspiciousCoordinates.length} schools with potentially suspicious coordinates`);
    
    if (suspiciousCoordinates.length > 0 && suspiciousCoordinates.length <= 20) {
        console.log('\nSuspicious coordinates:');
        suspiciousCoordinates
            .sort((a, b) => b.distanceFromCenter - a.distanceFromCenter)
            .slice(0, 10)
            .forEach(school => {
                console.log(`  ${school.name} - ${school.latitude}, ${school.longitude} (${school.distanceFromCenter}km) - ${school.region}`);
            });
    }
    
    // Regional analysis
    console.log('\n🗺️  REGIONAL COORDINATE DISTRIBUTION:');
    const regionStats = {};
    schools.forEach(school => {
        const region = school.Region || 'Unknown';
        if (!regionStats[region]) {
            regionStats[region] = { count: 0, outliers: 0, suspicious: 0 };
        }
        regionStats[region].count++;
        
        const lat = parseFloat(school.Latitude);
        const lng = parseFloat(school.Longitude);
        
        if (!isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)) {
            const withinLoose = isWithinBounds(lat, lng, PHILIPPINES_BOUNDS);
            const withinCore = isWithinBounds(lat, lng, CORE_PHILIPPINES_BOUNDS);
            const distance = calculateDistance(lat, lng, philippinesCenter.lat, philippinesCenter.lng);
            
            if (!withinLoose || distance > 2000) {
                regionStats[region].outliers++;
            } else if (!withinCore || distance > 1000) {
                regionStats[region].suspicious++;
            }
        }
    });
    
    Object.entries(regionStats)
        .filter(([region, stats]) => stats.outliers > 0 || stats.suspicious > 0)
        .sort(([,a], [,b]) => (b.outliers + b.suspicious) - (a.outliers + a.suspicious))
        .forEach(([region, stats]) => {
            console.log(`  ${region}: ${stats.count} schools, ${stats.outliers} outliers, ${stats.suspicious} suspicious`);
        });
    
    console.log('\n✅ ANALYSIS COMPLETE');
    console.log(`\nSummary:`);
    console.log(`• ${validCoordinates} schools have valid coordinates`);
    console.log(`• ${outliers.length} schools (${(outliers.length/validCoordinates*100).toFixed(1)}%) are definite outliers`);
    console.log(`• ${suspiciousCoordinates.length} schools (${(suspiciousCoordinates.length/validCoordinates*100).toFixed(1)}%) have suspicious coordinates`);
    console.log(`• ${invalidCoordinates + zeroCoordinates} schools have invalid/zero coordinates`);
    
    return {
        outliers,
        suspiciousCoordinates,
        statistics: {
            total: schools.length,
            valid: validCoordinates,
            invalid: invalidCoordinates,
            zero: zeroCoordinates,
            latRange: [latStats.min, latStats.max],
            lngRange: [lngStats.min, lngStats.max],
            center: [avgLat, avgLng]
        }
    };
}

// Run the analysis
if (require.main === module) {
    try {
        analyzeOutliers();
    } catch (error) {
        console.error('Error analyzing outliers:', error.message);
    }
}