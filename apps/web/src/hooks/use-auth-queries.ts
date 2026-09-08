import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, getStoredToken, type ApiUser } from "@/lib/api";
import { appStore } from "@/lib/store";
import { queryKeys } from "@/lib/query-client";
import type { MasterMenu, MasterRole, UserInternal } from "@/types";

export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: async (): Promise<ApiUser | null> => {
      try {
        const token = getStoredToken();
        if (!token) return null;
        const user = await authApi.getProfile();
        if (user) {
          appStore.setCurrentUser(user);
        }
        return user;
      } catch {
        return null;
      }
    },
    enabled: typeof window !== "undefined" && !!getStoredToken(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInternalUsers() {
  return useQuery({
    queryKey: queryKeys.auth.users(),
    queryFn: async (): Promise<UserInternal[]> => {
      const users = await authApi.getUsers();
      return Array.isArray(users) ? users : [];
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.auth.roles(),
    queryFn: async (): Promise<MasterRole[]> => {
      const roles = await authApi.getRoles();
      return Array.isArray(roles) ? roles : [];
    },
  });
}

export function useMenus() {
  return useQuery({
    queryKey: queryKeys.auth.menus(),
    queryFn: async (): Promise<MasterMenu[]> => {
      const menus = await authApi.getMenus();
      return Array.isArray(menus) ? menus : [];
    },
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      role,
    }: {
      email: string;
      password?: string;
      role?: "applicant" | "verifikator" | "interviewer" | "admin";
    }) => {
      const res = await authApi.login(email, password, role);
      appStore.setCurrentUser(res.user);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.myActive() });
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      nik: string;
      name: string;
      email: string;
      password: string;
    }) => {
      const res = await authApi.register(data);
      appStore.setCurrentUser(res.user);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaksi.myActive() });
    },
  });
}

export function useCreateInternalUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password?: string;
      role: "verifikator" | "interviewer" | "admin";
    }) => {
      return await authApi.createInternalUser(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.users() });
    },
  });
}

export function useUpdateRolePermissionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      accessibleMenus,
    }: {
      roleId: string;
      accessibleMenus: string[];
    }) => {
      return await authApi.updateRolePermissions(roleId, accessibleMenus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.roles() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.menus() });
    },
  });
}
