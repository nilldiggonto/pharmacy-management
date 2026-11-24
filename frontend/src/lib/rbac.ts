import type { UserRole } from "@/types/api";

export type AppRoute =
  | "/dashboard"
  | "/inventory"
  | "/products"
  | "/purchasing"
  | "/transfers"
  | "/pos"
  | "/operations";

export interface RoleMeta {
  role: UserRole;
  label: string;
  description: string;
  defaultRoute: AppRoute;
  allowedRoutes: AppRoute[];
  demoEmail: string;
  demoPassword: string;
  demoFullName: string;
}

export const ROLE_DIRECTORY: Record<UserRole, RoleMeta> = {
  owner: {
    role: "owner",
    label: "Owner",
    description: "Full access across all branches, central warehouse, financials, and audit logs.",
    defaultRoute: "/dashboard",
    allowedRoutes: [
      "/dashboard",
      "/inventory",
      "/products",
      "/purchasing",
      "/transfers",
      "/pos",
      "/operations",
    ],
    demoEmail: "owner@pharmacy.com",
    demoPassword: "OwnerPass123!",
    demoFullName: "System Owner",
  },
  head_office_manager: {
    role: "head_office_manager",
    label: "Head Office Manager",
    description: "Central oversight across all locations, approvals, and consolidated reporting.",
    defaultRoute: "/dashboard",
    allowedRoutes: [
      "/dashboard",
      "/inventory",
      "/products",
      "/purchasing",
      "/transfers",
      "/pos",
      "/operations",
    ],
    demoEmail: "manager@pharmacy.com",
    demoPassword: "StaffPass123!",
    demoFullName: "Nadia Karim",
  },
  branch_manager: {
    role: "branch_manager",
    label: "Branch Manager",
    description: "Branch operations, local stock oversight, transfers, and POS closing.",
    defaultRoute: "/dashboard",
    allowedRoutes: ["/dashboard", "/inventory", "/products", "/transfers", "/pos"],
    demoEmail: "branch.manager@pharmacy.com",
    demoPassword: "StaffPass123!",
    demoFullName: "Rafiqul Islam",
  },
  pharmacist: {
    role: "pharmacist",
    label: "Pharmacist",
    description: "Dispensing, batch FEFO verification, network stock lookup, restock requests, and POS.",
    defaultRoute: "/inventory",
    allowedRoutes: ["/inventory", "/products", "/transfers", "/pos"],
    demoEmail: "pharmacist@pharmacy.com",
    demoPassword: "StaffPass123!",
    demoFullName: "Dr. Samira Haque",
  },
  cashier: {
    role: "cashier",
    label: "Cashier",
    description: "Fast retail POS checkout, cross-branch stock lookup, and daily register settlement.",
    defaultRoute: "/pos",
    allowedRoutes: ["/pos", "/inventory"],
    demoEmail: "cashier@pharmacy.com",
    demoPassword: "StaffPass123!",
    demoFullName: "Tanvir Ahmed",
  },
  inventory_officer: {
    role: "inventory_officer",
    label: "Inventory Officer",
    description: "Warehouse and branch batch tracking, expiry controls, and inter branch transfers.",
    defaultRoute: "/dashboard",
    allowedRoutes: ["/dashboard", "/inventory", "/products", "/transfers"],
    demoEmail: "inventory@pharmacy.com",
    demoPassword: "StaffPass123!",
    demoFullName: "Farzana Yasmin",
  },
  stock_entry_operator: {
    role: "stock_entry_operator",
    label: "Stock Data Entry",
    description: "Checks Uttara Main Hub stock, adds new batches to DB, restocks supplies, and receives goods.",
    defaultRoute: "/inventory",
    allowedRoutes: ["/inventory", "/products", "/purchasing"],
    demoEmail: "data.entry@pharmacy.com",
    demoPassword: "StaffPass123!",
    demoFullName: "Mehedi Hasan",
  },
  procurement_officer: {
    role: "procurement_officer",
    label: "Procurement Officer",
    description: "Supplier relationships, central catalogue pricing, and purchase orders.",
    defaultRoute: "/purchasing",
    allowedRoutes: ["/products", "/purchasing", "/operations"],
    demoEmail: "procurement@pharmacy.com",
    demoPassword: "StaffPass123!",
    demoFullName: "Imran Hossain",
  },
  accountant: {
    role: "accountant",
    label: "Accountant",
    description: "Financial overview, supplier balances, purchasing review, and audit logs.",
    defaultRoute: "/dashboard",
    allowedRoutes: ["/dashboard", "/purchasing", "/operations"],
    demoEmail: "accountant@pharmacy.com",
    demoPassword: "StaffPass123!",
    demoFullName: "Shabnam Chowdhury",
  },
};

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const meta = ROLE_DIRECTORY[role];
  if (!meta) return false;
  return meta.allowedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function getDefaultRouteForRole(role: UserRole): AppRoute {
  return ROLE_DIRECTORY[role]?.defaultRoute ?? "/dashboard";
}

