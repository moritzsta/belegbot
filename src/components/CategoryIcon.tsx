"use client";

import {
  Baby, BookOpen, Car, Coffee, Cpu, Dumbbell, Gift, HeartPulse, Home, Landmark,
  Music, Package, PawPrint, Plane, Shirt, ShoppingCart, Sparkles, Tag, Utensils, Wrench,
  type LucideIcon,
} from "lucide-react";

// TK-0005: Kuratiertes Icon-Set fuer Kategorien. Bewusst eine feste Liste mit
// expliziten Imports — lucide dynamisch nach Namen zu laden wuerde das ganze
// Icon-Paket ins Bundle ziehen.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  coffee: Coffee,
  home: Home,
  "heart-pulse": HeartPulse,
  shirt: Shirt,
  cpu: Cpu,
  car: Car,
  dumbbell: Dumbbell,
  plane: Plane,
  "book-open": BookOpen,
  sparkles: Sparkles,
  landmark: Landmark,
  gift: Gift,
  baby: Baby,
  "paw-print": PawPrint,
  wrench: Wrench,
  music: Music,
  package: Package,
  tag: Tag,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

interface Props {
  icon: string | null | undefined;
  color: string;
  /** Icon-Groesse; der Fallback-Punkt ist immer 8px. */
  size?: number;
}

/** Icon der Kategorie in ihrer Farbe — ohne Icon der bekannte Farbpunkt. */
export default function CategoryIcon({ icon, color, size = 16 }: Props) {
  const Icon = icon ? CATEGORY_ICONS[icon] : undefined;
  if (!Icon) {
    return (
      <span
        aria-hidden
        style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: color, boxShadow: `0 0 5px ${color}50`, display: "inline-block" }}
      />
    );
  }
  return <Icon size={size} color={color} style={{ flexShrink: 0 }} aria-hidden />;
}
