import {readingInk} from "./reading";
import {DASHBOARD_CARD_IDS} from "./dashboardLayout";
import type {DashboardCardId} from "./dashboardLayout";

export interface CardStyle {
  backgroundColor: string;
  opacity: number;
  useThemeSurface?: boolean;
  borderWidth?: number;
  borderRadius?: number;
}
export type CardStyles = Partial<Record<DashboardCardId, CardStyle>>;

export function validCardStyles(value: unknown): value is CardStyles {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([id, style]) => {
    if (!DASHBOARD_CARD_IDS.includes(id as DashboardCardId) || !style || typeof style !== "object") return false;
    const item = style as CardStyle;
    return Object.keys(style).every((key) => ["backgroundColor", "opacity", "useThemeSurface", "borderWidth", "borderRadius"].includes(key)) &&
      typeof item.backgroundColor === "string" && /^#[0-9a-fA-F]{6}$/.test(item.backgroundColor) &&
      typeof item.opacity === "number" && Number.isFinite(item.opacity) && item.opacity >= 0 && item.opacity <= 1 &&
      (item.useThemeSurface === undefined || typeof item.useThemeSurface === "boolean") &&
      (item.borderWidth === undefined || (typeof item.borderWidth === "number" && Number.isFinite(item.borderWidth) && item.borderWidth >= 0 && item.borderWidth <= 4)) &&
      (item.borderRadius === undefined || (typeof item.borderRadius === "number" && Number.isInteger(item.borderRadius) && item.borderRadius >= 0 && item.borderRadius <= 32));
  });
}

function rgb(hex: string): number[] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}
function luminance(channels: number[]): number {
  const linear = channels.map((channel) => channel / 255).map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

/** Opacity affects only the surface; labels and artwork stay fully visible. */
export function cardSurface(style: CardStyle, focused = false): string {
  const [r, g, b] = rgb(style.backgroundColor);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, style.opacity + (focused ? 0.08 : 0))})`;
}

/** Choose text from the estimated composite, with a contrast-safe accent. */
export function cardInk(style: CardStyle, backdrop: string, accent: string, preferredInk: string | null = null) {
  const base = rgb(backdrop);
  const composite = rgb(style.backgroundColor).map((channel, i) => channel * style.opacity + base[i] * (1 - style.opacity));
  const light = luminance(composite);
  const contrastWith = (hex: string) => {
    const ink = luminance(rgb(hex));
    return (Math.max(light, ink) + 0.05) / (Math.min(light, ink) + 0.05);
  };
  let darkText = contrastWith("#111827") > contrastWith("#F8FAFC");
  let primary = darkText ? "#111827" : "#F8FAFC";
  if (contrastWith(primary) < 4.5) {
    darkText = contrastWith("#000000") > contrastWith("#FFFFFF");
    primary = darkText ? "#000000" : "#FFFFFF";
  }
  const compositeHex = "#" + composite.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
  primary = readingInk(preferredInk, compositeHex, primary);
  const secondary = darkText ? "#374151" : "#CBD5E1";
  const accentLight = luminance(rgb(accent));
  const contrast = (Math.max(light, accentLight) + 0.05) / (Math.min(light, accentLight) + 0.05);
  return {
    primary,
    secondary: contrastWith(secondary) >= 4.5 ? secondary : primary,
    accent: contrast >= 4.5 ? accent : primary,
    border: darkText ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.2)",
    subtle: darkText ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)",
  };
}
