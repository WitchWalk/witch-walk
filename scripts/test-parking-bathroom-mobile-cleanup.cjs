/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const parkingCard = read('src/components/parking/ParkingCard.tsx');
const parkingDetails = read('src/components/parking/ParkingDetailsView.tsx');
const parkingData = read('src/data/parking.ts');
const parkingRepository = read('src/services/parkingContentRepository.ts');
const parkingCore = read('src/services/parkingContentCore.ts');
const bathroomScreen = read('app/(tabs)/bathrooms.tsx');
const bathroomCard = read('src/components/bathrooms/BathroomCard.tsx');
const bathroomDetails = read('src/components/bathrooms/BathroomDetailsView.tsx');
const restroomMapNative = read('src/components/bathrooms/RestroomMap.native.tsx');
const restroomMapWeb = read('src/components/bathrooms/RestroomMap.web.tsx');
const bathroomData = read('src/data/bathrooms.ts');
const bathroomRepository = read('src/services/bathroomContentRepository.ts');
const favoriteCard = read('src/components/favorites/FavoriteCard.tsx');
const mapData = read('src/data/mapLocations.ts');

const parkingUi = `${parkingCard}\n${parkingDetails}`;
for (const removed of [
  /Walkable to downtown/i,
  /Live availability not available/i,
  /Almost Full/i,
  /estimated spaces/i,
  /occupancy/i,
  /location\.capacity/,
  /capacityLabel/,
  /location\.availability/,
  /walkingDestination/,
  /walkingTime/,
]) {
  assert.doesNotMatch(parkingUi, removed);
}
assert.match(parkingCard, /location\.type/);
assert.match(parkingDetails, /location\.schedule\.summary/);
assert.match(parkingDetails, /location\.rateInformation/);
assert.match(parkingDetails, /location\.evCharging/);
assert.match(parkingDetails, /location\.accessible/);
assert.match(parkingDetails, /location\.overnightAllowed/);
assert.match(parkingDetails, /location\.rvSuitable/);
assert.match(parkingDetails, /location\.motorcycleNotes/);
assert.match(parkingDetails, /getParkingExternalMapUrl\(location, 'directions'\)/);
assert.match(parkingData, /universalParkingImage = require\('\.\.\/\.\.\/Photos\/universal parking photo\.png'\)/);
assert.match(parkingRepository, /mapSupabaseParking\(row, getParkingLocation\(row\.id\), universalParkingImage, new Date\(\), publicImageUrl\)/);
assert.doesNotMatch(`${parkingData}\n${parkingRepository}\n${parkingCore}`, /capacity|capacityLabel/);
assert.match(parkingRepository, /broomstick-location-images/);
assert.equal((parkingData.match(/image: universalParkingImage/g) || []).length, 5);

const bathroomUi = `${bathroomScreen}\n${bathroomCard}\n${bathroomDetails}\n${restroomMapNative}\n${restroomMapWeb}`;
for (const removed of [
  /getBathroomHours/,
  /getBathroomOperatingStatus/,
  /location\.accessible/,
  /location\.accessibilityNotes/,
  /location\.changingTable/,
  /location\.familyRestroom/,
  /location\.advisoryLevel/,
  /location\.advisoryText/,
  /location\.officialUrl/,
  /bathroomAmenityLabel/,
  /Open Now/,
  />Amenities</,
]) {
  assert.doesNotMatch(bathroomUi, removed);
}
assert.match(bathroomCard, /location\.name/);
assert.match(bathroomCard, /location\.address/);
assert.match(bathroomCard, />Directions</);
assert.match(bathroomDetails, /location\.restroomType/);
assert.doesNotMatch(bathroomDetails, /location\.description/);
assert.match(bathroomDetails, /location\.publicAccess === 'Limited \/ Conditional'/);
assert.match(bathroomDetails, /location\.seasonalNotes/);
assert.match(bathroomDetails, /getBathroomExternalMapUrl\(location\)/);
assert.match(restroomMapNative, /location\.address/);
assert.match(restroomMapWeb, /location\.address/);
assert.doesNotMatch(bathroomScreen, /sampleNote/);
assert.match(bathroomData, /universalBathroomImage = require\('\.\.\/\.\.\/Photos\/universal bathroom photo\.png'\)/);
assert.match(bathroomRepository, /mapSupabaseBathroom\(row, getBathroomLocation\(row\.id\), universalBathroomImage, publicImageUrl\)/);
assert.match(bathroomRepository, /broomstick-location-images/);
assert.match(bathroomScreen, /readCurrentForegroundLocation/);
assert.match(bathroomScreen, /sortBathroomsByDistance/);
assert.doesNotMatch(bathroomScreen, /requestCurrentForegroundLocation/);
assert.equal((bathroomData.match(/image: universalBathroomImage/g) || []).length, 11);

assert.match(mapData, /getMappableParking/);
assert.match(mapData, /getMappableBathrooms/);
assert.match(favoriteCard, /source=\{location\.image\}/);
assert.match(favoriteCard, /location\.address/);
assert.match(favoriteCard, /location\.category !== 'bathrooms'/);

console.log('PASS: Parking and Bathroom mobile cleanup, universal artwork, map, directions, and Favorites guards');
