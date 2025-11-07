"use client";
import { Leaf } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-hero p-2 rounded-lg shadow-soft">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold bg-gradient-hero bg-clip-text text-transparent">
              NutriAsk
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground text-center md:text-left">
            Nutritional values are approximations based on IFCT 2017.
          </p>
          
          <p className="text-sm text-muted-foreground">
            © 2025 NutriAsk. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
