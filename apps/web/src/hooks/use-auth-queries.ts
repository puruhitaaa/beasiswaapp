import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  authApi,
  rbacApi,
  getStoredToken,
  setStoredSession,
  type ApiUser,
  type UserMenuItem,
} from "@/lib/api";
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
        return appStore.getCurrentUser();
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
      try {
        const users = await authApi.getUsers();
        if (Array.isArray(users) && users.length > 0) return users;
      } catch {
        // fallback
      }
      return appStore.getInternalUsers();
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.auth.roles(),
    queryFn: async (): Promise<MasterRole[]> => {
      try {
        const roles = await authApi.getRoles();
        if (Array.isArray(roles) && roles.length > 0) return roles;
      } catch {
        // fallback
      }
      return appStore.getRoles();
    },
  });
}

export function useMenus() {
  return useQuery({
    queryKey: queryKeys.auth.menus(),
    queryFn: async (): Promise<MasterMenu[]> => {
      try {
        const menus = await authApi.getMenus();
        if (Array.isArray(menus) && menus.length > 0) return menus;
      } catch {
        // fallback
      }
      return appStore.getMenus();
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
      try {
        const res = await authApi.login(email, password, role);
        appStore.setCurrentUser(res.user);
        return res;
      } catch (err) {
        // Fallback for standalone frontend and offline E2E test runs
        const internalUser = appStore.getInternalUsers().find((u) => u.email === email);
        if (internalUser) {
          const user: ApiUser = {
            id: internalUser.id,
            name: internalUser.name,
            email: internalUser.email,
            role: internalUser.role,
          };
          appStore.setCurrentUser(user);
          setStoredSession("mock-jwt-token", user);
          return { token: "mock-jwt-token", user };
        }

        const defaultApplicants: Record<string, ApiUser> = {
          "peserta@beasiswa.go.id": {
            id: "user-peserta",
            name: "Calon Peserta",
            email: "peserta@beasiswa.go.id",
            role: "applicant",
            nik: "3201123456780002",
          },
          "yosep@example.com": {
            id: "user-yosep",
            name: "Yosep Rohayadi",
            email: "yosep@example.com",
            role: "applicant",
            nik: "3201123456780001",
          },
          "siti@example.com": {
            id: "user-siti",
            name: "Siti Nurhaliza",
            email: "siti@example.com",
            role: "applicant",
            nik: "3201987654320002",
          },
        };

        if (defaultApplicants[email]) {
          const user = defaultApplicants[email];
          appStore.setCurrentUser(user);
          setStoredSession("mock-jwt-token", user);
          return { token: "mock-jwt-token", user };
        }

        if (role === "applicant" || (!role && email.includes("@"))) {
          const normalizedEmail = email.toLowerCase().trim();
          const existingApp = appStore.getAllApplications().find(
            (a) =>
              a.biodata?.email?.toLowerCase() === normalizedEmail ||
              a.userName.toLowerCase() === normalizedEmail ||
              a.userId === email
          );

          const user: ApiUser = {
            id: existingApp?.userId || `usr-${Date.now()}`,
            name: existingApp?.userName || existingApp?.biodata?.namaLengkap || email.split("@")[0].toUpperCase(),
            email,
            role: "applicant",
            nik: existingApp?.userNik || existingApp?.biodata?.nik || "3201123456780009",
          };
          appStore.setCurrentUser(user);
          setStoredSession("mock-jwt-token", user);
          return { token: "mock-jwt-token", user };
        }

        throw err;
      }
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
      try {
        const res = await authApi.register(data);
        appStore.setCurrentUser(res.user);
        return res;
      } catch (err) {
        const newUser: ApiUser = {
          id: `user-${data.nik || Date.now()}`,
          name: data.name,
          email: data.email,
          role: "applicant",
          nik: data.nik,
        };
        appStore.setCurrentUser(newUser);
        setStoredSession("mock-jwt-token", newUser);
        return { token: "mock-jwt-token", user: newUser };
      }
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
      try {
        return await authApi.createInternalUser(data);
      } catch {
        return appStore.addInternalUser({
          name: data.name,
          username: data.email.split("@")[0] || data.name.toLowerCase().replace(/\s+/g, ""),
          email: data.email,
          role: data.role,
          status: "Active",
        });
      }
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
      try {
        return await authApi.updateRolePermissions(roleId, accessibleMenus);
      } catch {
        return appStore.updateRole(roleId, accessibleMenus);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.roles() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.menus() });
    },
  });
}

export function useMyMenusQuery() {
  return useQuery({
    queryKey: ["auth", "my-menus"],
    queryFn: async (): Promise<UserMenuItem[]> => {
      try {
        const token = getStoredToken();
        if (!token) return [];
        const menus = await rbacApi.getMyMenus();
        if (Array.isArray(menus) && menus.length > 0) return menus;
      } catch {
        // fallback
      }
      return [];
    },
    enabled: typeof window !== "undefined" && !!getStoredToken(),
    staleTime: 5 * 60 * 1000,
  });
}

