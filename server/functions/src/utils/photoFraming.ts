/** A small default crop hides embedded photo borders without stretching artwork. */
export const DEFAULT_PHOTO_ZOOM = 1.05;

export function validPhotoZoom(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 1.5;
}

export function normalizePhotoZoom(value: unknown): number {
  return validPhotoZoom(value) ? value : DEFAULT_PHOTO_ZOOM;
}
