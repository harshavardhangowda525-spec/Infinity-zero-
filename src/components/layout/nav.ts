import {
  BarChart3,
  Beaker,
  CircleDollarSign,
  FolderKanban,
  Gauge,
  MessageSquareHeart,
  PlayCircle,
  ScanSearch,
  Settings,
  ShieldCheck,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/analyze", label: "Analyze Workflow", icon: ScanSearch },
  { href: "/friction", label: "Friction Explorer", icon: Waypoints },
  { href: "/lab", label: "Improvement Lab", icon: Beaker },
  { href: "/workflows", label: "My Workflows", icon: FolderKanban },
  { href: "/analytics", label: "Impact Analytics", icon: BarChart3 },
  { href: "/feedback", label: "Customer Feedback", icon: MessageSquareHeart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/demo", label: "Live Demo", icon: PlayCircle },
  { href: "/pricing", label: "Pricing", icon: CircleDollarSign },
  { href: "/founder", label: "Founder Insights", icon: ShieldCheck },
];
