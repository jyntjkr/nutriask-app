import Papa from "papaparse";
import { readFileSync } from "fs";
import { join } from "path";
import Fuse from "fuse.js";

/**
 * Nutrition data structure for a single food item
 */
export interface FoodNutrient {
  foodName: string;
  protein: number; // grams
  fat: number; // grams
  fiber: number; // grams
  carbs: number; // grams
  calories: number; // kcal
}

/**
 * Aggregated nutrition totals
 */
export interface AggregatedNutrients {
  protein: number;
  fat: number;
  fiber: number;
  carbs: number;
  calories: number;
}

/**
 * Matched ingredient with nutrition data
 */
export interface MatchedIngredient {
  input: string;
  match: string;
  nutrients: FoodNutrient;
  confidence?: number;
}

/**
 * Nutrition analysis result
 */
export interface NutritionResult {
  aggregated: AggregatedNutrients;
  items: MatchedIngredient[];
}

// Cache for CSV data to optimize cold-start time
let foodDatabase: FoodNutrient[] | null = null;
let fuseIndex: Fuse<FoodNutrient> | null = null;

/**
 * Loads and parses the CSV file into a structured array
 * Uses caching to avoid reloading on every request
 */
function loadFoodDatabase(): FoodNutrient[] {
  if (foodDatabase !== null) {
    return foodDatabase;
  }

  try {
    const csvPath = join(process.cwd(), "data", "food-nutrients.csv");
    const fileContent = readFileSync(csvPath, "utf-8");

    // Parse CSV with headers using papaparse
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(), // Also trim values
    });

    // Map CSV columns to our structure
    // CSV has: Food Name, Protein (g), Fat (g), Fiber (g), Carbs (g), Calories (kcal)
    foodDatabase = parseResult.data.map((record: any) => ({
      foodName: record["Food Name"]?.trim() || "",
      protein: parseFloat(record["Protein (g)"]) || 0,
      fat: parseFloat(record["Fat (g)"]) || 0,
      fiber: parseFloat(record["Fiber (g)"]) || 0,
      carbs: parseFloat(record["Carbs (g)"]) || 0,
      calories: parseFloat(record["Calories (kcal)"]) || 0,
    })).filter((food: FoodNutrient) => food.foodName.length > 0);

    return foodDatabase || [];
  } catch (error) {
    console.error("Error loading food database:", error);
    return [];
  }
}

/**
 * Gets or creates the Fuse.js search index
 * Optimized for fuzzy matching with food names
 * Uses a custom getFn to normalize food names during search
 */
function getFuseIndex(): Fuse<FoodNutrient> {
  if (fuseIndex !== null) {
    return fuseIndex;
  }

  const database = loadFoodDatabase();
  
  fuseIndex = new Fuse(database, {
    keys: [
      {
        name: "foodName",
        getFn: (item: FoodNutrient) => normalizeIngredientName(item.foodName),
      },
    ],
    threshold: 0.5, // Increased from 0.4 to be more lenient (0 = exact match, 1 = match anything)
    includeScore: true,
    minMatchCharLength: 2,
    ignoreLocation: true,
    shouldSort: true,
    findAllMatches: false,
  });

  return fuseIndex;
}

/**
 * Normalizes ingredient name for better matching
 * Removes common prefixes, parentheses, and extra whitespace
 */
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove scientific names in parentheses
    .replace(/\([^)]*\)/g, "")
    // Remove common prefixes
    .replace(/^(the|a|an)\s+/i, "")
    // Clean up whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Matches a single ingredient to the food database using fuzzy search
 * Tries: exact match -> substring match -> word-by-word match -> fuzzy match
 * Returns the best match or null if no good match found
 */
