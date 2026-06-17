import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is required");
const sql=postgres(process.env.DATABASE_URL,{prepare:false,max:1});
const migration=await readFile(resolve("drizzle/0000_milky_tusk.sql"),"utf8");
for(const statement of migration.split("--> statement-breakpoint").map(x=>x.trim()).filter(Boolean))await sql.unsafe(statement);
await sql.end();
console.log("Database migration complete.");
