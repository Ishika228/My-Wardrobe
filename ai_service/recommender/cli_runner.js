/**
 * cli_runner.js
 * Command-line runner for the JavaScript recommendation engine.
 * Reads JSON payload from stdin or argument file and outputs JSON to stdout.
 * Used by FastAPI or standalone shell scripts to bridge Node.js and Python.
 */

const fs = require('fs');
const { recommendOutfits, recommendUnusedItemOutfits } = require('./recommender');

function main() {
  try {
    let inputData = '';
    
    // Check if file passed as argument
    if (process.argv[2] && fs.existsSync(process.argv[2])) {
      inputData = fs.readFileSync(process.argv[2], 'utf8');
    } else {
      inputData = fs.readFileSync(0, 'utf8'); // Read stdin
    }

    if (!inputData || inputData.trim() === '') {
      console.error(JSON.stringify({ status: 'error', message: 'No input JSON provided.' }));
      process.exit(1);
    }

    const payload = JSON.parse(inputData);
    const mode = payload.mode || 'recommend';

    let result;
    if (mode === 'unused') {
      result = recommendUnusedItemOutfits(payload.wardrobe, payload.options || {});
    } else {
      result = recommendOutfits(payload.wardrobe, payload.options || {});
    }

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(JSON.stringify({
      status: 'error',
      message: `Execution failed: ${err.message}`
    }));
    process.exit(1);
  }
}

main();
