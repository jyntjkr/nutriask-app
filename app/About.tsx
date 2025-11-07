import { Card } from "@/components/ui/card";
import { Leaf, Target, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl font-bold mb-4">About NutriAsk</h1>
            <p className="text-lg text-muted-foreground">
              Making healthy Indian cooking easy, personalized, and data-driven
            </p>
          </div>

          <div className="space-y-8">
            <Card className="p-8 bg-gradient-card border-none shadow-soft animate-scale-in">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Leaf className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-3">Our Mission</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    NutriAsk empowers you to make informed decisions about your Indian meals. 
                    We believe that healthy eating shouldn't be complicated or require giving up 
                    your favorite traditional dishes. Our AI-powered platform helps you understand 
                    what's in your food and how to optimize it for your health goals.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-gradient-card border-none shadow-soft animate-scale-in">
              <div className="flex items-start gap-4">
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <Target className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-3">How It Works</h2>
                  <div className="space-y-3 text-muted-foreground">
                    <p>
                      <strong className="text-foreground">1. Input Your Ingredients:</strong> Upload a photo 
                      or type in what you're cooking with.
                    </p>
                    <p>
                      <strong className="text-foreground">2. Get Instant Analysis:</strong> See detailed 
                      nutrition breakdown including calories, protein, carbs, fat, and fiber.
                    </p>
                    <p>
                      <strong className="text-foreground">3. Optimize Your Meal:</strong> Receive personalized 
                      suggestions to boost protein, increase fiber, or reduce calories.
                    </p>
                    <p>
                      <strong className="text-foreground">4. Discover New Dishes:</strong> Find other healthy 
                      Indian recipes you can make with your available ingredients.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-gradient-card border-none shadow-soft animate-scale-in">
              <div className="flex items-start gap-4">
                <div className="bg-accent/10 p-3 rounded-lg">
                  <Heart className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-3">Our Approach</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We use data from the Indian Food Composition Tables (IFCT 2017) to provide 
                    accurate nutritional information specific to Indian ingredients and cooking methods. 
                    Our recommendations are based on established nutritional science and tailored to 
                    Indian dietary patterns.
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    Note: Nutritional values are approximations and may vary based on specific brands, 
                    preparation methods, and ingredient quality.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;
