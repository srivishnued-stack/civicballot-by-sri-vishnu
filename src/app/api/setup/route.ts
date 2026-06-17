import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { hash } from "bcryptjs";
import { count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";

const input=z.object({setupToken:z.string().min(16),organizationName:z.string().trim().min(2).max(180),organizationSlug:z.string().trim().regex(/^[a-z0-9-]+$/).min(2).max(80),name:z.string().trim().min(2).max(140),email:z.string().email().max(255),password:z.string().min(12).max(200)});
function tokenMatches(value:string){const expected=process.env.SETUP_TOKEN;if(!expected)return false;const a=Buffer.from(value);const b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)}
export async function POST(req:Request){try{const body=input.safeParse(await req.json());if(!body.success)return NextResponse.json({error:body.error.issues[0]?.message||"Invalid setup details"},{status:400});if(!tokenMatches(body.data.setupToken))return NextResponse.json({error:"Invalid setup token."},{status:401});const [existing]=await db.select({value:count()}).from(users);if(existing.value>0)return NextResponse.json({error:"Initial setup is already complete."},{status:409});const result=await db.transaction(async tx=>{const [org]=await tx.insert(organizations).values({name:body.data.organizationName,slug:body.data.organizationSlug}).returning();const [owner]=await tx.insert(users).values({organizationId:org.id,name:body.data.name,email:body.data.email.toLowerCase(),passwordHash:await hash(body.data.password,12),role:"owner"}).returning();return {org,owner}});await createSession({sub:result.owner.id,role:"owner",organizationId:result.org.id,name:result.owner.name});return NextResponse.json({ok:true})}catch(e){console.error(e);return NextResponse.json({error:"Setup could not complete. Confirm the database migration has run."},{status:503})}}
