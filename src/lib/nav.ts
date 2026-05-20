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

export const MOBILE_TABS: NavItem[] = [
  NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[2], NAV_ITEMS[4], NAV_ITEMS[10],
];
