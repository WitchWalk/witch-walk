/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const details = read('src/components/attractions/AttractionDetailsView.tsx');
const repository = read('src/services/attractionContentRepository.ts');
const core = read('src/services/attractionContentCore.ts');

assert.match(repository, /'hours', 'hours_notes', 'visitor_tips', 'image_path'/);
assert.match(core, /description: row\.short_description/);
assert.match(core, /longDescription: row\.full_description/);
assert.match(core, /visitorTips: row\.visitor_tips/);
assert.match(core, /hoursNotes: row\.hours_notes \?\? undefined/);

assert.match(details, /const about = attraction\.longDescription\.trim\(\)/);
assert.match(details, /\{about \|\| visitorTips\.length \? <View style=\{styles\.infoCards\}>/);
assert.match(details, /\{about \? <View style=\{styles\.contentCard\}>/);
assert.match(details, /\{visitorTips\.length \? <View style=\{styles\.contentCard\}>/);
assert.match(details, /const hoursLabel = attraction\.hours\.trim\(\) !== attraction\.statusLabel\.trim\(\)/);
assert.match(details, /\{hoursNotes \? <Text style=\{styles\.hoursNotes\}>/);

assert.match(details, /title="Directions"/);
assert.match(details, /title=\{supportsWaitReporting \? 'Report Wait' : 'Witch Watch'\}/);
assert.match(details, /toggleFavorite\('attractions', attraction\.id\)/);
assert.match(details, /Watch HOUSE ARAUZ Video/);
assert.match(details, /getWaitTimeAggregate\(attraction\.id\)/);

console.log('Attraction Details summary, About, Visitor Tips, hours-note, deduplication, and action compatibility checks passed.');
