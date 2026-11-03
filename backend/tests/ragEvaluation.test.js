/**
 * ragEvaluation.test.js
 * Comprehensive evaluation runner for Wardrobe RAG enhancement.
 * Tests accuracy across:
 * - Category disambiguation (Red frock vs Red saree, Jeans vs Trousers)
 * - Color matching
 * - Occasion and Season filtering
 * - Exact Matches vs Similar Alternatives separation
 * - Irrelevant category exclusion
 * - Visual image search
 * - Non-existent item handling
 */

import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../config/db.js';
import mongoose from 'mongoose';
import { executeRAGOutfitStylist, executeRAGImageSearch } from '../services/ragService.js';

const TEST_CASES = [
  {
    name: '1. Red Frock Retrieval',
    query: 'Red frock',
    validate: (res) => {
      const topMatch = res.exactMatches[0];
      const hasFrock = topMatch && topMatch.name.toLowerCase().includes('frock');
      const noSaree = !res.exactMatches.some((m) => m.name.toLowerCase().includes('saree'));
      return {
        pass: hasFrock && noSaree,
        details: `Top Match: "${topMatch?.name}" (Cat: ${topMatch?.category}, Sub: ${topMatch?.subCategory}). Sarees excluded: ${noSaree}`
      };
    }
  },
  {
    name: '2. Red Saree Retrieval',
    query: 'Red saree',
    validate: (res) => {
      const topMatch = res.exactMatches[0];
      const isSaree = topMatch && (topMatch.name.toLowerCase().includes('saree') || topMatch.subCategory?.toLowerCase() === 'saree');
      const noFrock = !res.exactMatches.some((m) => m.name.toLowerCase().includes('frock'));
      return {
        pass: isSaree && noFrock,
        details: `Top Match: "${topMatch?.name}". Frocks excluded: ${noFrock}`
      };
    }
  },
  {
    name: '3. Blue Jeans Retrieval',
    query: 'Blue jeans',
    validate: (res) => {
      const topMatch = res.exactMatches[0];
      const isJeans = topMatch && topMatch.name.toLowerCase().includes('jean');
      const isBlue = topMatch && topMatch.color?.toLowerCase() === 'blue';
      return {
        pass: isJeans && isBlue,
        details: `Top Match: "${topMatch?.name}" (Color: ${topMatch?.color})`
      };
    }
  },
  {
    name: '4. Black Jeans Retrieval',
    query: 'Black jeans',
    validate: (res) => {
      const topMatch = res.exactMatches[0];
      const isBlackJeans = topMatch && topMatch.name.toLowerCase().includes('jean') && topMatch.color?.toLowerCase() === 'black';
      return {
        pass: isBlackJeans,
        details: `Top Match: "${topMatch?.name}" (Color: ${topMatch?.color})`
      };
    }
  },
  {
    name: '5. White Shirt Retrieval',
    query: 'White shirt',
    validate: (res) => {
      const topMatch = res.exactMatches[0];
      const isWhiteShirt = topMatch && topMatch.name.toLowerCase().includes('shirt') && topMatch.color?.toLowerCase() === 'white';
      return {
        pass: isWhiteShirt,
        details: `Top Match: "${topMatch?.name}" (Color: ${topMatch?.color})`
      };
    }
  },
  {
    name: '6. Floral Dress Retrieval',
    query: 'Floral dress',
    validate: (res) => {
      const topMatch = res.exactMatches[0];
      const isFloral = topMatch && (topMatch.pattern?.toLowerCase() === 'floral' || topMatch.name.toLowerCase().includes('floral'));
      return {
        pass: isFloral,
        details: `Top Match: "${topMatch?.name}" (Pattern: ${topMatch?.pattern})`
      };
    }
  },
  {
    name: '7. Traditional Outfit Retrieval',
    query: 'Traditional outfit',
    validate: (res) => {
      const matches = res.exactMatches;
      const allTraditional = matches.every((m) => {
        const cat = `${m.name} ${m.subCategory} ${m.style?.join(' ')}`.toLowerCase();
        return cat.includes('saree') || cat.includes('anarkali') || cat.includes('ethnic') || cat.includes('traditional') || cat.includes('juttis');
      });
      return {
        pass: matches.length > 0 && allTraditional,
        details: `Found ${matches.length} traditional pieces: ${matches.map((m) => m.name).join(', ')}`
      };
    }
  },
  {
    name: '8. Party-Wear Dress Retrieval',
    query: 'Party-wear dress',
    validate: (res) => {
      const topMatch = res.exactMatches[0];
      const isPartyDress = topMatch && (topMatch.occasion?.includes('Party') || topMatch.occasion?.includes('Summer party'));
      return {
        pass: isPartyDress,
        details: `Top Match: "${topMatch?.name}" (Occasions: ${topMatch?.occasion?.join(', ')})`
      };
    }
  },
  {
    name: '9. Red Frock for Summer Party',
    query: 'Red frock for a summer party',
    validate: (res) => {
      const topMatch = res.exactMatches[0];
      const isFrock = topMatch && topMatch.name.toLowerCase().includes('frock');
      const isRed = topMatch && (topMatch.color?.toLowerCase() === 'red' || topMatch.primaryColor === '#dc2626');
      const isSummer = topMatch && topMatch.season?.includes('Summer');
      return {
        pass: isFrock && isRed && isSummer,
        details: `Top Match: "${topMatch?.name}" (Season: ${topMatch?.season?.join('/')}, Occasions: ${topMatch?.occasion?.join('/')})`
      };
    }
  },
  {
    name: '10. Black Dress for Winter Wedding',
    query: 'Black dress for a winter wedding',
    validate: (res) => {
      const topMatch = res.exactMatches[0];
      const isBlack = topMatch && topMatch.color?.toLowerCase() === 'black';
      const isDress = topMatch && topMatch.category?.toLowerCase() === 'dress';
      return {
        pass: isBlack && isDress,
        details: `Top Match: "${topMatch?.name}" (Season: ${topMatch?.season?.join('/')})`
      };
    }
  },
  {
    name: '11. Casual Outfit for College',
    query: 'Casual outfit for college',
    validate: (res) => {
      const outfit = res.matchingOutfits[0];
      const hasCasualPieces = outfit && outfit.clothingItems.length >= 2;
      return {
        pass: hasCasualPieces,
        details: `Outfit: "${outfit?.outfitName}" comprising ${outfit?.clothingItems.map((i) => i.name).join(' + ')}`
      };
    }
  },
  {
    name: '12. Traditional Outfit for Summer Festival',
    query: 'Traditional outfit for a summer festival',
    validate: (res) => {
      const match = res.exactMatches[0];
      const isTraditional = match && (match.name.toLowerCase().includes('anarkali') || match.name.toLowerCase().includes('saree'));
      return {
        pass: Boolean(isTraditional),
        details: `Top Match: "${match?.name}"`
      };
    }
  },
  {
    name: '13. Non-Existent Clothing Item Handling',
    query: 'Cyberpunk metallic spacesuit',
    validate: (res) => {
      const isNotFound = res.notFound === true;
      const zeroExact = res.exactMatches.length === 0;
      return {
        pass: isNotFound && zeroExact,
        details: `notFound: ${res.notFound}, Message: "${res.message}"`
      };
    }
  },
  {
    name: '14. White Frock Retrieval',
    query: 'White frock',
    validate: (res) => {
      const topMatch = res.exactMatches[0];
      const isFrock = topMatch && (topMatch.name.toLowerCase().includes('frock') || topMatch.subCategory?.toLowerCase() === 'frock');
      const isWhite = topMatch && topMatch.color?.toLowerCase() === 'white';
      return {
        pass: Boolean(isFrock && isWhite),
        details: `Top Match: "${topMatch?.name}" (Color: ${topMatch?.color}, Category: ${topMatch?.category}, Sub: ${topMatch?.subCategory})`
      };
    }
  }
];

