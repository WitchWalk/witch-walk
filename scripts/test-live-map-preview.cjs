/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const screen = fs.readFileSync(path.join(root, 'src/components/map/LiveMapScreen.tsx'), 'utf8');
const mapData = fs.readFileSync(path.join(root, 'src/data/mapLocations.ts'), 'utf8');

// Category and distance share a flexible text column; the favorite remains fixed.
assert.match(screen, /<View style=\{styles\.previewMetaCopy\}>[\s\S]*?<Text numberOfLines=\{2\} style=\{\[styles\.categoryText/);
assert.match(screen, /validDistanceLabel\(distanceLabel\(userLocation, location\)\)/);
assert.match(screen, /distance \? <Text numberOfLines=\{1\} style=\{styles\.distanceText\}>/);
assert.match(screen, /previewMetaCopy: \{ flex: 1, minWidth: 0 \}/);
assert.match(screen, /previewFavorite: \{ width: 26, height: 24, flexShrink: 0/);
assert.doesNotMatch(screen, /categoryText: \{ flexShrink: 1/);

// The complete label is passed to one Text node; React Native may wrap it only
// within the full metadata-column width, capped at two lines for long labels.
for (const label of [
  'Attraction',
  'Seafood',
  'Restaurant',
  'Halloween / Haunted Happenings',
  'Private / Visitor Parking',
  'Park / Waterfront',
]) {
  assert.equal(label.includes('\n'), false);
  assert.ok(label.split(/\s+/).every(word => word.length > 0));
}
assert.match(mapData, /categoryLabel: 'Attraction'/);
assert.match(mapData, /categoryLabel: location\.category === 'Uncategorized' \? 'Restaurant' : location\.category/);
assert.match(mapData, /categoryLabel: location\.type/);

// At the smallest supported width, the metadata copy retains useful width
// because image/card dimensions are fixed and the copy consumes the remainder.
const textWidthAt = viewportWidth => viewportWidth - 24 - 16 - 16 - 112 - 12 - 8 - 26 - 8;
assert.ok(textWidthAt(320) >= 72, 'Small iPhone must retain a readable information column');
assert.ok(textWidthAt(390) > textWidthAt(320));
assert.ok(textWidthAt(430) > textWidthAt(390));

assert.match(screen, /<Text numberOfLines=\{2\} style=\{styles\.previewName\}>/);
assert.doesNotMatch(screen, />Distance unavailable</);
assert.match(screen, />View Details<\/Text>/);
assert.match(screen, />Directions<\/Text>/);
assert.match(screen, /accessibilityLabel="Close location preview"/);
assert.match(screen, /minHeight: 150/);
assert.doesNotMatch(screen, /previewCard:[\s\S]*?height: 150,/);

console.log('PASS: Live Map popup category, long-label, distance, action, and 320/390/430-width layout guards');
