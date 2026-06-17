import { hash } from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { organizations, users } from "../src/lib/db/schema";

const url=process.env.DATABASE_URL;
const slug=process.env.SEED_ORGANIZATION_SLUG;
const email=process.env.SEED_ADMIN_EMAIL;
const password=process.env.SEED_ADMIN_PASSWORD;
if(!url||!slug||!email||!password)throw new Error("DATABASE_URL and all SEED_* variables are required");
if(password.length<12)throw new Error("Initial administrator password must be at least 12 characters");
const client=postgres(url,{prepare:false});const db=drizzle(client);
let [org]=await db.select().from(organizations).where(eq(organizations.slug,slug));
if(!org)[org]=await db.insert(organizations).values({name:slug.split('-').map(x=>x[0].toUpperCase()+x.slice(1)).join(' '),slug}).returning();
const existing=await db.select().from(users).where(eq(users.email,email.toLowerCase()));
if(!existing.length)await db.insert(users).values({organizationId:org.id,name:"Election Administrator",email:email.toLowerCase(),passwordHash:await hash(password,12),role:"owner"});
await client.end();console.log(`Organization ${slug} is ready.`);
