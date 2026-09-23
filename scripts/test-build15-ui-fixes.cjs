/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

Module._extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } },
).outputText, filename);

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const { getParkingCardLayout } = require('../src/services/parkingCardLayout.ts');
const { distanceMilesLabel, validDistanceLabel } = require('../src/services/displayValues.ts');
const { getAppTextScale, LARGER_TEXT_TARGET_SCALE } = require('../src/services/textSize.ts');

const parkingCard = read('src/components/parking/ParkingCard.tsx');
for (const width of [320, 390, 430]) {
  const layout = getParkingCardLayout(width);
  assert.ok(layout.imageHeight >= 170 && layout.imageHeight <= 200);
  assert.ok(Number.parseInt(layout.imageWidth, 10) >= 35 && Number.parseInt(layout.imageWidth, 10) <= 40);
}
assert.equal(getParkingCardLayout(320).narrow, true);
assert.equal(getParkingCardLayout(390).narrow, false);
assert.equal(getParkingCardLayout(430).narrow, false);
assert.match(parkingCard, /resizeMode="cover"/);
assert.match(parkingCard, /alignItems: 'flex-start'/);
assert.doesNotMatch(parkingCard, /imageFrame: \{[^}]*alignSelf: 'stretch'/);
assert.doesNotMatch(parkingCard, /summaryButton: \{[^}]*minHeight/);
assert.doesNotMatch(parkingCard, /card: \{[\s\S]*?minHeight: 248/);

const attractionDetails = read('src/components/attractions/AttractionDetailsView.tsx');
assert.match(attractionDetails, /const narrowContentCards = width < 390/);
assert.match(attractionDetails, /infoCardsNarrow: \{ flexDirection: 'column' \}/);
assert.match(attractionDetails, /cardHeading: \{ minWidth: 0/);
assert.match(attractionDetails, /cardTitle: \{[\s\S]*?minWidth: 0, flexShrink: 1/);
assert.match(attractionDetails, /adjustsFontSizeToFit minimumFontScale=\{0\.85\} numberOfLines=\{1\} style=\{styles\.cardTitle\}>Visitor Tips/);

assert.equal(validDistanceLabel('0.4 mi'), '0.4 mi');
assert.equal(validDistanceLabel(' Distance unavailable '), null);
assert.equal(validDistanceLabel(''), null);
assert.equal(validDistanceLabel(undefined), null);
assert.equal(validDistanceLabel('Unknown'), null);
assert.equal(validDistanceLabel('-1 mi'), null);
assert.equal(distanceMilesLabel(0.45), '0.5 mi');
assert.equal(distanceMilesLabel(Number.NaN), null);
assert.equal(distanceMilesLabel(undefined), null);

for (const file of [
  'src/components/attractions/AttractionCard.tsx',
  'src/components/restaurants/RestaurantCard.tsx',
  'src/components/restaurants/RestaurantDetailsView.tsx',
  'src/components/parking/ParkingCard.tsx',
  'src/components/bathrooms/BathroomCard.tsx',
  'src/components/bathrooms/RestroomMap.native.tsx',
  'src/components/bathrooms/RestroomMap.web.tsx',
  'src/components/wait-times/WaitTimeCard.tsx',
  'src/components/map/LiveMapScreen.tsx',
]) {
  const source = read(file);
  assert.doesNotMatch(source, />Distance unavailable</);
  assert.doesNotMatch(source, />Dist\.\.\.</);
}

assert.equal(getAppTextScale('default', 1), 1);
assert.equal(getAppTextScale('larger', 1), LARGER_TEXT_TARGET_SCALE);
assert.equal(getAppTextScale('larger', 1.3), 1);
assert.ok(getAppTextScale('larger', 1.1) > 1);

const appText = read('src/components/AppText.tsx');
const settingsProvider = read('src/components/settings/AppSettingsProvider.tsx');
const settingsRepository = read('src/services/appSettingsRepository.ts');
const textSizeScreen = read('app/settings/text-size.tsx');
assert.match(appText, /useAppSettings\(\)/);
assert.match(appText, /PixelRatio\.getFontScale\(\)/);
assert.match(appText, /fontSize: fontSize \* scale/);
assert.match(appText, /lineHeight: lineHeight \* scale/);
assert.match(settingsProvider, /appSettingsRepository\.load\(\)/);
assert.match(settingsProvider, /appSettingsRepository\.save\(next\)/);
assert.match(settingsRepository, /AsyncStorage\.getItem\(storageKey\)/);
assert.match(settingsRepository, /AsyncStorage\.setItem\(storageKey, JSON\.stringify\(settings\)\)/);
assert.match(textSizeScreen, /Use larger readable text throughout BROOMSTICK/);

const runtimeTextFiles = [
  ...fs.readdirSync(path.join(root, 'app'), { recursive: true })
    .filter(file => typeof file === 'string' && file.endsWith('.tsx'))
    .map(file => path.join('app', file)),
  ...fs.readdirSync(path.join(root, 'src/components'), { recursive: true })
    .filter(file => typeof file === 'string' && file.endsWith('.tsx'))
    .map(file => path.join('src/components', file)),
];
for (const file of runtimeTextFiles) {
  const source = read(file);
  if (!source.includes('<Text') || file === 'app/(tabs)/_layout.tsx' || file === 'src/components/AppText.tsx') continue;
  assert.match(source, /AppText as Text/, `${file} must consume the shared text-size system`);
}

console.log('PASS: Build 15 Parking, Visitor Tips, distance suppression, and persisted shared text-size fixes');
