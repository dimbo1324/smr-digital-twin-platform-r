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
  shortTitle: string;
  description: string;
  path: string;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    shortTitle: "Dash",
    description: "Live synthetic platform overview",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Process",
    shortTitle: "Proc",
    description: "Simulation-only HMI controls",
    path: "/process",
    icon: Activity,
  },
  {
    title: "Alarms",
    shortTitle: "Alrm",
    description: "Alarm lifecycle and acknowledgement",
    path: "/alarms",
    icon: Bell,
  },
  {
    title: "Events",
    shortTitle: "Evnt",
    description: "Unified synthetic event stream",
    path: "/events",
    icon: ScrollText,
  },
  {
    title: "Trends",
    shortTitle: "Trnd",
    description: "Raw and aggregate historian data",
    path: "/trends",
    icon: Gauge,
  },
  {
    title: "Reports",
    shortTitle: "Rpt",
    description: "Simulation-only JSON/CSV/PDF export",
    path: "/reports",
    icon: FileText,
  },
  {
    title: "Scenario Authoring",
    shortTitle: "Scen",
    description: "Browser-local YAML draft workspace",
    path: "/scenario-authoring",
    icon: PenLine,
  },
  {
    title: "Settings",
    shortTitle: "Set",
    description: "Demo capabilities and safety boundary",
    path: "/settings",
    icon: Settings,
  },
];
