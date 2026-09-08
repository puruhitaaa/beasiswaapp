import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.js";

export function createPrismaClient() {
  const databaseUrl =
    process.env.DATABASE_URL || "mysql://master_user:password@localhost:3306/master_db";
  const url = new URL(databaseUrl);
  const connectionConfig = {
    host: url.hostname === "localhost" ? "127.0.0.1" : url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1) || "master_db",
  };

  const adapter = new PrismaMariaDb(connectionConfig);
  return new PrismaClient({ adapter });
}

export const prisma = createPrismaClient();
export default prisma;
