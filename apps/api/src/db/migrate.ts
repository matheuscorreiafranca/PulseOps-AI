import pg from "pg";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const client = new pg.Client({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://pulseops:pulseops@localhost:5432/pulseops",
});
await client.connect();
const here = dirname(fileURLToPath(import.meta.url));
const sql = await readFile(
  resolve(here, "../../migrations/0000_initial.sql"),
  "utf8",
);
await client.query(sql);
await client.end();
console.log("Migration completed.");
