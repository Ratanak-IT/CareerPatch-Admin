
import { useState, useRef, useEffect } from "react";
import { useUploadProfileImageMutation } from "../../services/profileApi";
import { uploadImageToCloudinary } from "../../utils/uploadToCloudinary";

export default function FreelancerProfileUpdate({
  editOpen,
  setEditOpen,
  form,
  setForm,
  skills,
  setSkills,
  skillText,
  setSkillText,
  onAddSkill, 
  onRemoveSkill,
  onSaveProfile,
  saving,
}) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef(null);
  const [uploadProfileImage, { isLoading: uploading }] = useUploadProfileImageMutation();

  const busy = Boolean(saving || uploading);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // ✅ fallback handlers if parent didn't pass functions
  const addSkillLocal = () => {
    const v = String(skillText ?? "").trim();
    if (!v) return;

    setSkills?.((prev) => {
      const next = Array.isArray(prev) ? prev : [];
      if (next.map((x) => String(x).toLowerCase()).includes(v.toLowerCase())) return next;
      return [...next, v];
    });

    setSkillText?.("");
  };

  const removeSkillLocal = (s) => {
    setSkills?.((prev) => (Array.isArray(prev) ? prev.filter((x) => x !== s) : []));
  };

  const handleUpdate = async () => {
    try {
      let uploadedUrl = null;

      // ✅ upload file to Cloudinary first
      if (imageFile) {
        uploadedUrl = await uploadImageToCloudinary(imageFile);
        handleRemoveImage();
      }

      // ✅ optional: if you want to hit your backend upload endpoint too
      // If you don't need it, remove this block.
      // if (uploadedUrl) {
      //   await uploadProfileImage({ profileImageUrl: uploadedUrl }).unwrap();
      // }

      // ✅ then save profile with url
      await onSaveProfile?.(uploadedUrl);

      setEditOpen?.(false);
    } catch (e) {
      console.error("Update profile error:", e);
    }
  };

  if (!editOpen) return null;

  const addSkill = onAddSkill ?? addSkillLocal;
  const removeSkill = onRemoveSkill ?? removeSkillLocal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[94vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-9 pt-8 pb-2">
          <h2 className="text-xl font-bold text-gray-900">Freelancer Profile Update</h2>

          <button
            onClick={() => setEditOpen(false)}
            disabled={busy}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg w-9 h-9 flex items-center justify-center text-sm font-semibold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-9 py-6 flex flex-col gap-5">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <input
                disabled={busy}
                className="bg-slate-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400 transition"
                placeholder="Full name"
                value={form.fullName ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <input
                disabled={busy}
                className="bg-slate-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400 transition"
                placeholder="Phone"
                value={form.phone ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Address</label>
              <input
                disabled={busy}
                className="bg-slate-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400 transition"
                placeholder="Address"
                value={form.address ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Experience Years</label>
              <input
                disabled={busy}
                type="number"
                className="bg-slate-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400 transition"
                placeholder="Experience years"
                value={form.experienceYears ?? 0}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    experienceYears: Number(e.target.value || 0),
                  }))
                }
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Skills */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Skill</label>

              <div className="border border-slate-200 rounded-xl px-3.5 py-2.5 flex flex-wrap gap-2 items-center min-h-[46px] bg-white">
                {(skills || []).map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full border border-blue-100"
                  >
                    {s}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeSkill(s)}
                      className="text-blue-400 hover:text-blue-700 text-base leading-none transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}

                <button
                  type="button"
                  disabled={busy}
                  onClick={addSkill}
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs font-semibold transition-colors"
                >
                  <span className="text-base leading-none">⊕</span> Add skill
                </button>
              </div>

              <input
                disabled={busy}
                className="bg-slate-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400 transition"
                placeholder="Type skill then press Enter"
                value={skillText ?? ""}
                onChange={(e) => setSkillText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
            </div>

            {/* Image Upload */}
            <div className="flex flex-col gap-2">
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl py-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                <svg
                  className="w-10 h-10 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.6}
                >
                  <path
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-sm text-slate-500">{imageFile ? "Image selected" : "Choose a image here"}</p>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={busy}
                />
              </div>

              {imageFile && (
                <div className="border border-dashed border-slate-300 rounded-xl px-3 py-2.5 flex items-center gap-3 bg-slate-50">
                  <img
                    src={imagePreview || "https://placehold.co/48x48?text=IMG"}
                    alt="preview"
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                  <span className="flex-1 text-sm font-medium text-gray-700 truncate">{imageFile.name}</span>

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={busy}
                    className="text-red-500 hover:text-red-700 disabled:opacity-60 transition-colors shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path
                        d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">About me</label>
            <textarea
              disabled={busy}
              className="bg-slate-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
              placeholder="Bio / description"
              rows={4}
              value={form.bio ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-9 pb-9 flex justify-center gap-3">
          <button
            onClick={() => setEditOpen(false)}
            disabled={busy}
            className="px-8 py-2.5 rounded-full border border-slate-300 text-sm font-semibold text-gray-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleUpdate}
            disabled={busy}
            className="px-10 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center gap-2"
          >
            {busy && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {uploading ? "Uploading..." : saving ? "Saving..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}