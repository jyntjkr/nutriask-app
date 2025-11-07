/**
 * TypeScript interfaces for Gemini API food analysis response
 * These types match the expected JSON structure from the Gemini API
 */

export interface BreakdownComponent {
  component: string;
  percent: number;
  type: string; // e.g., "grain", "protein", "vegetable", "spice", etc.
}

export interface AnalysisResult {
  foodItem: string;
  alternatives: string[];
  ingredients: string[];
  breakdown: BreakdownComponent[];
  explanation: string;
  confidence?: number; // Optional confidence score if provided by model
}

/**
 * Error response structure for API errors
 */
export interface AnalysisError {
  error: string;
  message: string;
  details?: string;
}

