import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import ClothingItem from '../models/ClothingItem.js';
import Outfit from '../models/Outfit.js';
import OutfitHistory from '../models/OutfitHistory.js';

const DEMO_USERS = [
  {
    name: 'Ayushi Singh',
    email: 'user@wardrobewise.com',
    password: 'Password123!',
    gender: 'Female',
    preferences: {
      favoriteColors: ['Navy', 'Beige', 'White', 'Black', 'Emerald'],
      preferredStyles: ['Chic', 'Formal', 'Minimalist', 'Casual'],
      preferredOccasions: ['Work', 'Casual', 'Party', 'Formal'],
    },
  },
  {
    name: 'Elena Rostova',
    email: 'elena@wardrobewise.com',
    password: 'Password123!',
    gender: 'Female',
    preferences: {
      favoriteColors: ['Black', 'Burgundy', 'Cream', 'Gold'],
      preferredStyles: ['Chic', 'Streetwear'],
      preferredOccasions: ['Dinner', 'Party', 'Casual'],
    },
  },
];

const SAMPLE_WARDROBE_ITEMS = [
  // TOPS
  {
    name: 'Crisp White Oxford Shirt',
    category: 'Shirt',
    subCategory: 'Button-Down',
    color: 'White',
    secondaryColors: ['Blue'],
    material: '100% Egyptian Cotton',
    brand: 'Ralph Lauren',
    season: ['Spring', 'Summer', 'Autumn', 'Winter'],
    occasion: ['Work', 'Formal', 'Casual', 'College'],
    style: ['Chic', 'Formal', 'Minimalist'],
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=700&auto=format&fit=crop',
    favorite: true,
  },
  {
    name: 'Navy Silk Crepe Blouse',
    category: 'Shirt',
    subCategory: 'Blouse',
    color: 'Navy',
    secondaryColors: ['Midnight Blue'],
    material: 'Mulberry Silk',
    brand: 'Theory',
    season: ['Spring', 'Autumn', 'Winter'],
    occasion: ['Work', 'Dinner', 'Formal'],
    style: ['Chic', 'Formal'],
    imageUrl: 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=700&auto=format&fit=crop',
    favorite: true,
  },
  {
    name: 'Essential Oversized Cotton Tee',
    category: 'T-Shirt',
    subCategory: 'Crew Neck',
    color: 'Beige',
    secondaryColors: ['Cream'],
    material: 'Heavyweight Cotton',
    brand: 'Uniqlo U',
    season: ['Spring', 'Summer', 'Autumn'],
    occasion: ['Casual', 'College', 'Sports'],
    style: ['Casual', 'Minimalist', 'Streetwear'],
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=700&auto=format&fit=crop',
    favorite: false,
  },
  {
    name: 'Ribbed Knit Cashmere Sweater',
    category: 'Shirt',
    subCategory: 'Sweater',
    color: 'Black',
    secondaryColors: ['Charcoal'],
    material: '100% Mongolian Cashmere',
    brand: 'Everlane',
    season: ['Autumn', 'Winter', 'Spring'],
    occasion: ['Work', 'Casual', 'Dinner'],
    style: ['Minimalist', 'Chic'],
    imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=700&auto=format&fit=crop',
    favorite: true,
  },

  // BOTTOMS
  {
    name: 'Tailored Wide-Leg Grey Trousers',
    category: 'Trousers',
    subCategory: 'Wide-Leg',
    color: 'Grey',
    secondaryColors: ['Heather Grey'],
    material: 'Virgin Wool Blend',
    brand: 'COS',
    season: ['Autumn', 'Winter', 'Spring'],
    occasion: ['Work', 'Formal', 'Dinner'],
    style: ['Formal', 'Chic', 'Minimalist'],
    imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=700&auto=format&fit=crop',
    favorite: true,
  },
  {
    name: 'Classic Indigo Straight-Leg Jeans',
    category: 'Jeans',
    subCategory: 'Straight',
    color: 'Blue',
    secondaryColors: ['Indigo'],
    material: 'Raw Denim Cotton',
    brand: "Levi's 501",
    season: ['Spring', 'Summer', 'Autumn', 'Winter'],
    occasion: ['Casual', 'College', 'Travel'],
    style: ['Casual', 'Streetwear'],
    imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=700&auto=format&fit=crop',
    favorite: true,
  },
  {
    name: 'Pleated A-Line Midi Skirt',
    category: 'Skirt',
    subCategory: 'Midi',
    color: 'Emerald',
    secondaryColors: ['Forest Green'],
    material: 'Satin Twill',
    brand: 'Zara',
    season: ['Spring', 'Summer', 'Autumn'],
    occasion: ['Party', 'Dinner', 'Casual'],
    style: ['Chic', 'Romantic'],
    imageUrl: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=700&auto=format&fit=crop',
    favorite: false,
  },

  // DRESSES
  {
    name: 'Little Black Cocktail Dress',
    category: 'Dress',
    subCategory: 'Cocktail',
    color: 'Black',
    secondaryColors: ['Noir'],
    material: 'Crepe Silk',
    brand: 'Reformation',
    season: ['Spring', 'Summer', 'Autumn', 'Winter'],
    occasion: ['Party', 'Dinner', 'Formal'],
    style: ['Chic', 'Formal'],
    imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=700&auto=format&fit=crop',
    favorite: true,
  },

  // OUTERWEAR
  {
    name: 'Double-Breasted Camel Wool Coat',
    category: 'Jacket',
    subCategory: 'Overcoat',
    color: 'Beige',
    secondaryColors: ['Camel', 'Sand'],
    material: 'Italian Wool & Cashmere',
    brand: 'Max Mara',
    season: ['Autumn', 'Winter'],
    occasion: ['Work', 'Formal', 'Dinner', 'Casual'],
    style: ['Chic', 'Formal', 'Minimalist'],
    imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=700&auto=format&fit=crop',
    favorite: true,
  },
  {
    name: 'Structured Midnight Navy Blazer',
    category: 'Jacket',
    subCategory: 'Blazer',
    color: 'Navy',
    secondaryColors: ['Gold Buttons'],
    material: 'Fine Worsted Wool',
    brand: 'Hugo Boss',
    season: ['Spring', 'Autumn', 'Winter'],
    occasion: ['Work', 'Formal', 'Dinner', 'College'],
    style: ['Formal', 'Chic'],
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=700&auto=format&fit=crop',
    favorite: true,
  },

  // FOOTWEAR
  {
    name: 'Polished Black Leather Loafers',
    category: 'Shoes',
    subCategory: 'Loafers',
    color: 'Black',
    secondaryColors: ['Gunmetal'],
    material: 'Calfskin Leather',
    brand: "Church's",
    season: ['Spring', 'Summer', 'Autumn', 'Winter'],
    occasion: ['Work', 'Formal', 'Casual'],
    style: ['Formal', 'Chic', 'Minimalist'],
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=700&auto=format&fit=crop',
    favorite: true,
  },
  {
    name: 'Minimalist Clean White Sneakers',
    category: 'Shoes',
    subCategory: 'Sneakers',
    color: 'White',
    secondaryColors: ['Off-White'],
    material: 'Full-Grain Italian Nappa Leather',
    brand: 'Common Projects',
    season: ['Spring', 'Summer', 'Autumn', 'Winter'],
    occasion: ['Casual', 'College', 'Sports', 'Travel'],
    style: ['Casual', 'Minimalist', 'Streetwear'],
    imageUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=700&auto=format&fit=crop',
    favorite: true,
  },

  // ACCESSORIES
  {
    name: 'Italian Leather Reversible Belt',
    category: 'Accessories',
    subCategory: 'Belt',
    color: 'Black',
    secondaryColors: ['Gold Buckle', 'Brown'],
    material: 'Florentine Leather',
    brand: 'Gucci',
    season: ['Spring', 'Summer', 'Autumn', 'Winter'],
    occasion: ['Work', 'Formal', 'Casual'],
    style: ['Chic', 'Formal'],
    imageUrl: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=700&auto=format&fit=crop',
    favorite: false,
  },
];

