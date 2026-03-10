import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";
import { endpoints } from "../api/endpoints";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await http.post(endpoints.login, { email, password });

      // Adjust keys if your API uses different names
      const accessToken = res.data?.accessToken;
      const refreshToken = res.data?.refreshToken;

      if (!accessToken) throw new Error("Missing accessToken in response");

      localStorage.setItem("ACCESS_TOKEN", accessToken);
      if (refreshToken) localStorage.setItem("REFRESH_TOKEN", refreshToken);

      nav("/analytics");
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message || "Login failed");
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
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          className="mt-2 mb-4 w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:ring-2 focus:ring-blue-200"
        />

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