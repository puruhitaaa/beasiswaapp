import crypto from "node:crypto";
import { hashPassword } from "better-auth/crypto";
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
  async findUserById(id: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name || "applicant",
      createdAt: user.createdAt,
    };
  }

  async findUserWithAuthByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        accounts: true,
      },
    });
  }

  async createUserWithAccount(data: {
    id?: string;
    name: string;
    email: string;
    passwordRaw: string;
    roleName: "applicant" | "verifikator" | "interviewer" | "admin" | "superadmin";
  }): Promise<UserProfile> {
    const role = await prisma.role.findUnique({
      where: { name: data.roleName },
    });

    if (!role) {
      throw new Error(`Role ${data.roleName} tidak ditemukan dalam sistem.`);
    }

    const userId = data.id || `usr-${Date.now()}`;
    const hashedPassword = await hashPassword(data.passwordRaw);

    const user = await prisma.user.create({
      data: {
        id: userId,
        name: data.name,
        email: data.email,
        roleId: role.id,
        emailVerified: true,
        accounts: {
          create: {
            id: `acc-${userId}`,
            issuer: "beasiswaapp",
            accountId: data.email,
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
      include: { role: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name || data.roleName,
      createdAt: user.createdAt,
    };
  }

  async getMenusByRole(roleName: string): Promise<MenuItem[]> {
    const role = await prisma.role.findUnique({
      where: { name: roleName },
      include: {
        permissions: {
          where: { canView: true },
          include: { menu: true },
        },
      },
    });

    if (!role || !role.permissions) {
      return [];
    }

    return role.permissions
      .map((p: any) => p.menu)
      .filter((m: any) => m && m.isActive)
      .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        route: m.route,
        icon: m.icon,
        orderIndex: m.orderIndex,
      }));
  }

  async getAllUsers(): Promise<UserProfile[]> {
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role?.name || "applicant",
      createdAt: u.createdAt,
    }));
  }

  async getAllRoles() {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          where: { canView: true },
          include: { menu: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return roles.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      accessibleMenus: r.permissions.map((p: any) => p.menu?.name).filter(Boolean),
    }));
  }

  async getAllMenus(): Promise<MenuItem[]> {
    const menus = await prisma.menu.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: "asc" },
    });

    return menus.map((m) => ({
      id: m.id,
      name: m.name,
      route: m.route,
      icon: m.icon || "bi-grid",
      orderIndex: m.orderIndex,
    }));
  }

  async updateRolePermissions(roleId: string, accessibleMenuNames: string[]) {
    // 1. Get all menus
    const allMenus = await prisma.menu.findMany();
    const targetMenuIds = allMenus
      .filter((m) => accessibleMenuNames.includes(m.name))
      .map((m) => m.id);

    // 2. Clear existing permissions for this role
    await prisma.roleMenuPermission.deleteMany({
      where: { roleId },
    });

    // 3. Insert new permissions
    for (const menuId of targetMenuIds) {
      await prisma.roleMenuPermission.create({
        data: {
          id: `rmp-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          roleId,
          menuId,
          canView: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        },
      });
    }

    return true;
  }
}

export const rbacRepository = new RbacRepository();
