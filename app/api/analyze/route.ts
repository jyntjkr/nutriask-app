import { NextRequest, NextResponse } from "next/server";
import { AnalysisResult, AnalysisError } from "@/lib/types";
import { calculateNutrition } from "@/lib/nutrition";

/**
 * API Route: /api/analyze
 * 
 * This route handles food image analysis using Google Gemini API.
 * It accepts an image file via FormData, converts it to base64,
 * sends it to Gemini with a structured prompt, and returns the
 * parsed JSON response.
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
 * Constructs the prompt for Gemini API
 * This prompt instructs the model to identify food, list ingredients,
 * and provide a structured breakdown in JSON format.
 */
function getAnalysisPrompt(): string {
  return `You are given an image of a food item. Your task is to:

1. Identify the food item name (primary identification)
2. List 2-3 alternative names if applicable
3. List all key ingredients visible or typically used in this dish
4. Provide a component breakdown showing the percentage composition (e.g., grains, proteins, vegetables, spices, etc.)
5. Provide a brief explanation of the dish

IMPORTANT: You MUST respond with ONLY valid JSON, no additional commentary, no markdown formatting, no code blocks. The response must be parseable JSON.

The JSON structure must be exactly:
{
  "foodItem": "string (primary food name)",
  "alternatives": ["string", "string"] (array of alternative names, can be empty),
  "ingredients": ["string", "string"] (array of ingredient names),
  "breakdown": [
    {
      "component": "string (component name like 'rice', 'chicken', 'vegetables')",
      "percent": number (percentage 0-100),
      "type": "string (category: 'grain', 'protein', 'vegetable', 'spice', 'dairy', 'other')"
    }
  ],
  "explanation": "string (brief 2-3 sentence explanation of the dish)"
}

If you are uncertain about the food item, provide your best guess and include a "confidence" field with a value between 0 and 1. Otherwise, omit the confidence field.

Respond with ONLY the JSON object, nothing else.`;
}

/**
 * Parses the Gemini API response to extract JSON
 * Handles cases where the response might have markdown code blocks or extra text
 */
function parseGeminiResponse(text: string): AnalysisResult {
  // Try to extract JSON from markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]) as AnalysisResult;
  }

  // Try to find JSON object in the response
  const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    return JSON.parse(jsonObjectMatch[0]) as AnalysisResult;
  }

  // If no JSON found, throw error
  throw new Error("No valid JSON found in Gemini response");
}

/**
 * POST handler for /api/analyze
 * 
 * Flow:
 * 1. Validate the uploaded file (size, type)
 * 2. Convert file to base64
 * 3. Call Gemini API with image and prompt
 * 4. Parse response and return structured data
 */
export async function POST(request: NextRequest) {
  try {
    // Get the API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json<AnalysisError>(
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

    if (!file) {
      return NextResponse.json<AnalysisError>(
        {
          error: "Validation Error",
          message: "No image file provided. Please upload an image.",
        },
        { status: 400 }
      );
    }

    // Validate file size (Gemini limit: 7 MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<AnalysisError>(
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
      return NextResponse.json<AnalysisError>(
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

    // Construct the Gemini API request
    // Using gemini-2.0-flash-exp model (supports image understanding)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              // Image part: send as inlineData (base64)
              inlineData: {
                mimeType: mimeType,
                data: base64,
              },
            },
            {
              // Text part: the analysis prompt
              text: getAnalysisPrompt(),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4, // Lower temperature for more consistent, structured output
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048, // Sufficient for JSON response
        responseMimeType: "application/json", // Request JSON response format
      },
    };

    // Make the API call to Gemini
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error("Gemini API error:", errorData);
      
      return NextResponse.json<AnalysisError>(
        {
          error: "API Error",
          message: "Failed to analyze image with Gemini API. Please try again.",
          details: `Status: ${geminiResponse.status}`,
        },
        { status: geminiResponse.status }
      );
    }

    // Parse Gemini response
    const geminiData = await geminiResponse.json();

    // Extract the text content from Gemini's response structure
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      return NextResponse.json<AnalysisError>(
        {
          error: "Parsing Error",
          message: "No content received from Gemini API. The image might not contain recognizable food.",
        },
        { status: 500 }
      );
    }

    // Parse the JSON response from Gemini
    let analysisResult: AnalysisResult;
    try {
      // If responseMimeType is application/json, Gemini should return pure JSON
      analysisResult = JSON.parse(textContent) as AnalysisResult;
    } catch (parseError) {
      // Fallback: try to extract JSON from text if it's wrapped
      try {
        analysisResult = parseGeminiResponse(textContent);
      } catch (fallbackError) {
        console.error("Failed to parse Gemini response:", textContent);
        return NextResponse.json<AnalysisError>(
          {
            error: "Parsing Error",
            message: "Could not parse the analysis response. The model may not have returned valid JSON.",
            details: "Please try with a clearer food image.",
          },
          { status: 500 }
        );
      }
    }

    // Validate the parsed result structure
    if (!analysisResult.foodItem || !Array.isArray(analysisResult.ingredients) || !Array.isArray(analysisResult.breakdown)) {
      return NextResponse.json<AnalysisError>(
        {
          error: "Validation Error",
          message: "The analysis response is missing required fields. Please try again.",
        },
        { status: 500 }
      );
    }

    // Check confidence if provided (low confidence indicates uncertainty)
    if (analysisResult.confidence !== undefined && analysisResult.confidence < 0.5) {
      return NextResponse.json<AnalysisError>(
        {
          error: "Low Confidence",
          message: "Could not confidently identify the food in the image. Please try another image with a clearer view of the food item.",
        },
        { status: 400 }
      );
    }

    // Calculate nutrients based on the ingredients
    const nutritionResult = calculateNutrition(analysisResult.ingredients);

    // Return the successfully parsed analysis result with nutrients
    return NextResponse.json({
      ...analysisResult,
      nutrients: nutritionResult
    }, { status: 200 });

  } catch (error) {
    // Handle unexpected errors
    console.error("Unexpected error in /api/analyze:", error);
    
    return NextResponse.json<AnalysisError>(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred while processing your request.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

