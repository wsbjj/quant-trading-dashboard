import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";
import nextEnv from "@next/env";
import { defineConfig } from "prisma/config";
import { getSqliteUrl } from "./src/lib/sqlite-url";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

export default defineConfig({
  experimental: {
    adapter: true,
  },
  schema: "prisma/schema.prisma",
  engine: "js",
  adapter: async () => new PrismaBetterSQLite3({ url: getSqliteUrl() }),
});
