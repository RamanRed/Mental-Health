import type { UserRole } from "@/store/authStore";

export function dashboardForRole(role?: UserRole | null) {
  if (role === "doctor") return "/doctor/dashboard";
  if (role === "asha_worker") return "/asha/dashboard";
  if (role === "admin") return "/admin";
  return "/dashboard";
}

export function withLocalePath(locale: string, path: string) {
  return `/${locale}${path}`;
}
