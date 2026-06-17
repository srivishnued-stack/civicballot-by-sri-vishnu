import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 1,
  });

  try {
    const migration = await readFile(
      resolve("drizzle/0000_milky_tusk.sql"),
      "utf8"
    );

    const statements = migration
      .split("--> statement-breakpoint")
      .map((x) => x.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await sql.unsafe(statement);
    }

    console.log("Database migration complete.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Database migration failed:");
  console.error(error);
  process.exit(1);
});
