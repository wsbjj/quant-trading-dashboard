import path from "node:path";

export function getSqliteUrl(databaseUrl = process.env.DATABASE_URL?.trim() || "file:./dev.db") {
  if (!databaseUrl.startsWith("file:")) {
    return databaseUrl;
  }

  const sqlitePath = databaseUrl.slice("file:".length);
  if (sqlitePath === ":memory:" || path.isAbsolute(sqlitePath)) {
    return databaseUrl;
  }

  return `file:${path.resolve(process.cwd(), "prisma", sqlitePath)}`;
}
