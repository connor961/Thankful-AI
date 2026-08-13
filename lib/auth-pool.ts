import { Pool } from "pg"

// Dedicated node-postgres Pool for Better Auth.
// The rest of the app queries Neon via @neondatabase/serverless (lib/db.ts);
// Better Auth requires a pg Pool, so it gets its own connection here.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
