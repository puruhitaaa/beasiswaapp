import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "./db.js";

export async function seedRbac() {
  console.log("🌱 Inisialisasi data awal RBAC (Roles, Menus, Permissions, Users)...");

  // 1. Roles
  const roles = [
    { id: "role-applicant", name: "applicant", description: "Peserta Calon Penerima Beasiswa" },
    { id: "role-verifikator", name: "verifikator", description: "Verifikator Seleksi Administrasi" },
    { id: "role-interviewer", name: "interviewer", description: "Lembaga / Tim Penguji Wawancara" },
    { id: "role-admin", name: "admin", description: "Administrator Sistem Beasiswa" },
    { id: "role-superadmin", name: "superadmin", description: "Super Administrator" },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
  }

  // 2. Menus
  const menus = [
    { id: "m-app-1", name: "Dashboard Beasiswa", route: "/applicant", icon: "bi-speedometer2", orderIndex: 1 },
    { id: "m-verif-1", name: "Verifikasi Seleksi Administrasi", route: "/verifikator", icon: "bi-file-earmark-check", orderIndex: 1 },
    { id: "m-waw-1", name: "Proses Wawancara", route: "/wawancara", icon: "bi-chat-square-text", orderIndex: 1 },
    { id: "m-adm-1", name: "Dashboard", route: "/admin", icon: "bi-speedometer2", orderIndex: 1 },
    { id: "m-adm-2", name: "Hasil Seleksi", route: "/admin", icon: "bi-file-earmark-spreadsheet", orderIndex: 2 },
    { id: "m-adm-3", name: "Data Master", route: "/admin", icon: "bi-database", orderIndex: 3 },
    { id: "m-adm-4", name: "Setting System", route: "/admin", icon: "bi-sliders", orderIndex: 4 },
  ];

  for (const m of menus) {
    await prisma.menu.upsert({
      where: { id: m.id },
      update: { name: m.name, route: m.route, icon: m.icon, orderIndex: m.orderIndex },
      create: m,
    });
  }

  // 3. Permissions
  const roleMenuMap: Record<string, string[]> = {
    applicant: ["m-app-1"],
    verifikator: ["m-verif-1"],
    interviewer: ["m-waw-1"],
    admin: ["m-adm-1", "m-adm-2", "m-adm-3", "m-adm-4"],
    superadmin: ["m-app-1", "m-verif-1", "m-waw-1", "m-adm-1", "m-adm-2", "m-adm-3", "m-adm-4"],
  };

  for (const [roleName, menuIds] of Object.entries(roleMenuMap)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;

    for (const menuId of menuIds) {
      await prisma.roleMenuPermission.upsert({
        where: {
          roleId_menuId: {
            roleId: role.id,
            menuId,
          },
        },
        update: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        create: {
          roleId: role.id,
          menuId,
          canView: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        },
      });
    }
  }

  // 4. Default Seed Users
  const usersToSeed = [
    {
      id: "adm-1",
      name: "Admin Yosep",
      email: "admin@beasiswa.go.id",
      roleName: "admin",
      passwordRaw: "Admin123!",
    },
    {
      id: "v-1",
      name: "Ahmad Rivaldi",
      email: "ahmad@beasiswa.go.id",
      roleName: "verifikator",
      passwordRaw: "Verifikator123!",
    },
    {
      id: "i-1",
      name: "Lembaga Seleksi A",
      email: "interviewer@beasiswa.go.id",
      roleName: "interviewer",
      passwordRaw: "Interviewer123!",
    },
    {
      id: "user-yosep",
      name: "Yosep Rohayadi",
      email: "yosep@example.com",
      roleName: "applicant",
      passwordRaw: "Peserta123!",
    },
  ];

  for (const u of usersToSeed) {
    const role = await prisma.role.findUnique({ where: { name: u.roleName } });
    const hashedPassword = await hashPassword(u.passwordRaw);

    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        roleId: role?.id,
      },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        roleId: role?.id,
        emailVerified: true,
      },
    });

    const existingUser = await prisma.user.findUnique({ where: { email: u.email } });
    if (existingUser) {
      await prisma.account.upsert({
        where: {
          issuer_accountId: {
            issuer: "beasiswaapp",
            accountId: u.email,
          },
        },
        update: {
          password: hashedPassword,
        },
        create: {
          id: `acc-${existingUser.id}`,
          issuer: "beasiswaapp",
          accountId: u.email,
          providerId: "credential",
          userId: existingUser.id,
          password: hashedPassword,
        },
      });
    }
  }

  console.log("✅ Seed RBAC berhasil!");
}

if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedRbac()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed RBAC gagal:", err);
      process.exit(1);
    });
}