export function matchIngredient(ingredient: string): MatchedIngredient | null {
  const normalized = normalizeIngredientName(ingredient);
  const database = loadFoodDatabase();
  
  // Step 1: Try exact case-insensitive match for better accuracy
  const exactMatch = database.find(
    (food) => {
      const foodNormalized = normalizeIngredientName(food.foodName);
      return foodNormalized === normalized;
    }
  );
  
  if (exactMatch) {
    return {
      input: ingredient,
      match: exactMatch.foodName,
      nutrients: exactMatch,
      confidence: 1.0, // Perfect match
    };
  }

  // Step 2: Try substring/partial matching with word boundary awareness
  // Check if any database item is contained in the input (e.g., "dough" in "pizza dough")
  // or if input is contained in database item (e.g., "rice" in "rice flakes")
  const substringMatches: Array<{ food: FoodNutrient; confidence: number; matchLength: number }> = [];
  
  for (const food of database) {
    const normalizedFood = normalizeIngredientName(food.foodName);
    
    // Skip if either string is too short
    if (normalizedFood.length < 3 || normalized.length < 3) {
      continue;
    }
    
    // Check if database item is contained in input (e.g., "dough" in "pizza dough")
    if (normalized.includes(normalizedFood)) {
      // Check for word boundaries (space, start, or end)
      const index = normalized.indexOf(normalizedFood);
      const isWordBoundary = 
        index === 0 || // At start
        index + normalizedFood.length === normalized.length || // At end
        normalized[index - 1] === ' ' || // Preceded by space
        normalized[index + normalizedFood.length] === ' '; // Followed by space
      
      // Calculate confidence based on match length and word boundary
      const ratio = normalizedFood.length / normalized.length;
      const baseConfidence = 0.7 + (ratio * 0.2);
      const confidence = isWordBoundary 
        ? Math.min(0.95, baseConfidence + 0.1) // Boost confidence for word boundaries
        : Math.min(0.85, baseConfidence);
      
      substringMatches.push({
        food,
        confidence,
        matchLength: normalizedFood.length, // Prefer longer matches
      });
    }
    // Check if input is contained in database item (e.g., "rice" in "rice flakes")
    else if (normalizedFood.includes(normalized)) {
      // Check for word boundaries
      const index = normalizedFood.indexOf(normalized);
      const isWordBoundary = 
        index === 0 ||
        index + normalized.length === normalizedFood.length ||
        normalizedFood[index - 1] === ' ' ||
        normalizedFood[index + normalized.length] === ' ';
      
      const ratio = normalized.length / normalizedFood.length;
      const baseConfidence = 0.7 + (ratio * 0.2);
      const confidence = isWordBoundary
        ? Math.min(0.95, baseConfidence + 0.1)
        : Math.min(0.85, baseConfidence);
      
      substringMatches.push({
        food,
        confidence,
        matchLength: normalized.length,
      });
    }
  }
  
  // If we found substring matches, return the best one
  // Sort by: 1) longest match, 2) highest confidence
  if (substringMatches.length > 0) {
    substringMatches.sort((a, b) => {
      // First sort by match length (longer is better)
      if (b.matchLength !== a.matchLength) {
        return b.matchLength - a.matchLength;
      }
      // Then by confidence
      return b.confidence - a.confidence;
    });
    
    const bestMatch = substringMatches[0];
    
    return {
      input: ingredient,
      match: bestMatch.food.foodName,
      nutrients: bestMatch.food,
      confidence: bestMatch.confidence,
    };
  }

  // Step 2.5: If no substring match found, try matching individual words
  // Split input by spaces and try to match each word against database
  // This handles cases like "pizza dough" -> "Pizza Dough" or "dough" -> "Dough"
  if (normalized.includes(' ')) {
    const words = normalized.split(/\s+/).filter(word => word.length >= 3);
    const wordMatches: Array<{ food: FoodNutrient; confidence: number; word: string }> = [];
    
    // Try each word from the input
    for (const word of words) {
      // First, try exact match of the word against any food name
      // This handles "dough" matching "Dough" exactly
      const exactWordMatch = database.find(
        (food) => {
          const normalizedFood = normalizeIngredientName(food.foodName);
          return normalizedFood === word;
        }
      );
      
      if (exactWordMatch) {
        wordMatches.push({
          food: exactWordMatch,
          confidence: 0.95, // Very high confidence for exact word match
          word,
        });
      }
      
      // Also check if the word appears in any food name (with word boundaries)
      // This handles "dough" matching "Pizza Dough"
      for (const food of database) {
        const normalizedFood = normalizeIngredientName(food.foodName);
        
        // Skip if we already found an exact match for this food
        if (normalizedFood === word) continue;
        
        // Check if word appears in food name at word boundaries
        const wordIndex = normalizedFood.indexOf(word);
        if (wordIndex !== -1) {
          const beforeChar = wordIndex > 0 ? normalizedFood[wordIndex - 1] : ' ';
          const afterChar = wordIndex + word.length < normalizedFood.length 
            ? normalizedFood[wordIndex + word.length] 
            : ' ';
          
          // Check if it's at a word boundary (space, start, or end)
          const isWordBoundary = beforeChar === ' ' || afterChar === ' ' || 
                                 wordIndex === 0 || wordIndex + word.length === normalizedFood.length;
          
          if (isWordBoundary) {
            // Calculate confidence based on how much of the food name is the word
            const matchRatio = word.length / normalizedFood.length;
            const confidence = 0.75 + Math.min(0.15, matchRatio * 0.15); // 0.75 to 0.9
            
            // Only add if we don't already have this food with higher confidence
            const existingMatch = wordMatches.find(m => m.food.foodName === food.foodName);
            if (!existingMatch || existingMatch.confidence < confidence) {
              if (existingMatch) {
                // Update existing match with higher confidence
                existingMatch.confidence = confidence;
              } else {
                wordMatches.push({
                  food,
                  confidence,
                  word,
                });
              }
            }
          }
        }
      }
    }
    
    // Return the best word match
    if (wordMatches.length > 0) {
      // Sort by: 1) exact matches first, 2) highest confidence, 3) prefer matches where word is longer relative to food name
      wordMatches.sort((a, b) => {
        const aExact = normalizeIngredientName(a.food.foodName) === a.word;
        const bExact = normalizeIngredientName(b.food.foodName) === b.word;
        
        // Exact matches come first
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then by confidence
        if (Math.abs(b.confidence - a.confidence) > 0.01) {
          return b.confidence - a.confidence;
        }
        
        // Prefer shorter food names (more specific matches)
        return a.food.foodName.length - b.food.foodName.length;
      });
      
      const bestWordMatch = wordMatches[0];
      return {
        input: ingredient,
        match: bestWordMatch.food.foodName,
        nutrients: bestWordMatch.food,
        confidence: bestWordMatch.confidence,
      };
    }
  }

  // Step 3: If no substring match, try fuzzy search
  const index = getFuseIndex();
  const results = index.search(normalized, { limit: 5 }); // Get top 5 for better matching
  
  if (results.length === 0 || !results[0]) {
    return null;
  }

  const result = results[0];
  const match = result.item;
  const score = result.score || 1;

  // Be more lenient with fuzzy matching - accept scores up to 0.75
  // This helps match things like "tomato sauce" to "Tomato Sauce" and "pizza dough" to "dough"
  if (score > 0.75) {
    return null;
  }

  return {
    input: ingredient,
    match: match.foodName,
    nutrients: match,
    confidence: 1 - score, // Convert score to confidence (lower score = higher confidence)
  };
}

