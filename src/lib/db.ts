import { Pool, type QueryResultRow } from "pg";
import { getEnv } from "./env";

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

export function getPool() {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = new Pool({
      connectionString: getEnv().DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  return globalForPg.pgPool;
}

export async function query<T extends QueryResultRow>(sql: string, params: unknown[] = []) {
  const result = await getPool().query<T>(sql, params);

  return result;
}
