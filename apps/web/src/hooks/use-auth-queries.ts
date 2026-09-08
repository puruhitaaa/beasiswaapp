import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, type ApiUser } from "@/lib/api";
import { appStore } from "@/lib/store";
import { queryKeys } from "@/lib/query-client";
import type { MasterMenu, MasterRole, UserInternal } from "@/types";

export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: async (): Promise<ApiUser | null> => {
      try {
        return await authApi.getProfile();
      } catch (err) {
        console.warn("Failed to fetch user profile:", err);
        const stored = appStore.getCurrentUser();
        return stored ? (stored as unknown as ApiUser) : null;
      }
    },
  });
}

export function useInternalUsers() {
  return useQuery({
    queryKey: queryKeys.auth.users(),
    queryFn: async (): Promise<UserInternal[]> => {
      try {
        const users = await authApi.getUsers();
        if (Array.isArray(users) && users.length > 0) {
          return users;
        }
        return appStore.getInternalUsers();
      } catch (err) {
        console.warn("Failed to fetch internal users from API, falling back to local store:", err);
        return appStore.getInternalUsers();
      }
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.auth.roles(),
    queryFn: async (): Promise<MasterRole[]> => {
      try {
        const roles = await authApi.getRoles();
        if (Array.isArray(roles) && roles.length > 0) {
          return roles;
        }
        return appStore.getRoles();
      } catch (err) {
        console.warn("Failed to fetch roles from API, falling back to local store:", err);
        return appStore.getRoles();
      }
    },
  });
}

export function useMenus() {
  return useQuery({
    queryKey: queryKeys.auth.menus(),
    queryFn: async (): Promise<MasterMenu[]> => {
      try {
        const menus = await authApi.getMenus();
        if (Array.isArray(menus) && menus.length > 0) {
          return menus;
        }
        return appStore.getMenus();
      } catch (err) {
        console.warn("Failed to fetch menus from API, falling back to local store:", err);
        return appStore.getMenus();
      }
    },
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      role,
      name,
      userId,
    }: {
      email: string;
      role: "applicant" | "verifikator" | "interviewer" | "admin";
      name?: string;
      userId?: string;
    }) => {
      const res = await authApi.login(email, role, name, userId);
      appStore.setCurrentUser(res.user);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.myActive() });
    },
  });
}
