"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Type, ArrowRight, X, Loader2, Camera, CameraOff, Circle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { AnalysisResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface Ingredient {
  name: string;
  quantity: number;
}

const DIETARY_FILTERS = ["Low Carb", "High Protein", "Vegan", "Vegetarian", "Gluten Free", "Low Fat"];
const USER_GOALS = ["Weight Loss", "Muscle Gain", "Balanced Diet", "Heart Health", "Energy Boost"];

const Analyze = () => {
  const router = useRouter();
  const [inputMethod, setInputMethod] = useState<"upload" | "camera" | "text">("upload");
  const [ingredientText, setIngredientText] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Filter and goal selection state
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  
  // Camera-related state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
   * Starts the camera stream using MediaDevices API
   * Requests access to user's camera and displays live preview
   * Mobile-first approach with proper video ready state handling
   */
  const startCamera = async () => {
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Camera access is not supported in your browser.");
        return;
      }

      setIsVideoReady(false);

      // Request camera access - mobile-first settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile devices
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraActive(true);

      // Display the video stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        let readyTimeout: NodeJS.Timeout;
        let metadataHandler: (() => void) | null = null;

        // Cleanup function
        const cleanup = () => {
          if (readyTimeout) clearTimeout(readyTimeout);
          if (metadataHandler && videoRef.current) {
            videoRef.current.removeEventListener("loadedmetadata", metadataHandler);
          }
        };

        // Handler for when metadata loads
        metadataHandler = () => {
          cleanup();
          setIsVideoReady(true);
          toast.success("Camera ready!");
        };

        // Add the event listener
        videoRef.current.addEventListener("loadedmetadata", metadataHandler);

        // Fallback timeout - if metadata doesn't load in 2 seconds, force ready state
        readyTimeout = setTimeout(() => {
          cleanup();
          setIsVideoReady(true);
          console.warn("Camera ready state forced by timeout");
        }, 2000);

        // Try to play video
        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        } catch (playError) {
          console.warn("Video autoplay failed:", playError);
          // Continue anyway - video might still work
        }
      }

    } catch (error) {
      console.error("Error accessing camera:", error);
      setIsCameraActive(false);
      setIsVideoReady(false);
      
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          toast.error("Camera access denied. Please allow camera permissions in your browser settings.");
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          toast.error("No camera found on your device.");
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
          toast.error("Camera is already in use by another application.");
        } else {
          toast.error(`Failed to access camera: ${error.message}`);
        }
      } else {
        toast.error("Failed to access camera. Please try again.");
      }
    }
  };

  /**
   * Stops the camera stream and cleans up resources
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsVideoReady(false);
    setCapturedImage(null);
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      // Remove event listeners
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onplaying = null;
    }
  }, []);

  /**
   * Captures a photo from the live camera stream
   * Converts video frame to image and prepares it for analysis
   * Mobile-first approach with proper validation
   */
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      toast.error("Camera not properly initialized. Please try again.");
      return;
    }

    // Use video element dimensions with reasonable fallbacks
    let width = video.videoWidth || video.clientWidth || 640;
    let height = video.videoHeight || video.clientHeight || 480;

    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Failed to get canvas context.");
      return;
    }

    try {
      canvas.width = width;
      canvas.height = height;

      // Draw the current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob, then to File
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size === 0) {
            toast.error("Failed to capture photo. Please try again.");
            return;
          }

          const file = new File([blob], "captured-photo.jpg", {
            type: "image/jpeg",
          });

          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
          setUploadedImage(imageUrl);
          setUploadedFile(file);

          stopCamera();

          toast.success("Photo captured! Click 'Analyze' to identify the food.");
        },
        "image/jpeg",
        0.95
      );
    } catch (error) {
      console.error("Error capturing photo:", error);
      toast.error("Failed to capture photo. Please try again.");
    }
  };

  /**
   * Combined handler that:
   * 1. Extracts ingredients from image and matches to nutrition database
   * 2. Performs full food analysis
   * 3. Combines both results for display
   */
  const handleAnalyzeImage = async () => {
    if (!uploadedFile) {
      toast.error("Please upload or capture an image first.");
      return;
    }

    setIsAnalyzing(true);
    toast.loading("Analyzing food and calculating nutrition...", { id: "analyzing" });

    try {
      // Create FormData to send the image file
      const formData = new FormData();
      formData.append("image", uploadedFile);
      
      // Add filters and goals if selected
      if (selectedFilters.length > 0) {
        formData.append("filters", JSON.stringify(selectedFilters));
      }
      if (selectedGoals.length > 0) {
        formData.append("goals", JSON.stringify(selectedGoals));
      }

      // Perform full food analysis (this already includes nutrition calculation)
      const analysisResponse = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const analysisData = await analysisResponse.json();

      if (!analysisResponse.ok) {
        const error = analysisData as { error: string; message: string; details?: string };
        toast.error(error.message || "Failed to analyze image", { id: "analyzing" });
        setIsAnalyzing(false);
        return;
      }

      // Success: The analysis result already includes nutrition data
      const analysisResult = analysisData as AnalysisResult;
      
      // Extract nutrition data from the analysis result
      // The analysis API already calculated nutrition based on the same ingredients
      if (analysisResult.nutrients) {
        sessionStorage.setItem("nutritionResult", JSON.stringify(analysisResult.nutrients));
      }
      
      // Store the analysis result
      sessionStorage.setItem("analysisResult", JSON.stringify(analysisResult));
      sessionStorage.setItem("resultType", "combined");
      
      toast.success("Analysis complete!", { id: "analyzing" });
      
      // Navigate to results page
      router.push("/results");

    } catch (error) {
      console.error("Error analyzing image:", error);
      toast.error("An unexpected error occurred. Please try again.", { id: "analyzing" });
      setIsAnalyzing(false);
    }
  };

  /**
   * Cleanup: Stop camera when component unmounts
   */
  useEffect(() => {
    return () => {
      // Stop camera stream if active
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
      // Clean up captured image URL
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [capturedImage]);

  /**
   * Stop camera when switching away from camera mode
   */
  useEffect(() => {
    if (inputMethod !== "camera" && isCameraActive) {
      stopCamera();
    }
  }, [inputMethod, isCameraActive, stopCamera]);

  /**
   * Clear sessionStorage suggestions when switching input methods
   */
  useEffect(() => {
    sessionStorage.removeItem("suggestions");
  }, [inputMethod]);

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

  const handleCalculate = async () => {
    if (ingredients.length === 0) {
      toast.error("Please add some ingredients first!");
      return;
    }
    
    setIsAnalyzing(true);
    toast.loading("Calculating nutrition...", { id: "calculating" });

    try {
      // Extract ingredient names and quantities
      const ingredientNames = ingredients.map(ing => ing.name);
      const quantities = ingredients.map(ing => ing.quantity);

      // Call the text ingredients API
      const response = await fetch("/api/ingredients/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ingredients: ingredientNames,
          quantities: quantities,
          filters: selectedFilters.length > 0 ? selectedFilters : undefined,
          goals: selectedGoals.length > 0 ? selectedGoals : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as { error: string; message: string; details?: string };
        toast.error(error.message || "Failed to calculate nutrition", { id: "calculating" });
        setIsAnalyzing(false);
        return;
      }

      // Store the nutrition result in sessionStorage
      sessionStorage.setItem("nutritionResult", JSON.stringify(data));
      
      // Store suggestions separately if available
      if (data.suggestions) {
        sessionStorage.setItem("suggestions", JSON.stringify(data.suggestions));
      }
      
      sessionStorage.setItem("resultType", "nutrition");
      
      toast.success("Nutrition calculated!", { id: "calculating" });
      
      // Navigate to results page
      router.push("/results");

    } catch (error) {
      console.error("Error calculating nutrition:", error);
      toast.error("An unexpected error occurred. Please try again.", { id: "calculating" });
      setIsAnalyzing(false);
    }
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

          {/* Filter and Goal Selection */}
          <Card className="p-6 mb-8 bg-gradient-card border-none shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Dietary Preferences (Optional)</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Dietary Filters</Label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_FILTERS.map((filter) => (
                    <Badge
                      key={filter}
                      variant={selectedFilters.includes(filter) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => {
                        setSelectedFilters(prev =>
                          prev.includes(filter)
                            ? prev.filter(f => f !== filter)
                            : [...prev, filter]
                        );
                      }}
                    >
                      {filter}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Health Goals</Label>
                <div className="flex flex-wrap gap-2">
                  {USER_GOALS.map((goal) => (
                    <Badge
                      key={goal}
                      variant={selectedGoals.includes(goal) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => {
                        setSelectedGoals(prev =>
                          prev.includes(goal)
                            ? prev.filter(g => g !== goal)
                            : [...prev, goal]
                        );
                      }}
                    >
                      {goal}
                    </Badge>
                  ))}
                </div>
              </div>
              {(selectedFilters.length > 0 || selectedGoals.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFilters([]);
                    setSelectedGoals([]);
                  }}
                  className="text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>
          </Card>

          {/* Input Method Selector */}
          <div className="flex gap-4 mb-8 justify-center flex-wrap">
            <Button
              variant={inputMethod === "upload" ? "default" : "outline"}
              onClick={() => setInputMethod("upload")}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Image
            </Button>
            <Button
              variant={inputMethod === "camera" ? "default" : "outline"}
              onClick={() => {
                setInputMethod("camera");
                if (!isCameraActive) {
                  startCamera();
                }
              }}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Use Camera
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

          {/* Camera Section */}
          {inputMethod === "camera" && (
            <Card className="p-8 mb-8 bg-gradient-card border-none shadow-soft animate-scale-in">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">
                    Capture Food Image
                  </Label>
                  {isCameraActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopCamera}
                      className="gap-2"
                    >
                      <CameraOff className="h-4 w-4" />
                      Stop Camera
                    </Button>
                  )}
                </div>

                {/* Camera Preview or Captured Image */}
                <div className="border-2 border-border rounded-lg overflow-hidden bg-black">
                  {capturedImage ? (
                    <div className="space-y-4 p-4">
                      <img 
                        src={capturedImage} 
                        alt="Captured food image" 
                        className="max-h-96 mx-auto rounded-lg shadow-soft w-full object-contain"
                      />
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setCapturedImage(null);
                            setUploadedImage(null);
                            setUploadedFile(null);
                            startCamera();
                          }}
                          className="gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          Retake
                        </Button>
                      </div>
                    </div>
                  ) : isCameraActive ? (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full max-h-96 object-contain"
                        style={{ 
                          transform: 'scaleX(-1)', // Mirror the video for better UX
                          WebkitTransform: 'scaleX(-1)'
                        }}
                      />
                      {/* Loading indicator */}
                      {!isVideoReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="text-center space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
                            <p className="text-white text-sm">Starting camera...</p>
                          </div>
                        </div>
                      )}
                      {/* Capture Button Overlay - only show when video is ready */}
                      {isVideoReady && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                          <Button
                            onClick={capturePhoto}
                            size="lg"
                            className="rounded-full w-16 h-16 p-0 bg-white hover:bg-gray-100 border-4 border-primary shadow-lg active:scale-95 transition-transform"
                            disabled={!isVideoReady}
                          >
                            <Circle className="h-8 w-8 text-primary fill-primary" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-12 text-center space-y-4">
                      <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-lg font-medium">Camera Ready</p>
                        <p className="text-sm text-muted-foreground">
                          Click "Start Camera" to begin
                        </p>
                      </div>
                      <Button
                        onClick={startCamera}
                        className="gap-2"
                        size="lg"
                      >
                        <Camera className="h-4 w-4" />
                        Start Camera
                      </Button>
                    </div>
                  )}
                </div>

                {/* Hidden canvas for capturing frames */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Analyze Button - shown when image is captured */}
                {(capturedImage || uploadedImage) && (
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