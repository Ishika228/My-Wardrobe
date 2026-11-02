/**
 * test_recommender.js
 * Comprehensive unit and integration test suite for the WardrobeWise Recommendation Engine.
 * Formally validates:
 * 1. Color harmony scoring and clashing penalties
 * 2. Scenario 1: College / Summer (White shirt, blue jeans, white sneakers)
 * 3. Scenario 2: Office / Winter (Formal shirt, trousers, black shoes, jacket)
 * 4. Scenario 3: Party / Winter (Party-appropriate clothing)
 * 5. Scenario 4: Casual outing / Monsoon (Limited monsoon clothing)
 * 6. Scenario 5: Insufficient wardrobe items (Strictly verifies no invented items)
 * 7. Unused clothing revival recommendations
 * 8. Recommender Error Handling (Null wardrobe, empty array, invalid context)
 */

const path = require('path');
const fs = require('fs');
const { recommendOutfits, recommendUnusedItemOutfits } = require('../recommender/recommender');
const { evaluateColorPair } = require('../recommender/colorRules');

// Load full sample wardrobe
const sampleWardrobePath = path.join(__dirname, '../sample_data/sample_wardrobe.json');
const sampleWardrobe = JSON.parse(fs.readFileSync(sampleWardrobePath, 'utf8'));

console.log('================================================================');
console.log('TEST SUITE: WardrobeWise Recommendation Engine & Scenario Tests');
console.log('================================================================\n');

// -------------------------------------------------------------
// Test 1: Color Compatibility Rules & Clashing
// -------------------------------------------------------------
console.log('--> TEST 1: Color Compatibility & Clashing Prevention Rules');
const pair1 = evaluateColorPair('Navy Blue', 'Beige');
console.log(`  Navy Blue + Beige: ${pair1.score} pts - ${pair1.reason}`);
if (pair1.score < 85) throw new Error('Navy Blue + Beige should score high.');

const pair2 = evaluateColorPair('White', 'Black');
console.log(`  White + Black:     ${pair2.score} pts - ${pair2.reason}`);
if (pair2.score < 90) throw new Error('White + Black should be top tier.');

const pair3 = evaluateColorPair('Red', 'Green');
console.log(`  Red + Green:       ${pair3.score} pts - ${pair3.reason} (isClashing: ${pair3.isClashing})`);
if (!pair3.isClashing) throw new Error('Red + Green must be flagged as clashing.');
console.log('  [PASS] Test 1: Color rules and clashing detection verified.\n');

// -------------------------------------------------------------
// Test 2: Scenario 1 - College / Summer
// -------------------------------------------------------------
console.log('--> TEST 2: Scenario 1 (College, Summer)');
const wardrobeS1 = [
  { item_id: 's1_shirt', name: 'White Linen Shirt', category: 'Shirt', colour: { dominant: 'White' }, seasons: ['Summer', 'Spring'], occasions: ['College', 'Casual outing'] },
  { item_id: 's1_jeans', name: 'Blue Denim Jeans', category: 'Jeans', colour: { dominant: 'Navy Blue' }, seasons: ['Summer', 'Spring', 'Winter'], occasions: ['College', 'Casual outing'] },
  { item_id: 's1_shoes', name: 'White Minimalist Sneakers', category: 'Sneakers', colour: { dominant: 'White' }, seasons: ['Summer', 'Spring'], occasions: ['College', 'Casual outing'] }
];

const resS1 = recommendOutfits(wardrobeS1, { occasion: 'College', season: 'Summer' });
console.log(`  Status: ${resS1.status} | Outfits returned: ${resS1.returned_count}`);
if (resS1.status !== 'success' || resS1.returned_count === 0) throw new Error('Scenario 1 should return an outfit.');
const outfit1 = resS1.recommended_outfits[0];
console.log(`  Selected items: ${outfit1.items.map(i => i.name).join(' + ')}`);
console.log(`  Recommendation Score: ${outfit1.recommendation_score} / 100`);
console.log(`  Explanation: ${outfit1.explanation}`);
if (outfit1.items.length !== 3) throw new Error('Must consist of exactly the 3 supplied items.');
if (!outfit1.explanation.includes('College') || !outfit1.explanation.includes('Summer')) {
  throw new Error('Explanation must reference requested occasion and season.');
}
console.log('  [PASS] Test 2: Scenario 1 passed with proper score & explanation.\n');

