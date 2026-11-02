// ============================================================================
// PRODUCT DATA SERVICE & REPOSITORY LAYER
// ============================================================================
// This layer abstracts all fashion boutique catalog items, categories,
// try-on mapping, and recommendation logic. A real REST/GraphQL/database
// backend can be swapped in here without rewriting any 3D rendering components.

export const CATEGORIES = [
  { id: 'all', name: 'All Collection', icon: 'Grid' },
  { id: 'tops', name: "Women's Tops", icon: 'Shirt' },
  { id: 'dresses', name: 'Dresses', icon: 'Sparkles' },
  { id: 'outerwear', name: 'Jackets & Coats', icon: 'Layers' },
  { id: 'trousers', name: 'Trousers & Jeans', icon: 'Scissors' },
  { id: 'skirts', name: 'Skirts', icon: 'Sparkle' },
  { id: 'shoes', name: 'Designer Shoes', icon: 'Footprints' },
  { id: 'accessories', name: 'Luxury Accessories', icon: 'ShoppingBag' }
];

export const PRODUCTS = [
  // --- TOPS ---
  {
    id: 'top-1',
    name: 'Ribbed Silk Scoop Crop Tank',
    category: 'tops',
    price: 95,
    discountPrice: 79,
    rating: 4.9,
    reviewsCount: 128,
    description: 'A luxurious finely-ribbed silk-blend crop top featuring a gentle scoop neckline and seamless finish. Perfect for layering under tailored blazers or paired with wide-leg denim for everyday effortless elegance.',
    details: ['85% Mulberry Silk, 15% Elastane', 'Ribbed knit texture', 'Breathable and moisture-wicking', 'Dry clean or hand wash cold'],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Ivory White', hex: '#ffffff' },
      { name: 'Dusty Blush', hex: '#e8b8c8' },
      { name: 'Midnight Noir', hex: '#201f24' }
    ],
    primaryColor: '#ffffff',
    brand: 'Maison Luxe',
    inStock: true,
    stockCount: 18,
    featured: true,
    tags: ['casual', 'summer', 'trending', 'capsule'],
    garmentType: 'top',
    silhouette: 'crop-tank',
    position3D: [-2.2, 2.1, -1.8], // 3D coordinates in boutique
    complementaryIds: ['trouser-1', 'shoe-1', 'acc-1', 'out-1'],
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'top-2',
    name: 'Cashmere Oversized Knit Pullover',
    category: 'tops',
    price: 240,
    discountPrice: 195,
    rating: 4.8,
    reviewsCount: 94,
    description: 'Ultra-soft pure Grade-A Mongolian cashmere sweater in a relaxed silhouette with drop shoulders and ribbed cuffs. Designed for cozy sophistication at home or evening strolls in the city.',
    details: ['100% Sustainable Cashmere', '2-ply knit yarn', 'Drop-shoulder drape', 'Hand wash cold with wool detergent'],
    sizes: ['S', 'M', 'L'],
    colors: [
      { name: 'Dusty Rose', hex: '#e7a9b9' },
      { name: 'Oatmeal Heather', hex: '#d9cdbe' },
      { name: 'Sky Blue', hex: '#9cc0d8' }
    ],
    primaryColor: '#e7a9b9',
    brand: 'Aura Studio',
    inStock: true,
    stockCount: 12,
    featured: true,
    tags: ['cozy', 'winter', 'knitwear'],
    garmentType: 'top',
    silhouette: 'sweater',
    position3D: [-1.4, 2.1, -1.8],
    complementaryIds: ['trouser-1', 'shoe-3', 'acc-1'],
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'top-3',
    name: 'Tailored Poplin Oxford Shirt',
    category: 'tops',
    price: 135,
    discountPrice: null,
    rating: 4.7,
    reviewsCount: 81,
    description: 'Crisp organic cotton poplin button-down shirt with structured pointed collar, mother-of-pearl buttons, and rounded shirttail hem. A timeless menswear-inspired staple tailored for the modern woman.',
    details: ['100% Organic GOTS Cotton', 'Mother-of-pearl buttons', 'Reinforced French seams', 'Machine wash warm, iron while damp'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Sky Blue', hex: '#9cc0d8' },
      { name: 'Crisp White', hex: '#fdfdfd' },
      { name: 'French Stripe', hex: '#cbd8e6' }
    ],
    primaryColor: '#9cc0d8',
    brand: 'Atelier Minimal',
    inStock: true,
    stockCount: 25,
    featured: false,
    tags: ['office', 'workwear', 'classic'],
    garmentType: 'top',
    silhouette: 'oxford',
    position3D: [-0.6, 2.1, -1.8],
    complementaryIds: ['trouser-2', 'shoe-4', 'acc-2'],
    image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'top-4',
    name: 'Breton Striped Nautical Crewneck',
    category: 'tops',
    price: 88,
    discountPrice: 72,
    rating: 4.9,
    reviewsCount: 145,
    description: 'Classic French Riviera nautical striped long-sleeve tee crafted from heavyweight combed jersey cotton. Features boatneck collar and timeless navy-and-white stripes.',
    details: ['100% Combed Heavy Cotton', 'Yarn-dyed stripes', 'Classic boat neckline', 'Machine wash cold'],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Ivory / Navy', hex: '#f4f4f7' },
      { name: 'Black / White', hex: '#242428' }
    ],
    primaryColor: '#f0f0f4',
    brand: 'Riviera Chic',
    inStock: true,
    stockCount: 30,
    featured: false,
    tags: ['casual', 'nautical', 'parisienne'],
    garmentType: 'top',
    silhouette: 'striped-tee',
    position3D: [0.2, 2.1, -1.8],
    complementaryIds: ['trouser-1', 'shoe-1', 'acc-3'],
    image: 'https://images.unsplash.com/photo-1605763240000-7e93b172d754?w=400&auto=format&fit=crop&q=80'
  },

  // --- DRESSES ---
  {
    id: 'dress-1',
    name: 'Satin Bias-Cut Slip Midi Dress',
    category: 'dresses',
    price: 210,
    discountPrice: 175,
    rating: 5.0,
    reviewsCount: 168,
    description: 'An ethereal bias-cut midi dress crafted from heavy liquid satin that cascades over curves with liquid drape. Features delicate adjustable spaghetti straps and a gentle cowl neckline.',
    details: ['100% Heavy Liquid Satin (Silk-poly blend)', 'Cut on the bias for fluid movement', 'Adjustable double straps', 'Dry clean recommended'],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Rose Dust', hex: '#c98a9c' },
      { name: 'Champagne Gold', hex: '#d8c29d' },
      { name: 'Noir Onyx', hex: '#1c1b20' }
    ],
    primaryColor: '#c98a9c',
    brand: 'Maison Luxe',
    inStock: true,
    stockCount: 14,
    featured: true,
    tags: ['party', 'date-night', 'evening', 'bestseller'],
    garmentType: 'dress',
    silhouette: 'slip-dress',
    position3D: [1.2, 2.3, -1.8],
    complementaryIds: ['shoe-2', 'acc-2', 'out-2'],
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'dress-2',
    name: 'Little Noir Cocktail Mini Gown',
    category: 'dresses',
    price: 265,
    discountPrice: null,
    rating: 4.9,
    reviewsCount: 77,
    description: 'A striking modern silhouette featuring architectural shoulder pads, subtle square neckline, and a flattering fitted waist with tulip hemline. The definitive showstopper for cocktail soirees.',
    details: ['Double-knit crepe fabric', 'Interior boning for silhouette structure', 'Hidden back zip closure', 'Dry clean only'],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Midnight Black', hex: '#1e1e24' },
      { name: 'Royal Emerald', hex: '#1b3b2b' }
    ],
    primaryColor: '#1e1e24',
    brand: 'Vogue Privé',
    inStock: true,
    stockCount: 9,
    featured: true,
    tags: ['party', 'cocktail', 'lbd'],
    garmentType: 'dress',
    silhouette: 'mini-dress',
    position3D: [2.0, 2.3, -1.8],
    complementaryIds: ['shoe-3', 'acc-1', 'acc-2'],
    image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&auto=format&fit=crop&q=80'
  },

  // --- JACKETS & OUTERWEAR ---
  {
    id: 'out-1',
    name: 'Belted Double-Breasted Camel Trench',
    category: 'outerwear',
    price: 380,
    discountPrice: 320,
    rating: 4.9,
    reviewsCount: 110,
    description: 'Iconic London-inspired double-breasted trench coat tailored in water-repellent gabardine twill. Finished with horn buttons, storm flaps, and adjustable belt with tortoiseshell buckle.',
    details: ['100% Water-repellent Cotton Gabardine', 'Tortoiseshell buckle and horn buttons', 'Satin cupro lining', 'Specialist dry clean'],
    sizes: ['S', 'M', 'L'],
    colors: [
      { name: 'Warm Camel', hex: '#bca182' },
      { name: 'Black', hex: '#1c1c1f' },
      { name: 'Stone Beige', hex: '#d4cbbe' }
    ],
    primaryColor: '#bca182',
    brand: 'Atelier Minimal',
    inStock: true,
    stockCount: 8,
    featured: true,
    tags: ['trench', 'outerwear', 'luxury', 'capsule'],
    garmentType: 'outerwear',
    silhouette: 'trench',
    position3D: [2.8, 2.3, -1.8],
    complementaryIds: ['top-1', 'trouser-1', 'shoe-1', 'acc-1'],
    image: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'out-2',
    name: 'Cropped Italian Leather Biker Jacket',
    category: 'outerwear',
    price: 495,
    discountPrice: 420,
    rating: 4.8,
    reviewsCount: 65,
    description: 'Buttery-soft supple Italian lambskin leather with vintage-washed patina, asymmetric chunky silver zip hardware, and tailored cropped hem. Adds instant edge to romantic dresses.',
    details: ['100% Full-Grain Italian Lambskin', 'Heavyweight brushed silver zips', 'Silk-blend breathable lining', 'Leather specialist clean only'],
    sizes: ['XS', 'S', 'M'],
    colors: [
      { name: 'Noir Black', hex: '#242426' },
      { name: 'Cognac Brown', hex: '#634432' }
    ],
    primaryColor: '#242426',
    brand: 'Rebel Luxe',
    inStock: true,
    stockCount: 6,
    featured: false,
    tags: ['leather', 'edgy', 'biker'],
    garmentType: 'outerwear',
    silhouette: 'biker',
    position3D: [3.6, 2.3, -1.8],
    complementaryIds: ['dress-1', 'trouser-1', 'shoe-3'],
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&auto=format&fit=crop&q=80'
  },

  // --- TROUSERS & BOTTOMS ---
  {
    id: 'trouser-1',
    name: 'High-Rise Vintage Wide-Leg Jeans',
    category: 'trousers',
    price: 145,
    discountPrice: 119,
    rating: 4.9,
    reviewsCount: 204,
    description: 'Authentic rigid non-stretch vintage wash denim that molds to your shape over time. Designed with a flattering ultra-high rise, fitted hips, and a sweeping wide-leg puddle hem.',
    details: ['100% Organic Rigid Denim Cotton (13.5 oz)', 'Vintage stonewash with whisker fading', 'Branded brass button fly', 'Machine wash cold inside-out'],
    sizes: ['24', '25', '26', '27', '28', '29', '30'],
    colors: [
      { name: 'Sky Denim Blue', hex: '#5e84a8' },
      { name: 'Washed Black', hex: '#33343a' },
      { name: 'Raw Ecru', hex: '#e8e2d5' }
    ],
    primaryColor: '#5e84a8',
    brand: 'Blue Note Denim',
    inStock: true,
    stockCount: 35,
    featured: true,
    tags: ['denim', 'casual', 'bestseller', 'capsule'],
    garmentType: 'bottom',
    silhouette: 'wide-jeans',
    position3D: [-3.2, 1.4, 0.4],
    complementaryIds: ['top-1', 'top-2', 'top-4', 'shoe-1', 'acc-1'],
    image: 'https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'trouser-2',
    name: 'Pleated Wool-Blend Tailored Trousers',
    category: 'trousers',
    price: 185,
    discountPrice: null,
    rating: 4.8,
    reviewsCount: 92,
    description: 'Impeccably tailored trousers cut from lightweight tropical wool with crisp front pleats, slant pockets, and an elongating straight-leg drape. The cornerstone of power dressing.',
    details: ['70% Fine Merino Wool, 28% Polyester, 2% Elastane', 'Deep double front pleats', 'Interior curtain waistband', 'Dry clean only'],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Charcoal Grey', hex: '#323438' },
      { name: 'Camel Tan', hex: '#c5a782' },
      { name: 'Cream Chalk', hex: '#f2ece4' }
    ],
    primaryColor: '#323438',
    brand: 'Atelier Minimal',
    inStock: true,
    stockCount: 16,
    featured: false,
    tags: ['workwear', 'tailored', 'suiting'],
    garmentType: 'bottom',
    silhouette: 'slacks',
    position3D: [-2.4, 1.4, 0.4],
    complementaryIds: ['top-3', 'out-1', 'shoe-4', 'acc-1'],
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&auto=format&fit=crop&q=80'
  },

  // --- SKIRTS ---
  {
    id: 'skirt-1',
    name: 'Pleated Satin A-Line Midi Skirt',
    category: 'skirts',
    price: 130,
    discountPrice: 99,
    rating: 4.7,
    reviewsCount: 63,
    description: 'High-waisted knife-pleated skirt with an elasticated waistband and liquid satin shimmer that catches the light with every step.',
    details: ['100% Hammered Satin Polyester', 'Permanent heat-set pleating', 'Comfort hidden elastic band', 'Hand wash cold'],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Rose Quartz', hex: '#d99ab5' },
      { name: 'Gold Champagne', hex: '#d6b88a' },
      { name: 'Midnight', hex: '#1c1b24' }
    ],
    primaryColor: '#d99ab5',
    brand: 'Aura Studio',
    inStock: true,
    stockCount: 11,
    featured: false,
    tags: ['feminine', 'pleats', 'date-night'],
    garmentType: 'bottom',
    silhouette: 'skirt',
    position3D: [-1.6, 1.4, 0.4],
    complementaryIds: ['top-1', 'shoe-2', 'acc-2'],
    image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&auto=format&fit=crop&q=80'
  },

  // --- SHOES ---
  {
    id: 'shoe-1',
    name: 'Court Star Platform Leather Sneakers',
    category: 'shoes',
    price: 160,
    discountPrice: null,
    rating: 5.0,
    reviewsCount: 312,
    description: 'Handcrafted in Portugal from smooth Italian calf leather with an ergonomic cushioned memory foam insole and lightweight 1.5-inch platform rubber cupsole.',
    details: ['100% Italian Calf Leather upper', 'Natural rubber platform sole (3.8 cm)', 'Microfiber breathable lining', 'Wipe clean with damp cloth'],
    sizes: ['36', '37', '38', '39', '40', '41'],
    colors: [
      { name: 'Triple White', hex: '#ffffff' },
      { name: 'White / Gum', hex: '#f0ece2' }
    ],
    primaryColor: '#ffffff',
    brand: 'Solitaire Studio',
    inStock: true,
    stockCount: 42,
    featured: true,
    tags: ['sneakers', 'casual', 'comfort', 'musthave'],
    garmentType: 'shoes',
    silhouette: 'sneakers',
    position3D: [1.8, 0.5, 2.0],
    complementaryIds: ['top-1', 'trouser-1', 'out-1'],
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'shoe-2',
    name: 'Bellini Nude Pointed Stiletto Pumps',
    category: 'shoes',
    price: 295,
    discountPrice: 240,
    rating: 4.8,
    reviewsCount: 88,
    description: 'Timeless 90mm pointed pumps crafted in Italy from polished patent blush nude leather. Elongates the leg and balances effortlessly between day and evening.',
    details: ['Patent Leather upper', '90mm lacquer-wrapped stiletto heel', 'Padded leather insole', 'Leather outsole with rubber island'],
    sizes: ['36', '37', '38', '39', '40'],
    colors: [
      { name: 'Nude Blush', hex: '#dfc2b0' },
      { name: 'Classic Noir', hex: '#16151a' }
    ],
    primaryColor: '#dfc2b0',
    brand: 'Maison Luxe',
    inStock: true,
    stockCount: 15,
    featured: true,
    tags: ['heels', 'formal', 'wedding', 'party'],
    garmentType: 'shoes',
    silhouette: 'stilettos',
    position3D: [2.5, 0.5, 2.0],
    complementaryIds: ['dress-1', 'dress-2', 'acc-1'],
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'shoe-3',
    name: 'Aria Strappy Square-Toe Heeled Sandals',
    category: 'shoes',
    price: 220,
    discountPrice: null,
    rating: 4.7,
    reviewsCount: 52,
    description: 'Minimalist 90s-inspired asymmetric ankle strap sandals on a sculpted 75mm kitten stiletto with modern square toe bed.',
    details: ['Soft nappa lambskin straps', '75mm architectural heel', 'Square toe footbed', 'Buckle ankle strap closure'],
    sizes: ['36', '37', '38', '39', '40'],
    colors: [
      { name: 'Noir Black', hex: '#1a1a1d' },
      { name: 'Metallic Gold', hex: '#c5a059' }
    ],
    primaryColor: '#1a1a1d',
    brand: 'Vogue Privé',
    inStock: true,
    stockCount: 18,
    featured: false,
    tags: ['summer', 'party', 'strappy'],
    garmentType: 'shoes',
    silhouette: 'sandals',
    position3D: [3.2, 0.5, 2.0],
    complementaryIds: ['dress-1', 'dress-2', 'skirt-1'],
    image: 'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=400&auto=format&fit=crop&q=80'
  },

  // --- ACCESSORIES ---
  {
    id: 'acc-1',
    name: 'Quilted Caviar Leather Flap Bag',
    category: 'accessories',
    price: 680,
    discountPrice: 590,
    rating: 5.0,
    reviewsCount: 220,
    description: 'An iconic luxury shoulder bag crafted from scratch-resistant caviar leather with signature diamond quilting, interwoven 24K gold chain strap, and turn-lock clasp.',
    details: ['Grained Caviar Calfskin leather', 'Interwoven 24K gold-plated chain', 'Burgundy leather interior lining', 'Includes authenticity card & dust bag'],
    sizes: ['One Size (25cm x 15cm x 7cm)'],
    colors: [
      { name: 'Noir Black', hex: '#241a16' },
      { name: 'Rose Macaron', hex: '#d69ea8' },
      { name: 'Caramel Toffee', hex: '#7c6052' }
    ],
    primaryColor: '#241a16',
    brand: 'Maison Luxe',
    inStock: true,
    stockCount: 5,
    featured: true,
    tags: ['handbag', 'luxury', 'investment', 'bestseller'],
    garmentType: 'accessory',
    silhouette: 'handbag',
    position3D: [2.2, 1.8, 1.2],
    complementaryIds: ['top-1', 'trouser-1', 'dress-1', 'shoe-1', 'shoe-2'],
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'acc-2',
    name: '18K Vermeil Herringbone Layering Chain',
    category: 'accessories',
    price: 145,
    discountPrice: 120,
    rating: 4.9,
    reviewsCount: 164,
    description: 'Liquid gold herringbone flat snake chain dipped in thick 18-karat gold over solid sterling silver. Sits flush against the collarbone with mirror-like shine.',
    details: ['18K Gold Vermeil (2.5 microns) over 925 Sterling Silver', '4mm chain width, 16" length + 2" extender', 'Lobster claw closure', 'Hypoallergenic & nickel-free'],
    sizes: ['16-18 inch adjustable'],
    colors: [
      { name: '18K Yellow Gold', hex: '#d4af37' },
      { name: 'Sterling Silver', hex: '#d0d4d9' }
    ],
    primaryColor: '#d4af37',
    brand: 'Aura Studio',
    inStock: true,
    stockCount: 24,
    featured: false,
    tags: ['jewelry', 'gold', 'minimalist'],
    garmentType: 'accessory',
    silhouette: 'jewelry',
    position3D: [1.6, 1.8, 1.2],
    complementaryIds: ['top-1', 'dress-1', 'top-3'],
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&auto=format&fit=crop&q=80'
  }
];

