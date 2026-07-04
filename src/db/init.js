import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./postgres.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  // Needed for gen_random_uuid() on some Postgres installs
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await pool.query(sql);
  console.log("✅ Database schema created/updated successfully.");
  await pool.end();
}

main().catch((err) => {
  console.error("❌ DB init failed:", err);
  process.exit(1);
});
