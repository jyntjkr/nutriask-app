"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NutritionResult, MatchedIngredient } from "@/lib/nutrition";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface NutrientDisplayProps {
  result: NutritionResult;
  title?: string;
}

/**
 * NutrientDisplay Component
 * 
 * Displays aggregated nutrition data and individual ingredient matches
 * in a user-friendly format with visual indicators.
 */
export default function NutrientDisplay({ result, title = "Nutrition Summary" }: NutrientDisplayProps) {
  const { aggregated, items } = result;

  // Count matched vs unmatched ingredients
  const matchedCount = items.filter(item => item.confidence && item.confidence > 0).length;
  const unmatchedCount = items.length - matchedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">{title}</h2>
        {unmatchedCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span>{unmatchedCount} ingredient{unmatchedCount !== 1 ? "s" : ""} could not be matched</span>
          </div>
        )}
      </div>

      {/* Aggregated Nutrition Card */}
      <Card className="p-6 bg-gradient-card border-none shadow-soft">
        <h3 className="text-xl font-semibold mb-4">Total Nutrition</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{aggregated.calories.toFixed(0)}</div>
            <div className="text-sm text-muted-foreground mt-1">Calories</div>
            <div className="text-xs text-muted-foreground">kcal</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{aggregated.protein.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground mt-1">Protein</div>
            <div className="text-xs text-muted-foreground">g</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{aggregated.carbs.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground mt-1">Carbs</div>
            <div className="text-xs text-muted-foreground">g</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{aggregated.fat.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground mt-1">Fat</div>
            <div className="text-xs text-muted-foreground">g</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{aggregated.fiber.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground mt-1">Fiber</div>
            <div className="text-xs text-muted-foreground">g</div>
          </div>
        </div>
      </Card>

      {/* Individual Ingredients */}
      <Card className="p-6 bg-gradient-card border-none shadow-soft">
        <h3 className="text-xl font-semibold mb-4">Ingredient Details</h3>
        <div className="space-y-3">
          {items.map((item: MatchedIngredient, index: number) => {
            const isMatched = item.confidence && item.confidence > 0;
            const nutrients = item.nutrients;

            return (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  isMatched
                    ? "bg-background/50 border-border"
                    : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium capitalize">{item.input}</span>
                      {isMatched ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    {/* {isMatched && item.match !== item.input && (
                      <div className="text-sm text-muted-foreground">
                        Matched to: <span className="font-medium">{item.match}</span>
                        {item.confidence && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {(item.confidence * 100).toFixed(0)}% match
                          </Badge>
                        )}
                      </div>
                    )} */}
                    {!isMatched && (
                      <div className="text-sm text-amber-600 dark:text-amber-400">
                        No match found in database
                      </div>
                    )}
                  </div>
                </div>

                {isMatched && (
                  <div className="grid grid-cols-5 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">Calories</div>
                      <div className="font-semibold">{nutrients.calories.toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Protein</div>
                      <div className="font-semibold text-blue-600 dark:text-blue-400">
                        {nutrients.protein.toFixed(1)}g
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Carbs</div>
                      <div className="font-semibold text-orange-600 dark:text-orange-400">
                        {nutrients.carbs.toFixed(1)}g
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Fat</div>
                      <div className="font-semibold text-red-600 dark:text-red-400">
                        {nutrients.fat.toFixed(1)}g
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Fiber</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">
                        {nutrients.fiber.toFixed(1)}g
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}



