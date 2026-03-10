// src/utils/avatar.js

const BASE_URL = "https://careerpatch-api.anajak-khmer.site";

/**
 * Resolve avatar field safely from user object
 */
export function getAvatarUrl(user) {
  if (!user) return "";

  return (
    user.profileImageUrl
  );
}

/**
 * Convert relative path to absolute API URL
 */
export function toAbsoluteUrl(url) {
  if (!url) return "";

  if (url.startsWith("http")) {
    return url;
  }

  return `${BASE_URL}${url}`;
}