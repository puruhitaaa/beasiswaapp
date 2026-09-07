import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { jwt } from "better-auth/plugins";
import { prisma } from "./db.js";

const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3001";
const BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || "default-secret-key-min-32-chars-fallback";
const BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL || "http://localhost:3000/api/auth";

export function createAuth() {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "mysql",
    }),
    trustedOrigins: [CORS_ORIGIN, "http://localhost:5173", "http://localhost:3000"],
    emailAndPassword: {
      enabled: true,
    },
    secret: BETTER_AUTH_SECRET,
    baseURL: BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
      },
    },
    plugins: [
      jwt({
        jwt: {
          expirationTime: "15m",
        },
      }),
    ],
  });
}

export const auth = createAuth();
