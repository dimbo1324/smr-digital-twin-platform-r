import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { Card } from "@/shared/ui/card";

const DashboardPage = lazy(() =>
  import("@/pages/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const ProcessPage = lazy(() =>
  import("@/pages/process/ProcessPage").then((module) => ({ default: module.ProcessPage })),
);
const AlarmsPage = lazy(() =>
  import("@/pages/alarms/AlarmsPage").then((module) => ({ default: module.AlarmsPage })),
);
const EventsPage = lazy(() =>
  import("@/pages/events/EventsPage").then((module) => ({ default: module.EventsPage })),
);
const TrendsPage = lazy(() =>
  import("@/pages/trends/TrendsPage").then((module) => ({ default: module.TrendsPage })),
);
const ReportsPage = lazy(() =>
  import("@/pages/reports/ReportsPage").then((module) => ({ default: module.ReportsPage })),
);
const ScenarioAuthoringPage = lazy(() =>
  import("@/pages/scenario-authoring/ScenarioAuthoringPage").then((module) => ({
    default: module.ScenarioAuthoringPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/pages/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })),
);

export function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <LazyPage>
                <DashboardPage />
              </LazyPage>
            }
          />
          <Route
            path="/process"
            element={
              <LazyPage>
                <ProcessPage />
              </LazyPage>
            }
          />
          <Route
            path="/alarms"
            element={
              <LazyPage>
                <AlarmsPage />
              </LazyPage>
            }
          />
          <Route
            path="/events"
            element={
              <LazyPage>
                <EventsPage />
              </LazyPage>
            }
          />
          <Route
            path="/trends"
            element={
              <LazyPage>
                <TrendsPage />
              </LazyPage>
            }
          />
          <Route
            path="/reports"
            element={
              <LazyPage>
                <ReportsPage />
              </LazyPage>
            }
          />
          <Route
            path="/scenario-authoring"
            element={
              <LazyPage>
                <ScenarioAuthoringPage />
              </LazyPage>
            }
          />
          <Route
            path="/settings"
            element={
              <LazyPage>
                <SettingsPage />
              </LazyPage>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoadingState />}>{children}</Suspense>;
}

function RouteLoadingState() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
      <Card className="p-6 text-sm text-muted-foreground">Loading simulation workspace...</Card>
    </div>
  );
}
