import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // Default to a local SQLite file so `prisma generate` works without a .env.
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
