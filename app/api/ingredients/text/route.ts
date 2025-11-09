import { NextRequest, NextResponse } from "next/server";
import { calculateNutrition, preloadDatabase } from "@/lib/nutrition";

/**
 * API Route: /api/ingredients/text
 * 
 * Processes comma-separated text ingredients and matches them to the nutrition database.
 * Returns aggregated nutrition data and individual matches.
 */

// Preload database on module initialization for faster cold-start
preloadDatabase();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredients, quantities } = body;

    // Validate input
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Please provide a non-empty array of ingredients.",
        },
        { status: 400 }
      );
    }

    // Validate quantities if provided
    if (quantities && (!Array.isArray(quantities) || quantities.length !== ingredients.length)) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "If provided, quantities array must have the same length as ingredients array.",
        },
        { status: 400 }
      );
    }

    // Calculate nutrition for all ingredients
    const result = calculateNutrition(ingredients, quantities);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error processing text ingredients:", error);
    
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred while processing ingredients.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


