import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AdminLayout() {
  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-[#f3f3f3] text-slate-900 max-[980px]:grid-cols-[90px_1fr] dark:bg-slate-950 dark:text-slate-100">
      <Sidebar />
      <div className="min-w-0 flex flex-col">
        <Topbar />
        <main className="px-6 pb-8 max-[640px]:px-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}