/**
 * Matches multiple ingredients and aggregates their nutrition values
 * @param ingredients Array of ingredient names
 * @param quantities Optional array of quantities in grams (defaults to 100g each)
 */
export function calculateNutrition(
  ingredients: string[],
  quantities?: number[]
): NutritionResult {
  const matchedItems: MatchedIngredient[] = [];
  const aggregated: AggregatedNutrients = {
    protein: 0,
    fat: 0,
    fiber: 0,
    carbs: 0,
    calories: 0,
  };

  ingredients.forEach((ingredient, index) => {
    const quantity = quantities?.[index] || 100; // Default to 100g
    const match = matchIngredient(ingredient);

    if (match) {
      // Scale nutrients by quantity (CSV values are per 100g)
      const scale = quantity / 100;
      const scaledNutrients: FoodNutrient = {
        foodName: match.nutrients.foodName,
        protein: match.nutrients.protein * scale,
        fat: match.nutrients.fat * scale,
        fiber: match.nutrients.fiber * scale,
        carbs: match.nutrients.carbs * scale,
        calories: match.nutrients.calories * scale,
      };

      matchedItems.push({
        ...match,
        nutrients: scaledNutrients,
      });

      // Add to aggregated totals
      aggregated.protein += scaledNutrients.protein;
      aggregated.fat += scaledNutrients.fat;
      aggregated.fiber += scaledNutrients.fiber;
      aggregated.carbs += scaledNutrients.carbs;
      aggregated.calories += scaledNutrients.calories;
    } else {
      // Include unmatched items with zero nutrients
      matchedItems.push({
        input: ingredient,
        match: "Not found",
        nutrients: {
          foodName: ingredient,
          protein: 0,
          fat: 0,
          fiber: 0,
          carbs: 0,
          calories: 0,
        },
        confidence: 0,
      });
    }
  });

  // Round aggregated values to 2 decimal places
  aggregated.protein = Math.round(aggregated.protein * 100) / 100;
  aggregated.fat = Math.round(aggregated.fat * 100) / 100;
  aggregated.fiber = Math.round(aggregated.fiber * 100) / 100;
  aggregated.carbs = Math.round(aggregated.carbs * 100) / 100;
  aggregated.calories = Math.round(aggregated.calories * 100) / 100;

  return {
    aggregated,
    items: matchedItems,
  };
}

/**
 * Preloads the database to optimize cold-start time
 * Call this at module initialization or in API route startup
 */
export function preloadDatabase(): void {
  loadFoodDatabase();
  getFuseIndex();
}

