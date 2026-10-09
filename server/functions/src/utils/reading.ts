/** Shared TV reading preferences. Sizes remain owned by the adaptive TV layout. */
export interface ReadingPreference {
  font: "system" | "opendyslexic";
  colors: "theme" | "warm" | "contrast";
  textColor: string | null;
  weight: "standard" | "bold";
  spacing: "standard" | "relaxed";
}

export const DEFAULT_READING: ReadingPreference = {
  font: "system", colors: "theme", textColor: null, weight: "standard", spacing: "standard",
};
export const DYSLEXIA_READING: ReadingPreference = {
  font: "opendyslexic", colors: "warm", textColor: null, weight: "standard", spacing: "relaxed",
};

export function validReading(value: unknown): value is ReadingPreference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as ReadingPreference;
  return Object.keys(item).every((key) => ["font", "colors", "textColor", "weight", "spacing"].includes(key)) &&
    ["system", "opendyslexic"].includes(item.font) && ["theme", "warm", "contrast"].includes(item.colors) &&
    (item.textColor === null || (typeof item.textColor === "string" && /^#[0-9a-fA-F]{6}$/.test(item.textColor))) &&
    ["standard", "bold"].includes(item.weight) && ["standard", "relaxed"].includes(item.spacing);
}

export function normalizeReading(value: unknown): ReadingPreference {
  return validReading(value) ? {...value} : {...DEFAULT_READING};
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
}

export function contrastRatio(ink: string, background: string): number {
  const a = luminance(ink); const b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

/** Respect preferred ink where it meets normal-text contrast on this surface. */
export function readingInk(preferred: string | null, background: string, fallback: string): string {
  return preferred && contrastRatio(preferred, background) >= 4.5 ? preferred : fallback;
}

export function readingColors(reading: ReadingPreference) {
  return reading.colors === "warm"
    ? {background: "#181818", surface: "#242424", focused: "#333333", primary: "#FFF1D6", secondary: "#E8DCC4", accent: "#FFD38A"}
    : reading.colors === "contrast"
      ? {background: "#000000", surface: "#000000", focused: "#242424", primary: "#FFFFFF", secondary: "#FFFFFF", accent: "#FDE047"}
      : null;
}
