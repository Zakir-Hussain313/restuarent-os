import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_POOL_URL, { prepare: false });
const rows = await sql`SELECT id, name FROM branches`;
console.log(rows);
await sql.end();