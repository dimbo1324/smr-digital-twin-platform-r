import {
  Activity,
  Bell,
  FileText,
  Gauge,
  LayoutDashboard,
  PenLine,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Process",
    path: "/process",
    icon: Activity,
  },
  {
    title: "Alarms",
    path: "/alarms",
    icon: Bell,
  },
  {
    title: "Events",
    path: "/events",
    icon: ScrollText,
  },
  {
    title: "Trends",
    path: "/trends",
    icon: Gauge,
  },
  {
    title: "Reports",
    path: "/reports",
    icon: FileText,
  },
  {
    title: "Scenario Authoring",
    path: "/scenario-authoring",
    icon: PenLine,
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
  },
];
