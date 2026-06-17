import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizations, users, voters } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";

const input=z.object({role:z.enum(["voter","admin"]),identity:z.string().trim().min(2).max(255),password:z.string().min(8).max(200),organization:z.string().trim().min(2).max(80)});
export async function POST(req:Request){
  try{
    const body=input.safeParse(await req.json());
    if(!body.success)return NextResponse.json({error:"Check the supplied credentials."},{status:400});
    const [org]=await db.select().from(organizations).where(eq(organizations.slug,body.data.organization.toLowerCase())).limit(1);
    if(!org)return NextResponse.json({error:"Invalid organization or credentials."},{status:401});
    if(body.data.role==="voter"){
      const [voter]=await db.select().from(voters).where(and(eq(voters.organizationId,org.id),eq(voters.voterCode,body.data.identity.toUpperCase()),eq(voters.disabled,false))).limit(1);
      if(!voter||!await compare(body.data.password,voter.passwordHash))return NextResponse.json({error:"Invalid organization or credentials."},{status:401});
      await createSession({sub:voter.id,role:"voter",organizationId:org.id,name:voter.name});return NextResponse.json({ok:true});
    }
    const [user]=await db.select().from(users).where(and(eq(users.organizationId,org.id),eq(users.email,body.data.identity.toLowerCase()),eq(users.disabled,false))).limit(1);
    if(!user||!await compare(body.data.password,user.passwordHash))return NextResponse.json({error:"Invalid organization or credentials."},{status:401});
    await createSession({sub:user.id,role:user.role,organizationId:org.id,name:user.name});return NextResponse.json({ok:true});
  }catch(e){console.error(e);return NextResponse.json({error:"Authentication service is unavailable."},{status:503})}
}
