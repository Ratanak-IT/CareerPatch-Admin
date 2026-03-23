import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ADMIN_EMAIL = "adminratanak@gmail.com";
const ADMIN_PASS  = "Ratanak@16";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");
  const [showPass, setShowPass] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASS) {
      setErr("Invalid admin credentials.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        "https://careerpatch-api.anajak-khmer.site/api/users/login",
        { email: ADMIN_EMAIL, password: ADMIN_PASS },
        { headers: { "Content-Type": "application/json" } }
      );

      const { accessToken, refreshToken } = res.data;

      localStorage.setItem("ACCESS_TOKEN", accessToken);
      localStorage.setItem("IS_ADMIN", "true");
      if (refreshToken) localStorage.setItem("REFRESH_TOKEN", refreshToken);

      nav("/analytics");

    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-[#f3f3f3]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
      >
        <h2 className="text-2xl font-bold text-slate-800">Admin Login</h2>

        <label className="mt-5 block font-semibold text-slate-700">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          className="mt-2 mb-4 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:ring-2 focus:ring-blue-200"
        />

        <label className="block font-semibold text-slate-700">Password</label>
        <div className="relative mt-2 mb-4">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
          >
            {showPass ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>

        {err ? <div className="text-red-600 font-semibold mb-3">{err}</div> : null}

        <button
          disabled={loading}
          className="w-full h-11 rounded-xl bg-blue-600 text-white font-extrabold hover:bg-blue-700 transition disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}