async function seedDatabase() {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    const conn = await connectDB();
    console.log(`[Seed] Connected to: ${conn.connection.host}/${conn.connection.name}`);

    // 1. Seed or update Demo Users
    const userMap = {};
    for (const userData of DEMO_USERS) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = new User({
          name: userData.name,
          email: userData.email,
          password: userData.password, // Pre-save hook will hash
          gender: userData.gender,
          preferences: userData.preferences,
        });
        await user.save();
        console.log(`[Seed] Created user: ${user.email}`);
      } else {
        user.password = userData.password;
        user.preferences = userData.preferences;
        await user.save();
        console.log(`[Seed] Verified existing user: ${user.email}`);
      }
      userMap[userData.email] = user;
    }

    const primaryUser = userMap['user@wardrobewise.com'];

    // 2. Clear old clothing items for primary user & seed fresh catalog
    await ClothingItem.deleteMany({ userId: primaryUser._id });
    const itemsToInsert = SAMPLE_WARDROBE_ITEMS.map((item) => ({
      ...item,
      userId: primaryUser._id,
      aiAnalyzed: true,
      aiAnalysis: {
        category: item.category,
        subCategory: item.subCategory,
        color: item.color,
        secondaryColors: item.secondaryColors,
        material: item.material,
        confidence: 0.94,
        analyzedAt: new Date(),
        isMock: false,
      },
    }));

    const insertedClothes = await ClothingItem.insertMany(itemsToInsert);
    console.log(`[Seed] Inserted ${insertedClothes.length} clothing items for ${primaryUser.email}`);

    // Map inserted clothes by name for outfit assembly
    const itemByName = {};
    insertedClothes.forEach((item) => {
      itemByName[item.name] = item._id;
    });

    // 3. Seed Ready-To-Wear Outfits
    await Outfit.deleteMany({ userId: primaryUser._id });
    const sampleOutfits = [
      {
        userId: primaryUser._id,
        name: 'Executive Business Formal',
        clothingItems: [
          itemByName['Crisp White Oxford Shirt'],
          itemByName['Tailored Wide-Leg Grey Trousers'],
          itemByName['Structured Midnight Navy Blazer'],
          itemByName['Polished Black Leather Loafers'],
          itemByName['Italian Leather Reversible Belt'],
        ].filter(Boolean),
        occasion: 'Work',
        season: 'Autumn',
        description: 'Impeccable corporate boardroom combination balancing classic navy tailoring with crisp white shirting and Italian leather loafers.',
        isFavorite: true,
      },
      {
        userId: primaryUser._id,
        name: 'Urban Chic Weekend',
        clothingItems: [
          itemByName['Essential Oversized Cotton Tee'],
          itemByName['Classic Indigo Straight-Leg Jeans'],
          itemByName['Double-Breasted Camel Wool Coat'],
          itemByName['Minimalist Clean White Sneakers'],
        ].filter(Boolean),
        occasion: 'Casual',
        season: 'Spring',
        description: 'Effortless street style pairing raw indigo denim, neutral beige tones, and a striking camel wool coat.',
        isFavorite: true,
      },
      {
        userId: primaryUser._id,
        name: 'Evening Gallery & Dinner',
        clothingItems: [
          itemByName['Little Black Cocktail Dress'],
          itemByName['Structured Midnight Navy Blazer'],
          itemByName['Polished Black Leather Loafers'],
        ].filter(Boolean),
        occasion: 'Dinner',
        season: 'Winter',
        description: 'Sophisticated cocktail and gallery opening aesthetic with silk crepe texture and structured blazer layering.',
        isFavorite: true,
      },
      {
        userId: primaryUser._id,
        name: 'Smart Casual Autumn College',
        clothingItems: [
          itemByName['Ribbed Knit Cashmere Sweater'],
          itemByName['Tailored Wide-Leg Grey Trousers'],
          itemByName['Minimalist Clean White Sneakers'],
        ].filter(Boolean),
        occasion: 'College',
        season: 'Autumn',
        description: 'Cozy cashmere knitwear paired with architectural wide-leg grey trousers and fresh white leather sneakers.',
        isFavorite: false,
      },
    ];

    const insertedOutfits = await Outfit.insertMany(sampleOutfits);
    console.log(`[Seed] Inserted ${insertedOutfits.length} styled outfits for ${primaryUser.email}`);

    // 4. Seed Outfit History
    await OutfitHistory.deleteMany({ userId: primaryUser._id });
    const historyEntries = [
      {
        userId: primaryUser._id,
        outfitId: insertedOutfits[0]._id,
        wornDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        occasion: 'Work',
        feedbackRating: 5,
        notes: 'Received numerous compliments on the blazer and loafers combination.',
      },
      {
        userId: primaryUser._id,
        outfitId: insertedOutfits[1]._id,
        wornDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        occasion: 'Casual',
        feedbackRating: 4,
        notes: 'Very comfortable for Saturday city walk.',
      },
    ];
    await OutfitHistory.insertMany(historyEntries);
    console.log(`[Seed] Inserted ${historyEntries.length} outfit history logs.`);

    console.log('\n[Seed Success] MongoDB is fully populated with rich digital wardrobe data!');
    console.log('Login credentials:');
    console.log('  Email: user@wardrobewise.com');
    console.log('  Password: Password123!\n');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    process.exit(1);
  }
}

seedDatabase();
