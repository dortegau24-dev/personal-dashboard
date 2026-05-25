import {
  Home, Heart, Dumbbell, Wallet, CheckSquare, Clock,
  BookOpen, Users, Target, NotebookPen, Settings, type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/',          label: 'Home',      icon: Home },
  { href: '/health',    label: 'Health',    icon: Heart },
  { href: '/training',  label: 'Training',  icon: Dumbbell },
  { href: '/finance',   label: 'Finance',   icon: Wallet },
  { href: '/habits',    label: 'Habits',    icon: CheckSquare },
  { href: '/time',      label: 'Time',      icon: Clock },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/social',    label: 'Social',    icon: Users },
  { href: '/goals',     label: 'Goals',     icon: Target },
  { href: '/journal',   label: 'Journal',   icon: NotebookPen },
  { href: '/settings',  label: 'Settings',  icon: Settings },
];

// Top 4 most-used tabs shown in mobile bottom bar; 5th slot is "More" drawer
export const MOBILE_TABS: NavItem[] = [
  NAV_ITEMS[0], // Home
  NAV_ITEMS[1], // Health
  NAV_ITEMS[2], // Training
  NAV_ITEMS[4], // Habits
];

// Everything not in MOBILE_TABS — shown inside the "More" drawer
export const MOBILE_MORE: NavItem[] = [
  NAV_ITEMS[3],  // Finance
  NAV_ITEMS[5],  // Time
  NAV_ITEMS[6],  // Knowledge
  NAV_ITEMS[7],  // Social
  NAV_ITEMS[8],  // Goals
  NAV_ITEMS[9],  // Journal
  NAV_ITEMS[10], // Settings
];
