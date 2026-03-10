import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../components/layout/AdminLayout";
import AnalyticsReporting from "../pages/AnalyticsReporting";
import BusinessOwner from "../pages/BusinessOwner";
import Freelancer from "../pages/Freelancer";
import ManagePost from "../pages/ManagePost";
import Login from "../pages/Login";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected/Admin shell */}
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Navigate to="/analytics" replace />} />
        <Route path="/analytics" element={<AnalyticsReporting />} />
        <Route path="/business-owner" element={<BusinessOwner />} />
        <Route path="/freelancer" element={<Freelancer />} />
        <Route path="/manage-post" element={<ManagePost />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}