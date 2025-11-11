const fs = require('fs');
const Papa = require('papaparse');

console.log('🔄 Starting CSV merge process...\n');

console.log('📖 Reading old CSV with connectivity data...');
const oldCsv = fs.readFileSync('dict_schools_masterlist_backup_20251111.csv', 'utf8');
const oldData = Papa.parse(oldCsv, { header: true, skipEmptyLines: true }).data;
console.log(`✅ Loaded ${oldData.length} records from old CSV`);

console.log('\n📖 Reading new CSV with updated location data...');
const newCsv = fs.readFileSync('dict_schools_masterlist.csv', 'utf8');
const newData = Papa.parse(newCsv, { header: true, skipEmptyLines: true }).data;
console.log(`✅ Loaded ${newData.length} records from new CSV`);

console.log('\n🗂️  Creating School Name lookup map from old data...');
const oldDataMap = {};
oldData.forEach(school => {
    const schoolName = school['School Name']?.trim().toUpperCase();
    if (schoolName) {
        oldDataMap[schoolName] = {
            connectivityStatus: school['Connectivity Status'] || 'unknown',
            connectionType: school['Connection Type'] || '',
            withInternet: school['With Internet'] || '',
            mobileData: school['Mobile Data'] || '',
            noInternet: school['No Internet'] || '',
            dictFreeWiFi: school['DICT Free WiFi'] || ''
        };
    }
});
console.log(`✅ Created lookup map with ${Object.keys(oldDataMap).length} schools`);

console.log('\n🔗 Merging connectivity data with new location data...');
let matchCount = 0;
let noMatchCount = 0;

const mergedData = newData.map(school => {
    const schoolName = school['School_Name']?.trim().toUpperCase();
    const connectivityData = oldDataMap[schoolName];
    
    if (connectivityData) {
        matchCount++;
        return {
            ...school,
            'Connectivity Status': connectivityData.connectivityStatus,
            'Connection Type': connectivityData.connectionType,
            'With Internet': connectivityData.withInternet,
            'Mobile Data': connectivityData.mobileData,
            'No Internet': connectivityData.noInternet,
            'DICT Free WiFi': connectivityData.dictFreeWiFi
        };
    } else {
        noMatchCount++;
        return {
            ...school,
            'Connectivity Status': 'unknown',
            'Connection Type': '',
            'With Internet': '',
            'Mobile Data': '',
            'No Internet': '',
            'DICT Free WiFi': ''
        };
    }
});

console.log(`✅ Matched: ${matchCount} schools`);
console.log(`⚠️  No match: ${noMatchCount} schools (will show as unknown)`);

console.log('\n💾 Writing merged CSV...');
const mergedCsv = Papa.unparse(mergedData);
fs.writeFileSync('dict_schools_masterlist.csv', mergedCsv);

const stats = fs.statSync('dict_schools_masterlist.csv');
console.log(`✅ Done! File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

console.log('\n📊 Summary:');
console.log(`   Total schools: ${mergedData.length}`);
console.log(`   With connectivity data: ${matchCount} (${((matchCount/mergedData.length)*100).toFixed(1)}%)`);
console.log(`   Without connectivity data: ${noMatchCount} (${((noMatchCount/mergedData.length)*100).toFixed(1)}%)`);
