import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const url=process.env.DATABASE_URL;
export const client=postgres(url||"postgresql://invalid:invalid@127.0.0.1:5432/invalid",{prepare:false,max:5});
export const db=drizzle(client,{schema});
