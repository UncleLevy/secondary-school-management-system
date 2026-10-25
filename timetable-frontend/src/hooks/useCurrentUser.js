import { useQuery } from "@tanstack/react-query";
import { auth } from "@/api/apiClient";

export function useCurrentUser() {
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => auth.me(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    user: data,
    isLoading,
    isAdmin: data?.role === "admin",
    // Admin and management can use Communications and SMS.
    canManage: data?.role === "admin" || data?.role === "management",
  };
}
