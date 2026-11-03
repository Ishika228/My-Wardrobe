async function testVerifiedQueries() {
  const queries = [
    'white frock',
    'red frock',
    'red saree',
    'white shirt',
    'navy blouse',
    'black jeans'
  ];

  for (const q of queries) {
    const res = await fetch('http://127.0.0.1:5000/api/recommendations/rag-outfits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q })
    });
    const d = await res.json();
    const top = d.exactMatches?.[0];
    console.log(`QUERY: "${q}" -> EXACT: ${d.exactMatches?.length || 0} items`);
    if (top) {
      console.log(`  TopMatch: "${top.name}" | Cat: ${top.category} | Sub: ${top.subCategory} | Color: ${top.color} | Score: ${top.matchScore}%`);
      console.log(`  ImageUrl: ${top.imageUrl}`);
    }
  }
}

testVerifiedQueries();
