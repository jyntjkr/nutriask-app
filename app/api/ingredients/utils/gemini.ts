import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * TypeScript interface for ingredient substitution suggestions
 */
export interface IngredientSuggestion {
  ingredient: string;
  suggestion: string;
  reason: string;
}

/**
 * Gets smart ingredient substitution suggestions from Gemini API
 * 
 * @param ingredients Array of ingredient names
 * @param filters Optional dietary filters (e.g., "Low Carb", "High Protein", "Vegan")
 * @param goals Optional user goals (e.g., "Weight Loss", "Muscle Gain", "Balanced Diet")
 * @returns Array of substitution suggestions
 */
export async function getSmartSuggestions(
  ingredients: string[],
  filters?: string[],
  goals?: string[]
): Promise<IngredientSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not configured, skipping suggestions");
    return [];
  }

  if (!ingredients || ingredients.length === 0) {
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build the prompt dynamically
    let prompt = `You are a nutrition expert. Given the following ingredients, suggest healthier substitutions.

Ingredients: ${ingredients.join(", ")}

`;

    // Add filters context
    if (filters && filters.length > 0) {
      prompt += `Dietary Filters: ${filters.join(", ")}\n\n`;
    }

    // Add goals context
    if (goals && goals.length > 0) {
      prompt += `User Goals: ${goals.join(", ")}\n\n`;
    }

    prompt += `Please suggest healthier or more nutritious alternatives for each ingredient. 

IMPORTANT: You MUST respond with ONLY valid JSON, no additional commentary, no markdown formatting, no code blocks.

The JSON structure must be exactly an array:
[
  {
    "ingredient": "original ingredient name",
    "suggestion": "suggested alternative",
    "reason": "brief reason for the substitution (e.g., 'Higher fiber and protein', 'Lower fat, higher protein')"
  }
]

Rules:
- Only suggest substitutions that are genuinely healthier or more nutritious
- If an ingredient is already optimal, you may omit it from suggestions
- Keep reasons concise (one short sentence)
- Use common food names
- Return an empty array [] if no good substitutions are available

Respond with ONLY the JSON array, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let suggestions: IngredientSuggestion[] = [];
    
    try {
      // Try direct JSON parse first
      suggestions = JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find JSON array in response
        const jsonArrayMatch = text.match(/\[[\s\S]*\]/);
        if (jsonArrayMatch) {
          suggestions = JSON.parse(jsonArrayMatch[0]);
        } else {
          console.warn("Could not parse Gemini suggestions response:", text);
          return [];
        }
      }
    }

    // Validate the response structure
    if (!Array.isArray(suggestions)) {
      console.warn("Gemini suggestions response is not an array:", suggestions);
      return [];
    }

    // Validate each suggestion has required fields
    suggestions = suggestions.filter((suggestion: any) => {
      return (
        suggestion &&
        typeof suggestion.ingredient === "string" &&
        typeof suggestion.suggestion === "string" &&
        typeof suggestion.reason === "string" &&
        suggestion.ingredient.trim().length > 0 &&
        suggestion.suggestion.trim().length > 0
      );
    });

    return suggestions;
  } catch (error) {
    console.error("Error getting smart suggestions from Gemini:", error);
    return [];
  }
}

