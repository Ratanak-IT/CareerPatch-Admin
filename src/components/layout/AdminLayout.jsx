// src/components/layout/AdminLayout.jsx
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AdminLayout() {
  return (
    <div className="h-screen flex overflow-hidden bg-[#f3f3f3] dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      <div className="flex-shrink-0 w-[260px] max-[980px]:w-[90px] h-full overflow-hidden">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        <div className="flex-shrink-0">
          <Topbar />
        </div>

        <main className="flex-1 overflow-y-auto px-6 pb-8 max-[640px]:px-4">
          <Outlet />
        </main>
      </div>

    </div>
  );
}