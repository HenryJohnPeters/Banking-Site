import { Injectable } from "@nestjs/common";
import { db } from "./database/client";
import { v4 as uuidv4 } from "uuid";

export interface AuditLogEntry {
  id?: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at?: Date;
}

@Injectable()
export class AuditLogService {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db.query(
        `INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          entry.user_id,
          entry.action,
          entry.resource_type,
          entry.resource_id,
          JSON.stringify(entry.details),
          entry.ip_address,
        ]
      );
    } catch (error) {
      console.error("Audit log failed:", error);
    }
  }

  async getRecent(userId: string, limit = 10): Promise<AuditLogEntry[]> {
    const result = await db.query(
      "SELECT * FROM audit_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
      [userId, limit]
    );
    return result.rows;
  }
}
