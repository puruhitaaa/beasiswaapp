import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const currentTheme = theme === "system" ? resolvedTheme : theme;

  const toggleTheme = () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn btn-outline-secondary d-inline-flex align-items-center justify-content-center"
      style={{ height: "2.25rem", padding: 0, width: "2.25rem" }}
      aria-label="Toggle theme"
    >
      {currentTheme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
      <span className="visually-hidden">Toggle theme</span>
    </button>
  );
}
