"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Type, ArrowRight, X, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { AnalysisResult } from "@/lib/types";

interface Ingredient {
  name: string;
  quantity: number;
}

const Analyze = () => {
  const router = useRouter();
  const [inputMethod, setInputMethod] = useState<"upload" | "text">("upload");
  const [ingredientText, setIngredientText] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /**
   * Handles image file upload
   * Validates file size and type, then stores for analysis
   */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (7 MB limit for Gemini API)
      const maxSize = 7 * 1024 * 1024; // 7 MB
      if (file.size > maxSize) {
        toast.error(`Image is too large. Maximum size is ${maxSize / 1024 / 1024} MB.`);
        return;
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.");
        return;
      }

      // Store the file for API call
      setUploadedFile(file);

      // Preview the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        toast.success("Image uploaded! Click 'Analyze' to identify the food.");
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Sends the uploaded image to the Gemini API for analysis
   * Handles loading states, errors, and response parsing
   */
  const handleAnalyzeImage = async () => {
    if (!uploadedFile) {
      toast.error("Please upload an image first.");
      return;
    }

    setIsAnalyzing(true);
    toast.loading("Analyzing image...", { id: "analyzing" });

    try {
      // Create FormData to send the image file
      const formData = new FormData();
      formData.append("image", uploadedFile);

      // Call the API route
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle API errors
        const error = data as { error: string; message: string; details?: string };
        toast.error(error.message || "Failed to analyze image", { id: "analyzing" });
        setIsAnalyzing(false);
        return;
      }

      // Success: Parse the analysis result
      const analysisResult = data as AnalysisResult;
      
      // Store the result in sessionStorage for the results page
      sessionStorage.setItem("analysisResult", JSON.stringify(analysisResult));
      
      toast.success("Analysis complete!", { id: "analyzing" });
      
      // Navigate to results page
      router.push("/results");

    } catch (error) {
      console.error("Error analyzing image:", error);
      toast.error("An unexpected error occurred. Please try again.", { id: "analyzing" });
      setIsAnalyzing(false);
    }
  };

  const handleParseIngredients = () => {
    const parsed = ingredientText
      .split(",")
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => ({
        name: item,
        quantity: 100, // default 100g
      }));
    
    setIngredients(parsed);
    if (parsed.length > 0) {
      toast.success(`${parsed.length} ingredients parsed!`);
    }
  };

  const updateQuantity = (index: number, quantity: number) => {
    const updated = [...ingredients];
    updated[index].quantity = quantity;
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleCalculate = () => {
    if (ingredients.length === 0) {
      toast.error("Please add some ingredients first!");
      return;
    }
    
    // Store ingredients in sessionStorage for the results page
    sessionStorage.setItem("ingredients", JSON.stringify(ingredients));
    router.push("/results");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold mb-4">Analyze Your Ingredients</h1>
            <p className="text-lg text-muted-foreground">
              Upload a photo or type ingredients to get nutrition insights
            </p>
          </div>

          {/* Input Method Selector */}
          <div className="flex gap-4 mb-8 justify-center">
            <Button
              variant={inputMethod === "upload" ? "default" : "outline"}
              onClick={() => setInputMethod("upload")}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Image
            </Button>
            <Button
              variant={inputMethod === "text" ? "default" : "outline"}
              onClick={() => setInputMethod("text")}
              className="gap-2"
            >
              <Type className="h-4 w-4" />
              Type Ingredients
            </Button>
          </div>

          {/* Upload Section */}
          {inputMethod === "upload" && (
            <Card className="p-8 mb-8 bg-gradient-card border-none shadow-soft animate-scale-in">
              <div className="space-y-4">
                <Label htmlFor="image-upload" className="text-lg font-semibold">
                  Upload Food Image
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer">
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isAnalyzing}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    {uploadedImage ? (
                      <div className="space-y-4">
                        <img 
                          src={uploadedImage} 
                          alt="Uploaded food image" 
                          className="max-h-64 mx-auto rounded-lg shadow-soft"
                        />
                        <p className="text-sm text-muted-foreground">
                          Click to change image
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="h-16 w-16 mx-auto text-muted-foreground" />
                        <div>
                          <p className="text-lg font-medium">Click to upload image</p>
                          <p className="text-sm text-muted-foreground">
                            or drag and drop (Max 7 MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
                
                {/* Analyze Button - shown when image is uploaded */}
                {uploadedImage && (
                  <Button
                    onClick={handleAnalyzeImage}
                    disabled={isAnalyzing}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Analyze Food
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Text Input Section */}
          {inputMethod === "text" && (
            <Card className="p-8 mb-8 bg-gradient-card border-none shadow-soft animate-scale-in">
              <div className="space-y-4">
                <Label htmlFor="ingredients" className="text-lg font-semibold">
                  Enter Ingredients
                </Label>
                <Textarea
                  id="ingredients"
                  placeholder="Enter ingredients separated by commas (e.g., rice, dal, paneer, tomato, onion)"
                  value={ingredientText}
                  onChange={(e) => setIngredientText(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <Button onClick={handleParseIngredients} className="w-full">
                  Parse Ingredients
                </Button>
              </div>
            </Card>
          )}

          {/* Parsed Ingredients List */}
          {ingredients.length > 0 && (
            <Card className="p-8 mb-8 bg-gradient-card border-none shadow-soft animate-fade-in">
              <h3 className="text-xl font-semibold mb-6">Adjust Quantities</h3>
              <div className="space-y-4">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-background rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium capitalize">{ingredient.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={ingredient.quantity}
                        onChange={(e) => updateQuantity(index, Number(e.target.value))}
                        className="w-24"
                        min="1"
                      />
                      <span className="text-sm text-muted-foreground">grams</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={handleCalculate} 
                className="w-full mt-6 gap-2"
                size="lg"
              >
                Calculate Nutrition
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Analyze;