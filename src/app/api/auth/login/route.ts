import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizations, users, voters } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";

const input=z.object({role:z.enum(["voter","admin"]),identity:z.string().trim().min(2).max(255),password:z.string().min(8).max(200),organization:z.string().trim().min(2).max(80).optional()});
const ADMIN_ID="srivishnu";
const ADMIN_PASSWORD="vishnu6573";

export async function POST(req:Request){
  try{
    const body=input.safeParse(await req.json());
    if(!body.success)return NextResponse.json({error:"Check the supplied credentials."},{status:400});
    if(body.data.role==="admin"){
      if(body.data.identity!==ADMIN_ID||body.data.password!==ADMIN_PASSWORD)return NextResponse.json({error:"Invalid administrator ID or password."},{status:401});
      let [org]=await db.select().from(organizations).where(eq(organizations.slug,"civicballot")).limit(1);
      if(!org)[org]=await db.insert(organizations).values({name:"CivicBallot Administration",slug:"civicballot"}).returning();
      const systemEmail=`${ADMIN_ID}@civicballot.local`;
      let [owner]=await db.select().from(users).where(and(eq(users.organizationId,org.id),eq(users.email,systemEmail))).limit(1);
      if(!owner)[owner]=await db.insert(users).values({organizationId:org.id,name:ADMIN_ID,email:systemEmail,passwordHash:await hash(ADMIN_PASSWORD,12),role:"owner"}).returning();
      await createSession({sub:owner.id,role:"owner",organizationId:org.id,name:owner.name});return NextResponse.json({ok:true});
    }
    const [org]=await db.select().from(organizations).where(eq(organizations.slug,"civicballot")).limit(1);
    if(!org)return NextResponse.json({error:"The administrator must sign in once before voters can log in."},{status:503});
    const [voter]=await db.select().from(voters).where(and(eq(voters.organizationId,org.id),eq(voters.voterCode,body.data.identity.toUpperCase()),eq(voters.disabled,false))).limit(1);
    if(!voter||!await compare(body.data.password,voter.passwordHash))return NextResponse.json({error:"Invalid organization or credentials."},{status:401});
    await createSession({sub:voter.id,role:"voter",organizationId:org.id,name:voter.name});return NextResponse.json({ok:true});
  }catch(e){console.error(e);return NextResponse.json({error:"Authentication service is unavailable."},{status:503})}
}
