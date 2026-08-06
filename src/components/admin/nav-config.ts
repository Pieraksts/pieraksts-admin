import type { Icon } from "@phosphor-icons/react";
import { Buildings, Flag, GridFour, Receipt } from "@phosphor-icons/react/dist/ssr";

export type NavItem = {
  label: string;
  href: string;
  icon: Icon;
  /** Exact match only (used for the index route). */
  exact?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/", icon: GridFour, exact: true },
  { label: "Salons", href: "/salons", icon: Buildings },
  { label: "Review reports", href: "/review-reports", icon: Flag },
  { label: "Invoices", href: "/invoices", icon: Receipt },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
