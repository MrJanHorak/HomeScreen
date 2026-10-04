// Bounds keep each library/history document comfortably below Firestore's 1 MiB limit.
export const MAX_DESIGNS = 20;
export const MAX_REVISIONS = 30;
export interface SavedDesign {
  id: string;
  name: string;
  appearance: Record<string, unknown>;
  updatedAtMs: number;
}
export interface AppearanceDraft {
  appearance: Record<string, unknown>;
  baseUpdatedAtMs: number;
}
export interface PublishedRevision {
  appearance: Record<string, unknown>;
  updatedAtMs: number;
  changedBy: string;
  source: "web" | "tv" | "previous";
}
export interface AppearanceLibrary {
  updatedAtMs: number;
  draft: AppearanceDraft | null;
  designs: SavedDesign[];
}
export function emptyLibrary(): AppearanceLibrary {
  return {updatedAtMs: 0, draft: null, designs: []};
}
export function validRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}
export function validDesignName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 60 &&
    !Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}
