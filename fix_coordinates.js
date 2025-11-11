const fs = require('fs');
const Papa = require('papaparse');

console.log('🔧 Starting coordinate fix process...\n');

// Philippines bounds for validation
const PHILIPPINES_BOUNDS = {
    minLat: 4.5,
    maxLat: 21.5,
    minLng: 116.0,
    maxLng: 127.0
};

function isValidPhilippinesCoordinate(lat, lng) {
    return lat >= PHILIPPINES_BOUNDS.minLat && 
           lat <= PHILIPPINES_BOUNDS.maxLat && 
           lng >= PHILIPPINES_BOUNDS.minLng && 
           lng <= PHILIPPINES_BOUNDS.maxLng;
}

function areCoordinatesSwapped(lat, lng) {
    // If current position is invalid but swapped would be valid
    if (!isValidPhilippinesCoordinate(lat, lng) && isValidPhilippinesCoordinate(lng, lat)) {
        return true;
    }
    return false;
}

console.log('📖 Reading merged CSV...');
const csv = fs.readFileSync('dict_schools_masterlist.csv', 'utf8');
const data = Papa.parse(csv, { header: true, skipEmptyLines: true }).data;
console.log(`✅ Loaded ${data.length} records\n`);

let swappedCount = 0;
let invalidCount = 0;
let zeroCount = 0;
let validCount = 0;

console.log('🔄 Processing coordinates...\n');

const fixedData = data.map((school, index) => {
    let lat = parseFloat(school.Latitude);
    let lng = parseFloat(school.Longitude);
    
    // Handle invalid/NaN coordinates
    if (isNaN(lat) || isNaN(lng)) {
        invalidCount++;
        if (invalidCount <= 3) {
            console.log(`⚠️  Invalid coords: ${school.School_Name} - setting to null`);
        }
        return {
            ...school,
            Latitude: '',
            Longitude: '',
            __INVALID: 'NaN coordinates'
        };
    }
    
    // Handle zero coordinates
    if (lat === 0 || lng === 0) {
        zeroCount++;
        if (zeroCount <= 3) {
            console.log(`⚠️  Zero coords: ${school.School_Name} - setting to null`);
        }
        return {
            ...school,
            Latitude: '',
            Longitude: '',
            __INVALID: 'Zero coordinates'
        };
    }
    
    // Check if coordinates are swapped
    if (areCoordinatesSwapped(lat, lng)) {
        swappedCount++;
        if (swappedCount <= 5) {
            console.log(`🔄 Swapping: ${school.School_Name}`);
            console.log(`   Before: Lat ${lat}, Lng ${lng}`);
            console.log(`   After:  Lat ${lng}, Lng ${lat}`);
        }
        // Swap them
        return {
            ...school,
            Latitude: lng.toString(),
            Longitude: lat.toString(),
            __FIXED: 'Swapped coordinates'
        };
    }
    
    // Check if still outside bounds after swap check
    if (!isValidPhilippinesCoordinate(lat, lng)) {
        invalidCount++;
        if (invalidCount <= 3) {
            console.log(`🚫 Out of bounds: ${school.School_Name} (${lat}, ${lng}) - setting to null`);
        }
        return {
            ...school,
            Latitude: '',
            Longitude: '',
            __INVALID: 'Out of Philippines bounds'
        };
    }
    
    // Valid coordinates
    validCount++;
    return school;
});

console.log('\n📊 SUMMARY:');
console.log(`   ✅ Valid coordinates: ${validCount} (${(validCount/data.length*100).toFixed(1)}%)`);
console.log(`   🔄 Swapped coordinates: ${swappedCount}`);
console.log(`   ⚠️  Zero coordinates: ${zeroCount}`);
console.log(`   🚫 Invalid/Out of bounds: ${invalidCount}`);

console.log('\n💾 Writing fixed CSV...');
const fixedCsv = Papa.unparse(fixedData);
fs.writeFileSync('dict_schools_masterlist.csv', fixedCsv);

const stats = fs.statSync('dict_schools_masterlist.csv');
console.log(`✅ Done! File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

console.log('\n🔍 Validating fixed data...');
const validationData = Papa.parse(fixedCsv, { header: true, skipEmptyLines: true }).data;
let finalValid = 0;
let finalInvalid = 0;

validationData.forEach(s => {
    const lat = parseFloat(s.Latitude);
    const lng = parseFloat(s.Longitude);
    
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
        finalInvalid++;
    } else if (isValidPhilippinesCoordinate(lat, lng)) {
        finalValid++;
    } else {
        finalInvalid++;
    }
});

console.log(`✅ Final valid coordinates: ${finalValid} (${(finalValid/validationData.length*100).toFixed(1)}%)`);
console.log(`❌ Final invalid/empty: ${finalInvalid} (${(finalInvalid/validationData.length*100).toFixed(1)}%)`);
