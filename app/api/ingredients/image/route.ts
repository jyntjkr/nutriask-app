import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { calculateNutrition, preloadDatabase } from "@/lib/nutrition";
import { getSmartSuggestions } from "../utils/gemini";

/**
 * API Route: /api/ingredients/image
 * 
 * Processes food images using Gemini API to detect ingredients,
 * then matches them to the nutrition database and returns aggregated nutrition data.
 */

// Maximum file size: 7 MB (Gemini API limit)
const MAX_FILE_SIZE = 7 * 1024 * 1024; // 7 MB in bytes

// Supported image MIME types
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Preload database on module initialization for faster cold-start
preloadDatabase();

/**
 * Converts a File to base64 string
 */
async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  return { base64, mimeType: file.type };
}

/**
 * Constructs the prompt for Gemini API to extract ingredients from food image
 */
function getIngredientExtractionPrompt(): string {
  return `You are given an image of food. Your task is to identify and list all the main ingredients visible in the image.

IMPORTANT: You MUST respond with ONLY valid JSON, no additional commentary, no markdown formatting, no code blocks.

The JSON structure must be exactly:
{
  "ingredients": ["ingredient1", "ingredient2", "ingredient3"]
}

Return a simple array of ingredient names as strings. Use common food names (e.g., "rice", "chicken", "tomato", "onion", "garlic", "ginger", "turmeric", "cumin", etc.).

If you cannot identify any ingredients, return an empty array: {"ingredients": []}

Respond with ONLY the JSON object, nothing else.`;
}

/**
 * Extracts ingredients from image using Gemini API
 */
async function extractIngredientsFromImage(
  base64Image: string,
  mimeType: string,
  apiKey: string
): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Convert base64 to format expected by Gemini
  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  const prompt = getIngredientExtractionPrompt();

  try {
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let parsed: { ingredients: string[] };
    try {
      // Try direct JSON parse first
      parsed = JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find JSON object in response
        const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          parsed = JSON.parse(jsonObjectMatch[0]);
        } else {
          throw new Error("No valid JSON found in response");
        }
      }
    }

    // Validate and return ingredients array
    if (parsed && Array.isArray(parsed.ingredients)) {
      return parsed.ingredients.filter((ing: any) => typeof ing === "string" && ing.trim().length > 0);
    }

    return [];
  } catch (error) {
    console.error("Error extracting ingredients from image:", error);
    throw new Error("Failed to extract ingredients from image");
  }
}

/**
 * POST handler for /api/ingredients/image
 * 
 * Flow:
 * 1. Validate the uploaded file (size, type)
 * 2. Convert file to base64
 * 3. Call Gemini API to extract ingredients
 * 4. Match ingredients to nutrition database
 * 5. Return aggregated nutrition data
 */
export async function POST(request: NextRequest) {
  try {
    // Get the API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Configuration Error",
          message: "Gemini API key not configured. Please set GEMINI_API_KEY environment variable.",
        },
        { status: 500 }
      );
    }

    // Parse the FormData from the request
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    
    // Get optional filters and goals from form data
    const filtersStr = formData.get("filters") as string | null;
    const goalsStr = formData.get("goals") as string | null;
    const filters = filtersStr ? JSON.parse(filtersStr) : undefined;
    const goals = goalsStr ? JSON.parse(goalsStr) : undefined;

    if (!file) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "No image file provided. Please upload an image.",
        },
        { status: 400 }
      );
    }

    // Validate file size (Gemini limit: 7 MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: `Image file is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
          details: `File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
        },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.",
          details: `Received type: ${file.type}`,
        },
        { status: 400 }
      );
    }

    // Convert file to base64
    const { base64, mimeType } = await fileToBase64(file);

    // Extract ingredients using Gemini API
    const ingredients = await extractIngredientsFromImage(base64, mimeType, apiKey);

    if (ingredients.length === 0) {
      return NextResponse.json(
        {
          error: "No Ingredients Found",
          message: "Could not identify any ingredients in the image. Please try another image.",
        },
        { status: 400 }
      );
    }

    // Match ingredients to nutrition database and calculate nutrition
    const result = calculateNutrition(ingredients);

    // Get smart suggestions from Gemini (non-blocking - don't fail if suggestions fail)
    let suggestions: any[] = [];
    try {
      suggestions = await getSmartSuggestions(ingredients, filters, goals);
    } catch (error) {
      console.warn("Failed to get suggestions, continuing without them:", error);
    }

    // Include the detected ingredients and suggestions in the response
    return NextResponse.json(
      {
        ...result,
        detected: ingredients,
        detectedIngredients: ingredients, // Keep for backward compatibility
        suggestions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing image ingredients:", error);
    
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred while processing the image.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



