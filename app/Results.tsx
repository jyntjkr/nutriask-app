"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, PieLabelRenderProps, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { AnalysisResult, BreakdownComponent, IngredientSuggestion } from "@/lib/types";
import { NutritionResult } from "@/lib/nutrition";
import NutrientDisplay from "@/components/NutrientDisplay";
import SuggestionList from "@/components/SuggestionList";

/**
 * Color mapping for different component types in the breakdown chart
 * This helps visualize different categories of food components
 */
const getComponentColor = (type: string, index: number): string => {
  const colorMap: Record<string, string> = {
    grain: "#F59E0B",      // Orange for grains
    protein: "#EF4444",    // Red for proteins
    vegetable: "#36946D",  // Green for vegetables
    spice: "#8B5CF6",      // Purple for spices
    dairy: "#3B82F6",      // Blue for dairy
    other: "#6B7280",      // Gray for other
  };
  
  // Fallback colors if type doesn't match
  const fallbackColors = ["#F59E0B", "#EF4444", "#36946D", "#8B5CF6", "#3B82F6", "#6B7280"];
  
  return colorMap[type.toLowerCase()] || fallbackColors[index % fallbackColors.length];
};

interface ChartData {
  name: string;
  value: number;
  color: string;
  type: string;
  [key: string]: string | number;
}

