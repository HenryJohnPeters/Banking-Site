import { db } from "./client";
import { PoolClient } from "pg";

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.getPool().connect();

  try {
    // Changed from SERIALIZABLE to READ COMMITTED for better performance
    // Row-level locking (SELECT ... FOR UPDATE) provides sufficient isolation
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    client.release();
  }
}
