"use client";
import { useState, useEffect } from "react";
import ZahraMobilGuest from "./ZahraMobilGuest";
import ZahraMobilGuestLight from "./ZahraMobilGuestLight";

export default function Home() {
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("zm-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("zm-theme", next);
  };

  if (!mounted) return null;

  return theme === "dark"
    ? <ZahraMobilGuest onToggleTheme={toggleTheme} />
    : <ZahraMobilGuestLight onToggleTheme={toggleTheme} />;
}