// --- RECOMMENDATION ENGINE (SIMULATED AI STYLIST) ---
export function getRecommendations(currentProductId, currentOutfit = {}) {
  // 1. Gather all complementary IDs from current product or outfit pieces
  const targetIds = new Set();
  
  if (currentProductId) {
    const p = PRODUCTS.find(x => x.id === currentProductId);
    if (p && p.complementaryIds) {
      p.complementaryIds.forEach(id => targetIds.add(id));
    }
  }

  // Also pull complements for tried-on items
  Object.values(currentOutfit).forEach(item => {
    if (item && item.complementaryIds) {
      item.complementaryIds.forEach(id => targetIds.add(id));
    }
  });

  // 2. Fetch matched products
  const matched = PRODUCTS.filter(p => targetIds.has(p.id) && p.id !== currentProductId);

  // 3. Fallback to featured items if fewer than 3
  if (matched.length < 3) {
    const featured = PRODUCTS.filter(p => p.featured && p.id !== currentProductId && !targetIds.has(p.id));
    return [...matched, ...featured].slice(0, 4);
  }

  return matched.slice(0, 4);
}

// Filter products by category, search text, max price
export function filterProducts({ category = 'all', query = '', maxPrice = 1000 }) {
  return PRODUCTS.filter(p => {
    const matchCategory = category === 'all' || p.category === category;
    const matchQuery = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(query.toLowerCase()));
    const matchPrice = (p.discountPrice || p.price) <= maxPrice;
    return matchCategory && matchQuery && matchPrice;
  });
}

