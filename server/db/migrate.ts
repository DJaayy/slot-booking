
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log("Running migrations...");
  
  await migrate(db, { migrationsFolder: "./migrations" });
  
  console.log("Migrations completed!");
  
  await pool.end();
}

runMigrations().catch(console.error);
