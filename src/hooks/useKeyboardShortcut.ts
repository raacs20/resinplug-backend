"use client";
import { useEffect } from "react";

type Modifier = "ctrl" | "meta" | "shift" | "alt";

interface ShortcutConfig {
  key: string;
  modifiers?: Modifier[];
  handler: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcut(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable) {
        // Only allow Escape and Ctrl+S in inputs
        const isEscape = e.key === "Escape";
        const isSave = (e.ctrlKey || e.metaKey) && e.key === "s";
        if (!isEscape && !isSave) return;
      }
      
      for (const shortcut of shortcuts) {
        if (shortcut.disabled) continue;
        
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        if (!keyMatch) continue;
        
        const modifiers = shortcut.modifiers || [];
        const ctrlRequired = modifiers.includes("ctrl") || modifiers.includes("meta");
        const shiftRequired = modifiers.includes("shift");
        const altRequired = modifiers.includes("alt");
        
        const ctrlMatch = ctrlRequired ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = shiftRequired ? e.shiftKey : !e.shiftKey;
        const altMatch = altRequired ? e.altKey : !e.altKey;
        
        if (ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
