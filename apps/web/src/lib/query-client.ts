import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  master: {
    all: ["master"] as const,
    beasiswa: () => ["master", "beasiswa"] as const,
    beasiswaDetail: (id: string) => ["master", "beasiswa", id] as const,
  },
  transaksi: {
    all: ["transaksi"] as const,
    myActive: () => ["transaksi", "my-active"] as const,
    detail: (id: string) => ["transaksi", "detail", id] as const,
    verifikatorQueue: () => ["transaksi", "verifikator-queue"] as const,
    wawancaraQueue: () => ["transaksi", "wawancara-queue"] as const,
    adminStats: () => ["transaksi", "admin-statistics"] as const,
    allApplications: () => ["transaksi", "all-applications"] as const,
  },
  auth: {
    all: ["auth"] as const,
    profile: () => ["auth", "profile"] as const,
    users: () => ["auth", "users"] as const,
    roles: () => ["auth", "roles"] as const,
    menus: () => ["auth", "menus"] as const,
  },
} as const;
