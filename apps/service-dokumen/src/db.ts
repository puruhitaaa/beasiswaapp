import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "./generated/prisma/client.js";

export function createPrismaClient() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:password@localhost:5432/dokumen_db";
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = createPrismaClient();
export default prisma;
