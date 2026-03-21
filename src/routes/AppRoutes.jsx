import { Routes, Route, Navigate } from "react-router";
import AdminLayout          from "../components/layout/AdminLayout";

function RequireAuth({ children }) {
  const token = localStorage.getItem("ACCESS_TOKEN");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
import AnalyticsReporting   from "../pages/AnalyticsReporting";
import BusinessOwner        from "../pages/BusinessOwner";
import Freelancer           from "../pages/Freelancer";
import ManagePost           from "../pages/ManagePost";
import ManageApplications   from "../pages/ManageApplications";
import CategoryManagement   from "../pages/CategoryManagement";
import ActivityLog          from "../pages/ActivityLog";
import ABTestManager        from "../pages/ABTestManager";
import Login                from "../pages/Login";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Admin shell — protected */}
      <Route element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route path="/"              element={<Navigate to="/analytics" replace />} />
        <Route path="/analytics"     element={<AnalyticsReporting />} />
        <Route path="/business-owner" element={<BusinessOwner />} />
        <Route path="/freelancer"    element={<Freelancer />} />
        <Route path="/manage-post"   element={<ManagePost />} />
        <Route path="/applications"  element={<ManageApplications />} />
        <Route path="/categories"    element={<CategoryManagement />} />
        <Route path="/activity-log"  element={<ActivityLog />} />
        {/* <Route path="/ab-tests"      element={<ABTestManager />} /> */}
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}