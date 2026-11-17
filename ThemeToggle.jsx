import React, { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getStoredTheme, toggleTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getStoredTheme());

  const handleToggle = () => {
    setTheme(toggleTheme());
  };

  return (
    <button
      onClick={handleToggle}
      className="w-full h-12 rounded-2xl border border-border font-medium text-foreground flex items-center justify-center gap-2 transition active:scale-[0.99]"
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-4 h-4" /> Switch to light mode
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" /> Switch to dark mode
        </>
      )}
    </button>
  );
}
