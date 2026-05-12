import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AlarmsPage } from "@/pages/alarms/AlarmsPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { ProcessPage } from "@/pages/process/ProcessPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { TrendsPage } from "@/pages/trends/TrendsPage";

export function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/process" element={<ProcessPage />} />
          <Route path="/alarms" element={<AlarmsPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
