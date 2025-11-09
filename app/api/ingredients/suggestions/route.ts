import { NextRequest, NextResponse } from "next/server";
import { getSmartSuggestions } from "../utils/gemini";

/**
 * API Route: /api/ingredients/suggestions
 * 
 * Gets smart ingredient substitution suggestions from Gemini API
 * based on provided ingredients, dietary filters, and user goals.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredients, filters, goals } = body;

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

    // Validate filters and goals if provided
    if (filters && (!Array.isArray(filters) || filters.some(f => typeof f !== "string"))) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Filters must be an array of strings.",
        },
        { status: 400 }
      );
    }

    if (goals && (!Array.isArray(goals) || goals.some(g => typeof g !== "string"))) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Goals must be an array of strings.",
        },
        { status: 400 }
      );
    }

    // Get suggestions from Gemini
    const suggestions = await getSmartSuggestions(ingredients, filters, goals);

    return NextResponse.json(
      {
        suggestions,
        count: suggestions.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing suggestions request:", error);
    
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred while getting suggestions.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

