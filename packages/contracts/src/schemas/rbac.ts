import { z } from "zod";
import { Role } from "../enums/index.js";

export const jwtUserPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum([
    Role.SUPERADMIN,
    Role.ADMIN,
    Role.VERIFIKATOR,
    Role.INTERVIEWER,
    Role.APPLICANT,
  ]),
  email: z.string().email(),
  name: z.string().optional(),
});

export type JwtUserPayload = z.infer<typeof jwtUserPayloadSchema>;

export type MenuItem = {
  id: string;
  name: string;
  route: string;
  icon?: string | null;
  parentId?: string | null;
  orderIndex: number;
  isActive: boolean;
  children?: MenuItem[];
};

export const menuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    route: z.string(),
    icon: z.string().optional().nullable(),
    parentId: z.string().optional().nullable(),
    orderIndex: z.number(),
    isActive: z.boolean(),
    children: z.array(menuItemSchema).optional(),
  })
);

export const roleMenuPermissionSchema = z.object({
  id: z.string(),
  roleId: z.string(),
  menuId: z.string(),
  canView: z.boolean(),
  canCreate: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
});

export type RoleMenuPermission = z.infer<typeof roleMenuPermissionSchema>;
