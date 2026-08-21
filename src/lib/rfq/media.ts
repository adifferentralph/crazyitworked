export const REQUEST_MEDIA_BUCKET = "request-media";
export const MAX_REQUEST_IMAGES = 5;
export const MAX_REQUEST_IMAGE_SIZE = 8 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateRequestImage(file: File) {
  if (!allowedTypes.has(file.type)) return "Use a JPG, PNG, or WebP image.";
  if (file.size <= 0 || file.size > MAX_REQUEST_IMAGE_SIZE) return "Each image must be 8 MB or smaller.";
  return null;
}

export function getSafeRequestImageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}