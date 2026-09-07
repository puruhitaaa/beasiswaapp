import { prisma } from "./db.js";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface MenuItem {
  id: string;
  name: string;
  route: string;
  icon: string;
  orderIndex: number;
}

class RbacRepository {
  private inMemoryUsers: Map<string, UserProfile> = new Map();
  private inMemoryMenus: Map<string, MenuItem[]> = new Map();
  private useMemoryFallback =
    process.env.NODE_ENV === "test" ||
    process.env.USE_MEMORY_STORE === "true" ||
    !process.env.DATABASE_URL;

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const yosep: UserProfile = {
      id: "user-yosep",
      name: "Yosep Rohayadi",
      email: "yosep@example.com",
      role: "applicant",
      createdAt: new Date("2026-08-01"),
    };
    const ahmad: UserProfile = {
      id: "v-1",
      name: "Ahmad Rivaldi",
      email: "ahmad@beasiswa.go.id",
      role: "verifikator",
      createdAt: new Date("2026-08-01"),
    };
    const interviewer: UserProfile = {
      id: "i-1",
      name: "Lembaga Seleksi A",
      email: "interviewer@beasiswa.go.id",
      role: "interviewer",
      createdAt: new Date("2026-08-01"),
    };
    const admin: UserProfile = {
      id: "adm-1",
      name: "Yosep Rohayadi (Admin)",
      email: "admin@beasiswa.go.id",
      role: "admin",
      createdAt: new Date("2026-08-01"),
    };

    this.inMemoryUsers.set(yosep.id, yosep);
    this.inMemoryUsers.set(yosep.email, yosep);
    this.inMemoryUsers.set(ahmad.id, ahmad);
    this.inMemoryUsers.set(ahmad.email, ahmad);
    this.inMemoryUsers.set(interviewer.id, interviewer);
    this.inMemoryUsers.set(interviewer.email, interviewer);
    this.inMemoryUsers.set(admin.id, admin);
    this.inMemoryUsers.set(admin.email, admin);

    this.inMemoryMenus.set("applicant", [
      { id: "m-app-1", name: "Dashboard Beasiswa", route: "/applicant", icon: "bi-speedometer2", orderIndex: 1 },
    ]);
    this.inMemoryMenus.set("verifikator", [
      { id: "m-verif-1", name: "Verifikasi Seleksi Administrasi", route: "/verifikator", icon: "bi-file-earmark-check", orderIndex: 1 },
    ]);
    this.inMemoryMenus.set("interviewer", [
      { id: "m-waw-1", name: "Proses Wawancara", route: "/wawancara", icon: "bi-chat-square-text", orderIndex: 1 },
    ]);
    this.inMemoryMenus.set("admin", [
      { id: "m-adm-1", name: "Dashboard", route: "/admin", icon: "bi-speedometer2", orderIndex: 1 },
      { id: "m-adm-2", name: "Hasil Seleksi", route: "/admin", icon: "bi-file-earmark-spreadsheet", orderIndex: 2 },
      { id: "m-adm-3", name: "Data Master", route: "/admin", icon: "bi-database", orderIndex: 3 },
      { id: "m-adm-4", name: "Setting System", route: "/admin", icon: "bi-sliders", orderIndex: 4 },
    ]);
  }

  async findUserById(id: string): Promise<UserProfile | null> {
    if (!this.useMemoryFallback) {
      try {
        const user = await prisma.user.findUnique({
          where: { id },
          include: { role: true },
        });
        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role?.name || "applicant",
            createdAt: user.createdAt,
          };
        }
      } catch {
        this.useMemoryFallback = true;
      }
    }

    return this.inMemoryUsers.get(id) || null;
  }

  async getMenusByRole(roleName: string): Promise<MenuItem[]> {
    if (!this.useMemoryFallback) {
      try {
        const role = await prisma.role.findUnique({
          where: { name: roleName },
          include: {
            permissions: {
              where: { canView: true },
              include: { menu: true },
            },
          },
        });
        if (role && role.permissions.length > 0) {
          return role.permissions
            .map((p: any) => p.menu)
            .filter((m: any) => m.isActive)
            .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
            .map((m: any) => ({
              id: m.id,
              name: m.name,
              route: m.route,
              icon: m.icon,
              orderIndex: m.orderIndex,
            }));
        }
      } catch {
        this.useMemoryFallback = true;
      }
    }

    return this.inMemoryMenus.get(roleName) || this.inMemoryMenus.get("applicant") || [];
  }

  async getAllUsers(): Promise<UserProfile[]> {
    if (!this.useMemoryFallback) {
      try {
        const users = await prisma.user.findMany({
          include: { role: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        });
        if (users.length > 0) {
          return users.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role?.name || "applicant",
            createdAt: u.createdAt,
          }));
        }
      } catch {
        this.useMemoryFallback = true;
      }
    }

    // Deduplicate inMemoryUsers by ID
    const unique = new Map<string, UserProfile>();
    this.inMemoryUsers.forEach((u) => unique.set(u.id, u));
    return Array.from(unique.values());
  }
}

export const rbacRepository = new RbacRepository();