// -------------------------------------------------------------
// Test 3: Scenario 2 - Office / Winter
// -------------------------------------------------------------
console.log('--> TEST 3: Scenario 2 (Office, Winter)');
const wardrobeS2 = [
  { item_id: 's2_shirt', name: 'Classic Formal White Shirt', category: 'Shirt', colour: { dominant: 'White' }, seasons: ['Winter', 'Summer'], occasions: ['Office', 'Formal event'] },
  { item_id: 's2_trousers', name: 'Black Tailored Trousers', category: 'Trousers', colour: { dominant: 'Black' }, seasons: ['Winter', 'Summer'], occasions: ['Office', 'Formal event'] },
  { item_id: 's2_jacket', name: 'Charcoal Tailored Suit Jacket', category: 'Jacket', colour: { dominant: 'Grey' }, seasons: ['Winter'], occasions: ['Office', 'Formal event'] },
  { item_id: 's2_shoes', name: 'Black Oxford Shoes', category: 'Shoes', colour: { dominant: 'Black' }, seasons: ['Winter', 'Summer'], occasions: ['Office', 'Formal event'] }
];

const resS2 = recommendOutfits(wardrobeS2, { occasion: 'Office', season: 'Winter' });
console.log(`  Status: ${resS2.status} | Outfits returned: ${resS2.returned_count}`);
if (resS2.status !== 'success' || resS2.returned_count === 0) throw new Error('Scenario 2 should succeed.');
const outfit2 = resS2.recommended_outfits[0];
console.log(`  Layered Outfit: ${outfit2.items.map(i => `${i.name} (${i.category})`).join(' + ')}`);
console.log(`  Score: ${outfit2.recommendation_score} / 100`);
console.log(`  Explanation: ${outfit2.explanation}`);
if (outfit2.type !== 'layered') throw new Error('Winter outfit with jacket should be layered template.');
console.log('  [PASS] Test 3: Scenario 2 (Office Winter layered outfit) passed.\n');

// -------------------------------------------------------------
// Test 4: Scenario 3 - Party / Winter
// -------------------------------------------------------------
console.log('--> TEST 4: Scenario 3 (Party, Winter)');
const wardrobeS3 = [
  { item_id: 's3_dress', name: 'Emerald Green Silk Evening Dress', category: 'Dress', colour: { dominant: 'Emerald Green' }, seasons: ['Winter', 'Summer'], occasions: ['Party', 'Formal event'] },
  { item_id: 's3_boots', name: 'Black Leather Chelsea Boots', category: 'Boots', colour: { dominant: 'Black' }, seasons: ['Winter'], occasions: ['Party', 'Casual outing'] },
  { item_id: 's3_jacket', name: 'Charcoal Tailored Jacket', category: 'Jacket', colour: { dominant: 'Grey' }, seasons: ['Winter'], occasions: ['Party', 'Office'] }
];

const resS3 = recommendOutfits(wardrobeS3, { occasion: 'Party', season: 'Winter' });
console.log(`  Status: ${resS3.status} | Outfits returned: ${resS3.returned_count}`);
if (resS3.status !== 'success' || resS3.returned_count === 0) throw new Error('Scenario 3 should succeed.');
const outfit3 = resS3.recommended_outfits[0];
console.log(`  Party Outfit: ${outfit3.items.map(i => i.name).join(' + ')}`);
console.log(`  Explanation: ${outfit3.explanation}`);
console.log('  [PASS] Test 4: Scenario 3 passed.\n');

// -------------------------------------------------------------
// Test 5: Scenario 4 - Casual Outing / Monsoon
// -------------------------------------------------------------
console.log('--> TEST 5: Scenario 4 (Casual outing, Monsoon)');
const wardrobeS4 = [
  { item_id: 's4_tee', name: 'Navy Blue Striped Crewneck T-Shirt', category: 'T-shirt', colour: { dominant: 'Navy Blue' }, seasons: ['Monsoon', 'Summer'], occasions: ['Casual outing'] },
  { item_id: 's4_jeans', name: 'Dark Indigo Denim Jeans', category: 'Jeans', colour: { dominant: 'Blue' }, seasons: ['Monsoon', 'Summer', 'Winter'], occasions: ['Casual outing'] },
  { item_id: 's4_boots', name: 'Black Chelsea Rain Boots', category: 'Boots', colour: { dominant: 'Black' }, seasons: ['Monsoon', 'Winter'], occasions: ['Casual outing'] }
];