async function runEvaluation() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('WARDROBE RAG ENHANCEMENT: COMPREHENSIVE EVALUATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  await connectDB();

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    try {
      const res = await executeRAGOutfitStylist({ query: tc.query });
      const { pass, details } = tc.validate(res);

      if (pass) {
        console.log(`✓ PASS: ${tc.name}`);
        console.log(`  Query: "${tc.query}"`);
        console.log(`  Result: ${details}\n`);
        passed++;
      } else {
        console.error(`✗ FAIL: ${tc.name}`);
        console.error(`  Query: "${tc.query}"`);
        console.error(`  Result: ${details}\n`);
        failed++;
      }
    } catch (err) {
      console.error(`✗ ERROR in ${tc.name}:`, err.message);
      failed++;
    }
  }

  // Visual Image Search Test: Uploaded Jeans image features
  try {
    console.log('Testing Image-Based Search (Uploaded Blue Jeans)...');
    const imageRes = await executeRAGImageSearch({
      features: {
        category: 'Jeans',
        dominantColor: 'Blue',
        pattern: 'Plain',
        aspectRatio: '1.4'
      }
    });

    const topItem = imageRes.exactMatches[0];
    const pass = topItem && topItem.category === 'Jeans' && topItem.color === 'Blue';
    if (pass) {
      console.log(`✓ PASS: 14. Uploaded Jeans Image Search`);
      console.log(`  Top Match: "${topItem.name}" (Color: ${topItem.color}, Category: ${topItem.category})\n`);
      passed++;
    } else {
      console.error(`✗ FAIL: 14. Uploaded Jeans Image Search\n`);
      failed++;
    }
  } catch (imgErr) {
    console.error('✗ ERROR in image search test:', imgErr.message);
    failed++;
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`EVALUATION SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('═══════════════════════════════════════════════════════════════');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runEvaluation();

