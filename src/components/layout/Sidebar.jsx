import { NavLink } from "react-router-dom";
import { FiBarChart2, FiUsers, FiBriefcase, FiFileText, FiLogOut } from "react-icons/fi";
import logo from "../../assets/logo.png";

function navItemClass({ isActive }) {
  return [
    "flex items-center gap-3 rounded-xl px-3 py-3 text-white/95 transition",
    "hover:bg-white/10",
    isActive ? "bg-white/15" : "",
    "max-[980px]:justify-center",
  ].join(" ");
}

export default function Sidebar() {
  return (
    <aside className="bg-gradient-to-b from-[#0b6ec4] to-[#0059a8] text-white px-4 py-5 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <img src={logo} alt="CareerPatch" className="w-14 h-14 object-contain" />
        <div className="max-[980px]:hidden">
          <div className="font-extrabold leading-tight">CareerPatch</div>
          <div className="text-[13px] text-white/90">CareerPatch. Admin</div>
        </div>
      </div>

      <nav className="mt-1 flex flex-col gap-2">
        <NavLink to="/analytics" className={navItemClass}>
          <FiBarChart2 className="text-xl" /> <span className="max-[980px]:hidden">Analytics & Reporting</span>
        </NavLink>
        <NavLink to="/business-owner" className={navItemClass}>
          <FiUsers className="text-xl" /> <span className="max-[980px]:hidden">Business owner</span>
        </NavLink>
        <NavLink to="/freelancer" className={navItemClass}>
          <FiBriefcase className="text-xl" /> <span className="max-[980px]:hidden">Freelancer</span>
        </NavLink>
        <NavLink to="/manage-post" className={navItemClass}>
          <FiFileText className="text-xl" /> <span className="max-[980px]:hidden">Manage Post</span>
        </NavLink>
      </nav>

      <button
        className="mt-auto w-full h-11 rounded-xl border border-white/25 bg-transparent text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition"
        onClick={() => {
          localStorage.removeItem("ACCESS_TOKEN");
          localStorage.removeItem("REFRESH_TOKEN");
          window.location.reload();
        }}
      >
        <FiLogOut className="text-lg" /> Log out
      </button>
    </aside>
  );
}