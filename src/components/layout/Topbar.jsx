import { FiMoon, FiDownload } from "react-icons/fi";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

export default function Topbar() {
  const { pathname } = useLocation();
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("THEME") === "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    localStorage.setItem("THEME", isDark ? "dark" : "light");
  }, [isDark]);

  const title = useMemo(() => {
    if (pathname.startsWith("/manage-post")) return "Manage Posts";
    if (pathname.startsWith("/freelancer")) return "Freelancer";
    if (pathname.startsWith("/business-owner")) return "Business Owner";
    if (pathname.startsWith("/analytics") || pathname === "/") return "Analytics Dashboard";
    return "Admin Dashboard";
  }, [pathname]);

  const exportPDF = async () => {
    const el = document.getElementById("pdf-root");
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const w = 210;
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, w, h);
    pdf.save("careerpatch-analytics.pdf");
  };

  return (
    <header className="px-6 py-6 flex items-center justify-between max-[640px]:px-4">
      <h1 className="text-4xl font-bold text-blue-700 tracking-tight max-[640px]:text-2xl dark:text-blue-300">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        <button
          className="h-10 w-10 rounded-full border border-gray-200 bg-white grid place-items-center hover:bg-gray-50 transition dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800"
          title="Theme"
          onClick={() => setIsDark((v) => !v)}
        >
          <FiMoon className="text-lg" />
        </button>

        <button
          className="h-10 px-4 rounded-xl border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 transition inline-flex items-center gap-2 font-semibold dark:bg-transparent dark:text-blue-300 dark:border-blue-400 dark:hover:bg-slate-900"
          onClick={exportPDF}
        >
          <FiDownload /> Export PDF
        </button>

        <button
          className="h-10 px-5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition font-semibold"
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}