const resS4 = recommendOutfits(wardrobeS4, { occasion: 'Casual outing', season: 'Monsoon' });
console.log(`  Status: ${resS4.status} | Outfits returned: ${resS4.returned_count}`);
if (resS4.status !== 'success' || resS4.returned_count === 0) throw new Error('Scenario 4 should succeed.');
const outfit4 = resS4.recommended_outfits[0];
console.log(`  Monsoon Casual Outfit: ${outfit4.items.map(i => i.name).join(' + ')}`);
console.log(`  Explanation: ${outfit4.explanation}`);
console.log('  [PASS] Test 5: Scenario 4 passed.\n');

// -------------------------------------------------------------
// Test 6: Scenario 5 - Insufficient Wardrobe Items (No Invented Items)
// -------------------------------------------------------------
console.log('--> TEST 6: Scenario 5 (Insufficient Wardrobe Items)');
// Only top and bottom provided, missing footwear
const wardrobeS5 = [
  { item_id: 's5_shirt', name: 'White Linen Shirt', category: 'Shirt', seasons: ['Summer'], occasions: ['Casual outing'] },
  { item_id: 's5_shorts', name: 'Olive Green Shorts', category: 'Shorts', seasons: ['Summer'], occasions: ['Casual outing'] }
];

const resS5 = recommendOutfits(wardrobeS5, { occasion: 'Casual outing', season: 'Summer' });
console.log(`  Status: ${resS5.status}`);
console.log(`  Diagnostic Message: ${resS5.message}`);
console.log(`  Missing items diagnosed: ${resS5.diagnostics.available_counts.footwear === 0 ? 'Footwear missing' : 'None'}`);
if (resS5.status !== 'insufficient_items') throw new Error('Must flag insufficient items.');
if (resS5.recommended_outfits.length !== 0) throw new Error('Must NOT invent footwear when none exists.');
console.log('  [PASS] Test 6: Scenario 5 strictly enforced wardrobe boundary without inventing items.\n');

// -------------------------------------------------------------
// Test 7: Unused Clothing Suggestions & Wardrobe Revival
// -------------------------------------------------------------
console.log('--> TEST 7: Unused Clothing Revival from Full Closet');
const resRevival = recommendUnusedItemOutfits(sampleWardrobe, { limit: 3 });
console.log(`  Status: ${resRevival.status} | Neglected items count: ${resRevival.neglected_items_count}`);
if (resRevival.neglected_items_count === 0 || resRevival.revival_outfits.length === 0) {
  throw new Error('Must generate revival outfits for neglected clothes.');
}
console.log(`  First Revival Outfit: ${resRevival.revival_outfits[0].items.map(i => i.name).join(' + ')}`);
console.log(`  Explanation: ${resRevival.revival_outfits[0].explanation}`);
console.log('  [PASS] Test 7: Unused clothing revival works accurately.\n');

// -------------------------------------------------------------
// Test 8: Recommender Error Handling
// -------------------------------------------------------------
console.log('--> TEST 8: Recommender Error Handling Edge Cases');

// A. Null wardrobe
const errNull = recommendOutfits(null);
if (errNull.status !== 'error' || !errNull.message.includes('null')) throw new Error('Null wardrobe must error cleanly.');
console.log('  [PASS] 8A: Null wardrobe handled cleanly.');

// B. Empty wardrobe array []
const errEmpty = recommendOutfits([]);
if (errEmpty.status !== 'error' || !errEmpty.message.includes('empty')) throw new Error('Empty wardrobe must error cleanly.');
console.log('  [PASS] 8B: Empty wardrobe handled cleanly.');

// C. Non-array wardrobe
const errType = recommendOutfits({ item: 1 });
if (errType.status !== 'error' || !errType.message.includes('array')) throw new Error('Non-array wardrobe must error.');
console.log('  [PASS] 8C: Non-array wardrobe handled cleanly.');

// D. Missing usage history in revival
const noHistoryWardrobe = sampleWardrobe.map(i => {
  const c = { ...i };
  delete c.times_worn;
  delete c.last_worn;
  return c;
});
const resNoHist = recommendUnusedItemOutfits(noHistoryWardrobe);
if (resNoHist.status !== 'no_usage_history') throw new Error('Should handle missing history gracefully.');
console.log('  [PASS] 8D: Missing usage history handled gracefully.\n');

console.log('================================================================');
console.log('ALL RECOMMENDER ENGINE & SCENARIO TESTS PASSED SUCCESSFULLY (8/8)');
console.log('================================================================');
