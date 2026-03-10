import { useEffect, useRef, useState } from "react";
import { uploadImageToCloudinary } from "../../utils/uploadToCloudinary";
import { useUpdateFreelancerProfileMutation } from "../../services/profileApi";

function Label({ children }) {
  return <label className="text-sm font-medium text-gray-700">{children}</label>;
}

export default function FreelancerEditModal({ open, user, onClose, onSaved }) {
  const [updateFreelancerProfile, { isLoading: saving }] = useUpdateFreelancerProfileMutation();

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    experienceYears: 0,
    bio: "",
    skills: [],
    profileImageUrl: "",
  });

  // image
  const fileRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const busy = saving || uploading;

  useEffect(() => {
    if (!open) return;

    setForm({
      fullName: user?.fullName ?? user?.name ?? "",
      phone: user?.phone ?? "",
      address: user?.address ?? user?.location ?? "",
      experienceYears: Number(user?.experienceYears ?? 0),
      bio: user?.bio ?? "",
      skills: Array.isArray(user?.skills) ? user.skills : [],
      profileImageUrl: user?.profileImageUrl ?? "",
    });

    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [open, user]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const [skillText, setSkillText] = useState("");
  const onAddSkill = () => {
    const v = String(skillText || "").trim();
    if (!v) return;
    setForm((p) => {
      const next = new Set([...(p.skills || []), v]);
      return { ...p, skills: Array.from(next) };
    });
    setSkillText("");
  };
  const onRemoveSkill = (s) => setForm((p) => ({ ...p, skills: (p.skills || []).filter((x) => x !== s) }));

  const pickFile = (file) => {
    if (!file) return;
    setImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
    setForm((p) => ({ ...p, profileImageUrl: "" }));
  };

  const handleSave = async () => {
    try {
      // your backend likely needs a user id to know who to update
      // if backend updates "me", still safe to pass id if supported
      const userId = user?.id;

      let imageUrl = form.profileImageUrl;

      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadImageToCloudinary(imageFile);
        setUploading(false);
      }

      // ✅ call your real endpoint: /api/users/update-freelancer-profile
      await updateFreelancerProfile({
        id: userId, // keep if backend accepts; if it doesn't, remove this line
        fullName: form.fullName,
        phone: form.phone,
        address: form.address,
        experienceYears: Number(form.experienceYears || 0),
        bio: form.bio,
        skills: form.skills,
        profileImageUrl: imageUrl,
      }).unwrap();

      onSaved?.();
      onClose?.();
    } catch (e) {
      console.error("Update freelancer failed:", e);
      setUploading(false);
    }
  };

  if (!open) return null;

  const displayImage = imagePreview || form.profileImageUrl || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[94vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-9 pt-8 pb-2">
          <h2 className="text-xl font-bold text-gray-900">Freelancer Profile Update</h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg w-9 h-9 grid place-items-center text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-9 py-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <Label>Full Name</Label>
              <input
                disabled={busy}
                className="bg-slate-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400"
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Phone</Label>
              <input
                disabled={busy}
                className="bg-slate-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Phone"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <Label>Address</Label>
              <input
                disabled={busy}
                className="bg-slate-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400"
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Address"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Experience Years</Label>
              <input
                disabled={busy}
                type="number"
                className="bg-slate-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400"
                value={form.experienceYears}
                onChange={(e) => setForm((p) => ({ ...p, experienceYears: Number(e.target.value || 0) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Skills */}
            <div className="flex flex-col gap-1.5">
              <Label>Skill</Label>

              <div className="border border-slate-200 rounded-xl px-3.5 py-2.5 flex flex-wrap gap-2 items-center min-h-[46px] bg-white">
                {(form.skills || []).map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full border border-blue-100"
                  >
                    {s}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onRemoveSkill(s)}
                      className="text-blue-400 hover:text-blue-700 text-base leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}

                <button
                  type="button"
                  disabled={busy}
                  onClick={onAddSkill}
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs font-semibold"
                >
                  <span className="text-base leading-none">⊕</span> Add skill
                </button>
              </div>

              <input
                disabled={busy}
                className="bg-slate-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Type skill then press Enter"
                value={skillText}
                onChange={(e) => setSkillText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddSkill();
                  }
                }}
              />
            </div>

            {/* Image */}
            <div className="flex flex-col gap-2">
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl py-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30"
                onClick={() => fileRef.current?.click()}
              >
                <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
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
                  onChange={(e) => pickFile(e.target.files?.[0])}
                  disabled={busy}
                />
              </div>

              {displayImage ? (
                <div className="border border-dashed border-slate-300 rounded-xl px-3 py-2.5 flex items-center gap-3 bg-slate-50">
                  <img src={displayImage} alt="preview" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                    {imageFile?.name ?? "Current image"}
                  </span>

                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={busy}
                    className="text-red-500 hover:text-red-700 disabled:opacity-60"
                    title="Remove"
                  >
                    🗑
                  </button>
                </div>
              ) : null}

              {uploading ? <div className="text-xs text-blue-500">Uploading...</div> : null}
            </div>
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <Label>About me</Label>
            <textarea
              disabled={busy}
              className="bg-slate-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Bio / description"
              rows={4}
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-9 pb-9 flex justify-center gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-8 py-2.5 rounded-full border border-slate-300 text-sm font-semibold text-gray-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={busy}
            className="px-10 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2"
          >
            {busy ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            {uploading ? "Uploading..." : saving ? "Saving..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}