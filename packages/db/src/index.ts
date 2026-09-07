import { env } from "@beasiswaapp/env/server";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../prisma/generated/client";

export function createPrismaClient() {
  const databaseUrl: string = env.DATABASE_URL;
  const url: URL = new URL(databaseUrl);
  const connectionConfig = {
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  };

  const adapter = new PrismaMariaDb(connectionConfig);
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();
export default prisma;
