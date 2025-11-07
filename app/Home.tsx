"use client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Leaf, TrendingUp, Apple } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-image.png";

const Home = () => {
  const popularDishes = [
    {
      name: "Paneer Tikka",
      calories: 320,
      protein: 18,
      image: "🧀",
    },
    {
      name: "Dal Tadka",
      calories: 180,
      protein: 12,
      image: "🥘",
    },
    {
      name: "Palak Paneer",
      calories: 250,
      protein: 15,
      image: "🥬",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  NutriAsk
                </span>
              </h1>
              <p className="text-3xl md:text-4xl font-semibold text-foreground">
                Know your food.
                <br />
                Optimize your plate.
              </p>
              <p className="text-lg text-muted-foreground max-w-xl">
                Discover healthier, nutrition-optimized Indian meal options. 
                Upload ingredients, analyze nutrition, and get personalized suggestions.
              </p>
              <div className="flex gap-4">
                <Link href="/analyze">
                  <Button variant="default" size="lg" className="group">
                    Get Started
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative animate-scale-in">
              <div className="absolute inset-0 bg-gradient-hero opacity-20 blur-3xl rounded-full"></div>
              <div className="relative rounded-2xl shadow-hover overflow-hidden">
                <Image 
                  src={heroImage} 
                  alt="Colorful Indian spices and fresh ingredients" 
                  className="w-full h-auto object-cover"
                  priority
                  width={800}
                  height={600}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 bg-gradient-card border-none shadow-soft hover:shadow-hover transition-smooth">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Leaf className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Ingredient Analysis</h3>
              <p className="text-muted-foreground">
                Upload photos or type ingredients to get instant nutritional breakdown.
              </p>
            </Card>
            
            <Card className="p-6 bg-gradient-card border-none shadow-soft hover:shadow-hover transition-smooth">
              <div className="bg-secondary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Optimization</h3>
              <p className="text-muted-foreground">
                Get personalized suggestions to boost protein, fiber, or reduce calories.
              </p>
            </Card>
            
            <Card className="p-6 bg-gradient-card border-none shadow-soft hover:shadow-hover transition-smooth">
              <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Apple className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Indian Recipes</h3>
              <p className="text-muted-foreground">
                Discover healthy Indian dishes you can make with available ingredients.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Popular Dishes Preview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Popular Nutritious Dishes</h2>
            <p className="text-muted-foreground">Quick nutrition preview of favorite Indian meals</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {popularDishes.map((dish, index) => (
              <Card 
                key={index} 
                className="p-6 bg-gradient-card border-none shadow-soft hover:shadow-hover transition-smooth hover:scale-105 cursor-pointer"
              >
                <div className="text-5xl mb-4 text-center">{dish.image}</div>
                <h3 className="text-xl font-semibold mb-3 text-center">{dish.name}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Calories</span>
                    <span className="font-medium text-primary">{dish.calories} kcal</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Protein</span>
                    <span className="font-medium text-secondary">{dish.protein}g</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
