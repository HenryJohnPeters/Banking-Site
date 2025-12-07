import { Injectable } from "@nestjs/common";
import { db } from "./database/client";

export interface SystemHealth {
  status: "healthy" | "unhealthy";
  timestamp: string;
  database: boolean;
}

@Injectable()
export class HealthService {
  async getSystemHealth(): Promise<SystemHealth> {
    const timestamp = new Date().toISOString();
    let database = false;

    try {
      await db.query("SELECT 1");
      database = true;
    } catch (error) {
      // Database connection failed
    }

    return {
      status: database ? "healthy" : "unhealthy",
      timestamp,
      database,
    };
  }
}
