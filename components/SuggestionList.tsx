"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IngredientSuggestion } from "@/lib/types";
import { ArrowRight, Lightbulb, Sparkles } from "lucide-react";

interface SuggestionListProps {
  suggestions: IngredientSuggestion[];
  title?: string;
}

/**
 * SuggestionList Component
 * 
 * Displays Gemini-powered ingredient substitution suggestions
 * in a user-friendly format with visual indicators.
 */
export default function SuggestionList({ 
  suggestions, 
  title = "Smart Substitution Suggestions" 
}: SuggestionListProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-card border-none shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Healthier ingredient alternatives based on your dietary preferences
      </p>

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="p-4 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-foreground capitalize">
                    {suggestion.ingredient}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-primary capitalize">
                    {suggestion.suggestion}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {suggestion.reason}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

