
import { NavLink } from "react-router";
import { FiBarChart2, FiUsers, FiBriefcase, FiFileText, FiLogOut, FiInbox, FiTag, FiActivity, FiToggleRight } from "react-icons/fi";
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
    <aside className="h-full bg-gradient-to-b from-[#0b6ec4] to-[#0059a8] text-white px-4 py-5 flex flex-col gap-5">
    
        <div className="max-[980px]:hidden text-center">
          <div className="font-bold text-2xl">CareerPatch</div>
          <div className="text-[13px] text-white/90">CareerPatch. Admin</div>
        </div>

      <nav className="mt-1 flex flex-col gap-2">
        <NavLink to="/analytics" className={navItemClass}>
          <FiBarChart2 className="text-xl shrink-0" />
          <span className="max-[980px]:hidden">Analytics & Reporting</span>
        </NavLink>

        <NavLink to="/business-owner" className={navItemClass}>
          <FiUsers className="text-xl shrink-0" />
          <span className="max-[980px]:hidden">Business Owner</span>
        </NavLink>

        <NavLink to="/freelancer" className={navItemClass}>
          <FiBriefcase className="text-xl shrink-0" />
          <span className="max-[980px]:hidden">Freelancer</span>
        </NavLink>

        <NavLink to="/manage-post" className={navItemClass}>
          <FiFileText className="text-xl shrink-0" />
          <span className="max-[980px]:hidden">Manage Post</span>
        </NavLink>

        <NavLink to="/applications" className={navItemClass}>
          <FiInbox className="text-xl shrink-0" />
          <span className="max-[980px]:hidden">Job Applications</span>
        </NavLink>

        <NavLink to="/categories" className={navItemClass}>
          <FiTag className="text-xl shrink-0" />
          <span className="max-[980px]:hidden">Categories</span>
        </NavLink>

        <NavLink to="/activity-log" className={navItemClass}>
          <FiActivity className="text-xl shrink-0" />
          <span className="max-[980px]:hidden">Activity Log</span>
        </NavLink>

        {/* <NavLink to="/ab-tests" className={navItemClass}>
          <FiToggleRight className="text-xl shrink-0" />
          <span className="max-[980px]:hidden">A/B Tests</span>
        </NavLink> */}
      </nav>

      <button
        className="mt-auto w-full h-11 rounded-xl border border-white/25 bg-transparent text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition"
        onClick={() => {
          localStorage.removeItem("ACCESS_TOKEN");
          localStorage.removeItem("REFRESH_TOKEN");
          window.location.reload();
        }}
      >
        <FiLogOut className="text-lg" /> <span className="max-[980px]:hidden">Log out</span>
      </button>
    </aside>
  );
}