const Results = () => {
  const router = useRouter();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [nutritionResult, setNutritionResult] = useState<NutritionResult | null>(null);
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [resultType, setResultType] = useState<"analysis" | "nutrition" | "combined" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Loads the result from sessionStorage
   * Can be either an analysis result, nutrition result, or combined
   */
  useEffect(() => {
    const type = sessionStorage.getItem("resultType");
    setResultType(type as "analysis" | "nutrition" | "combined" | null);

    if (type === "analysis") {
      const stored = sessionStorage.getItem("analysisResult");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AnalysisResult;
          setAnalysisResult(parsed);
        } catch (error) {
          console.error("Failed to parse analysis result:", error);
          router.push("/analyze");
        }
      } else {
        router.push("/analyze");
      }
    } else if (type === "nutrition") {
      const stored = sessionStorage.getItem("nutritionResult");
      const suggestionsStored = sessionStorage.getItem("suggestions");
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as NutritionResult;
          setNutritionResult(parsed);
        } catch (error) {
          console.error("Failed to parse nutrition result:", error);
          router.push("/analyze");
        }
      } else {
        router.push("/analyze");
      }
      
      // Load suggestions if available
      if (suggestionsStored) {
        try {
          const parsed = JSON.parse(suggestionsStored) as IngredientSuggestion[];
          setSuggestions(parsed);
        } catch (error) {
          console.error("Failed to parse suggestions:", error);
        }
      }
    } else if (type === "combined") {
      // Load both results
      const analysisStored = sessionStorage.getItem("analysisResult");
      const nutritionStored = sessionStorage.getItem("nutritionResult");
      const suggestionsStored = sessionStorage.getItem("suggestions");
      
      if (analysisStored) {
        try {
          const parsed = JSON.parse(analysisStored) as AnalysisResult;
          setAnalysisResult(parsed);
          // Extract suggestions from analysis result if available
          if (parsed.suggestions) {
            setSuggestions(parsed.suggestions);
          }
        } catch (error) {
          console.error("Failed to parse analysis result:", error);
        }
      }
      
      if (nutritionStored) {
        try {
          const parsed = JSON.parse(nutritionStored) as NutritionResult;
          setNutritionResult(parsed);
        } catch (error) {
          console.error("Failed to parse nutrition result:", error);
        }
      }
      
      // Load suggestions from separate storage if available
      if (suggestionsStored) {
        try {
          const parsed = JSON.parse(suggestionsStored) as IngredientSuggestion[];
          setSuggestions(parsed);
        } catch (error) {
          console.error("Failed to parse suggestions:", error);
        }
      }
      
      if (!analysisStored && !nutritionStored) {
        router.push("/analyze");
      }
    } else {
      // No result found, redirect to analyze page
      router.push("/analyze");
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render nutrition-only result if available
  if (resultType === "nutrition" && nutritionResult && !analysisResult) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <Button
              variant="ghost"
              onClick={() => router.push("/analyze")}
              className="mb-6 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Analyze
            </Button>

            <NutrientDisplay 
              result={nutritionResult}
              title="Nutrition Analysis"
            />
            
            {/* Show suggestions if available */}
            {suggestions.length > 0 && (
              <div className="mt-8">
                <SuggestionList suggestions={suggestions} />
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // Render analysis result (with optional nutrition data)
  if ((resultType === "analysis" || resultType === "combined") && analysisResult) {
    // Continue with analysis rendering below...
  } else {
    return null;
  }

  /**
   * Transform breakdown data for chart visualization
   * Converts the breakdown array into chart-friendly format with colors
   */
  const chartData: ChartData[] = analysisResult.breakdown.map((item: BreakdownComponent, index: number) => ({
    name: item.component,
    value: item.percent,
    type: item.type,
    color: getComponentColor(item.type, index),
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <Button
            variant="ghost"
            onClick={() => router.push("/analyze")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analyze
          </Button>

          {/* Food Identification Section */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">{analysisResult.foodItem}</h1>
            {analysisResult.alternatives && analysisResult.alternatives.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                <span className="text-sm text-muted-foreground">Also known as:</span>
                {analysisResult.alternatives.map((alt, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {alt}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-lg text-muted-foreground">
              Food Analysis Results
            </p>
          </div>

          {/* Ingredients List */}
          <Card className="p-8 mb-8 bg-gradient-card border-none shadow-soft animate-fade-in">
            <h2 className="text-2xl font-semibold mb-6">Key Ingredients</h2>
            <div className="flex flex-wrap gap-3">
              {analysisResult.ingredients.map((ingredient, index) => (
                <Badge key={index} variant="secondary" className="text-sm px-4 py-2">
                  {ingredient}
                </Badge>
              ))}
            </div>
            {nutritionResult && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  These ingredients are used for nutrition calculation below.
                </p>
              </div>
            )}
          </Card>

          {/* Breakdown Chart Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Pie Chart Card */}
            <Card className="p-8 bg-gradient-card border-none shadow-soft animate-scale-in">
              <h2 className="text-2xl font-semibold mb-6">Component Breakdown (Pie Chart)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: PieLabelRenderProps) => {
                      const entry = chartData[props.index];
                      const total = chartData.reduce((sum, e) => sum + Number(e.value), 0);
                      const percentage = total > 0 ? ((Number(entry.value) / total) * 100).toFixed(0) : 0;
                      return `${entry.name}: ${percentage}%`;
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${value}%`}
                    labelFormatter={(label) => `Component: ${label}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Bar Chart Card */}
            <Card className="p-8 bg-gradient-card border-none shadow-soft animate-scale-in">
              <h2 className="text-2xl font-semibold mb-6">Component Breakdown (Bar Chart)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => `${value}%`}
                    labelFormatter={(label) => `Component: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8">
                    {chartData.map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Component Breakdown Table */}
          <Card className="p-8 mb-8 bg-gradient-card border-none shadow-soft animate-fade-in">
            <h2 className="text-2xl font-semibold mb-6">Component Breakdown Details</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4">Component</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-right py-3 px-4">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResult.breakdown.map((item, index) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="py-3 px-4 font-medium capitalize">{item.component}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize">
                          {item.type}
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-4 text-primary font-bold">
                        {item.percent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Explanation Section */}
          <Card className="p-8 mb-8 bg-gradient-card border-none shadow-soft animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Analysis Explanation</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {analysisResult.explanation}
            </p>
          </Card>

          {/* Nutrition Data Section - shown when nutrition result is available */}
          {nutritionResult && (
            <div className="mb-8 animate-fade-in">
              <NutrientDisplay 
                result={nutritionResult}
                title="Detailed Nutrition Information"
              />
            </div>
          )}

          {/* Suggestions Section - shown when suggestions are available */}
          {suggestions.length > 0 && (
            <div className="mb-8 animate-fade-in">
              <SuggestionList suggestions={suggestions} />
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Results;
