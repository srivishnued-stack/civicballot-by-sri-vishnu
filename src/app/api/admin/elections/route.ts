import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogs, elections, eligibility, voters } from "@/lib/db/schema";

const input = z.object({
  name: z.string().trim().min(4).max(220),
  description: z.string().max(2000).optional(),
  opensAt: z.coerce.date(),
  closesAt: z.coerce.date(),
}).refine((value) => value.closesAt > value.opensAt, { message: "Closing time must be after opening time" });

export async function POST(request: Request) {
  const session = await readSession();
  if (!session || session.role === "voter") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = input.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message || "Invalid election" }, { status: 400 });

  const created = await db.transaction(async (tx) => {
    const [election] = await tx.insert(elections).values({
      organizationId: session.organizationId,
      name: body.data.name,
      description: body.data.description,
      opensAt: body.data.opensAt,
      closesAt: body.data.closesAt,
      status: "draft",
    }).returning();
    const registeredVoters = await tx.select({ id: voters.id }).from(voters).where(eq(voters.organizationId, session.organizationId));
    if (registeredVoters.length) await tx.insert(eligibility).values(registeredVoters.map((voter) => ({ voterId: voter.id, electionId: election.id }))).onConflictDoNothing();
    await tx.insert(auditLogs).values({ organizationId: session.organizationId, actorId: session.sub, action: "election.created", entityType: "election", entityId: election.id });
    return election;
  });
  return NextResponse.json(created, { status: 201 });
}
