
export async function uploadImageToCloudinary(file) {
  if (!file) throw new Error("No file selected");
  if (!file.type?.startsWith("image/")) throw new Error("Only image files are allowed");

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // Debug
  console.log("Cloud name:", cloudName);
  console.log("Upload preset:", uploadPreset);

  if (!cloudName || !uploadPreset) {
    throw new Error("Missing env vars. Check .env and restart: VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET");
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", uploadPreset);
  // optional folder (works even if preset already sets folder)
  fd.append("folder", "service-posts");

  const res = await fetch(endpoint, {
    method: "POST",
    body: fd,
  });

  const data = await res.json().catch(() => ({}));
  console.log("Cloudinary response:", data);

  if (!res.ok) {
    // Cloudinary returns { error: { message } }
    const msg = data?.error?.message || `Upload failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  const url = data?.secure_url || data?.url;
  if (!url) throw new Error("Upload success but no URL returned");

  return url;
}