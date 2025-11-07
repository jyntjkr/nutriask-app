"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, PieLabelRenderProps } from "recharts";

interface Ingredient {
  name: string;
  quantity: number;
}

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number; // Add index signature
}

const Results = () => {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("ingredients");
    if (stored) {
      const parsed = JSON.parse(stored) as Ingredient[];
      setIngredients(parsed);
      
      // Mock nutrition calculation (replace with API call)
      const mockNutrition = calculateMockNutrition(parsed);
      setNutrition(mockNutrition);
    } else {
      router.push("/analyze");
    }
  }, [router]);

  const calculateMockNutrition = (ingredients: Ingredient[]): NutritionData => {
    // Mock calculation - replace with actual API call
    const totalWeight = ingredients.reduce((sum, ing) => sum + ing.quantity, 0);
    return {
      calories: Math.round(totalWeight * 1.2),
      protein: Math.round(totalWeight * 0.08),
      carbs: Math.round(totalWeight * 0.25),
      fat: Math.round(totalWeight * 0.05),
      fiber: Math.round(totalWeight * 0.03),
    };
  };

  if (!nutrition) {
    return null;
  }

  const chartData: ChartData[] = [
    { name: "Protein", value: nutrition.protein, color: "#36946D" },
    { name: "Carbs", value: nutrition.carbs, color: "#F59E0B" },
    { name: "Fat", value: nutrition.fat, color: "#EF4444" },
  ];

  const suggestions = [
    {
      title: "Boost Protein",
      description: "Add 50g paneer or tofu to increase protein by 8g",
      icon: "🧀",
    },
    {
      title: "Increase Fiber",
      description: "Swap white rice with brown rice for +2g fiber",
      icon: "🌾",
    },
    {
      title: "Reduce Calories",
      description: "Use less oil in cooking to save ~45 calories",
      icon: "💧",
    },
  ];

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

          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold mb-4">Nutrition Breakdown</h1>
            <p className="text-lg text-muted-foreground">
              Based on your ingredients
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Summary Card */}
            <Card className="p-8 bg-gradient-card border-none shadow-soft animate-scale-in">
              <h2 className="text-2xl font-semibold mb-6">Total Nutrition</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-background rounded-lg">
                  <span className="text-lg">Calories</span>
                  <span className="text-2xl font-bold text-primary">{nutrition.calories} kcal</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-background rounded-lg">
                  <span className="text-lg">Protein</span>
                  <span className="text-2xl font-bold text-secondary">{nutrition.protein}g</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-background rounded-lg">
                  <span className="text-lg">Carbohydrates</span>
                  <span className="text-2xl font-bold text-accent">{nutrition.carbs}g</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-background rounded-lg">
                  <span className="text-lg">Fat</span>
                  <span className="text-2xl font-bold text-destructive">{nutrition.fat}g</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-background rounded-lg">
                  <span className="text-lg">Fiber</span>
                  <span className="text-2xl font-bold text-foreground">{nutrition.fiber}g</span>
                </div>
              </div>
            </Card>

            {/* Chart Card */}
            <Card className="p-8 bg-gradient-card border-none shadow-soft animate-scale-in">
              <h2 className="text-2xl font-semibold mb-6">Macronutrient Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: PieLabelRenderProps) => {
                      const entry = chartData[props.index];
                      return `${entry.name} ${((entry.value / chartData.reduce((sum, e) => sum + e.value, 0)) * 100).toFixed(0)}%`;
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Ingredients Breakdown */}
          <Card className="p-8 mb-8 bg-gradient-card border-none shadow-soft animate-fade-in">
            <h2 className="text-2xl font-semibold mb-6">Ingredient Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4">Ingredient</th>
                    <th className="text-right py-3 px-4">Quantity</th>
                    <th className="text-right py-3 px-4">Calories</th>
                    <th className="text-right py-3 px-4">Protein</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient, index) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="py-3 px-4 capitalize">{ingredient.name}</td>
                      <td className="text-right py-3 px-4">{ingredient.quantity}g</td>
                      <td className="text-right py-3 px-4 text-primary font-medium">
                        {Math.round(ingredient.quantity * 1.2)} kcal
                      </td>
                      <td className="text-right py-3 px-4 text-secondary font-medium">
                        {Math.round(ingredient.quantity * 0.08)}g
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Suggestions */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Smart Suggestions</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {suggestions.map((suggestion, index) => (
                <Card 
                  key={index}
                  className="p-6 bg-gradient-card border-none shadow-soft hover:shadow-hover transition-smooth animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-4xl mb-4">{suggestion.icon}</div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    {suggestion.title}
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Optimize
                    </Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Goal Filters */}
          <Card className="p-6 bg-gradient-card border-none shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Filter by Goal</h3>
            <div className="flex flex-wrap gap-3">
              <Badge className="cursor-pointer hover:bg-secondary transition-colors px-4 py-2">
                High Protein
              </Badge>
              <Badge className="cursor-pointer hover:bg-secondary transition-colors px-4 py-2">
                High Fiber
              </Badge>
              <Badge className="cursor-pointer hover:bg-secondary transition-colors px-4 py-2">
                Low Calorie
              </Badge>
              <Badge className="cursor-pointer hover:bg-secondary transition-colors px-4 py-2">
                Low Carb
              </Badge>
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Results;
