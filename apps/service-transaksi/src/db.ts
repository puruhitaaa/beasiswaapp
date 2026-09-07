import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.js";

export function createPrismaClient() {
  const databaseUrl =
    process.env.DATABASE_URL || "mysql://user:password@localhost:3306/transaksi_db";
  const url = new URL(databaseUrl);
  const connectionConfig = {
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1) || "transaksi_db",
  };

  const adapter = new PrismaMariaDb(connectionConfig);
  return new PrismaClient({ adapter });
}

export const prisma = createPrismaClient();
export default prisma;
