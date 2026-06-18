import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogs, elections, eligibility, voters } from "@/lib/db/schema";

const record = z.object({
  name: z.string().trim().min(2).max(140),
  voterCode: z.string().trim().min(2).max(80),
  email: z.string().trim().email().optional().or(z.literal("")),
  department: z.string().trim().max(140).optional(),
  year: z.string().trim().max(40).optional(),
  campus: z.string().trim().max(120).optional(),
  password: z.string().min(8).max(200),
});
const input = z.object({ records: z.array(record).min(1).max(5000) });

export async function POST(request: Request) {
  const session = await readSession();
  if (!session || session.role === "voter") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = input.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: `Invalid voter: ${body.error.issues[0]?.message}` }, { status: 400 });

  const values = await Promise.all(body.data.records.map(async (voter) => ({
    organizationId: session.organizationId,
    name: voter.name,
    voterCode: voter.voterCode.toUpperCase(),
    email: voter.email || null,
    department: voter.department || null,
    year: voter.year || null,
    campus: voter.campus || null,
    passwordHash: await hash(voter.password, 12),
  })));

  try {
    const imported = await db.transaction(async (tx) => {
      const inserted = await tx.insert(voters).values(values).onConflictDoNothing().returning({ id: voters.id });
      const availableElections = await tx.select({ id: elections.id }).from(elections).where(and(
        eq(elections.organizationId, session.organizationId),
        inArray(elections.status, ["draft", "scheduled", "open"]),
      ));
      const access = inserted.flatMap((voter) => availableElections.map((election) => ({ voterId: voter.id, electionId: election.id })));
      if (access.length) await tx.insert(eligibility).values(access).onConflictDoNothing();
      await tx.insert(auditLogs).values({
        organizationId: session.organizationId,
        actorId: session.sub,
        action: "voters.registered",
        entityType: "voter_registry",
        metadata: JSON.stringify({ requested: values.length, imported: inserted.length }),
      });
      return inserted.length;
    });
    if (imported === 0) return NextResponse.json({ error: "That voter ID already exists." }, { status: 409 });
    return NextResponse.json({ imported, skipped: values.length - imported });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Registration failed. Check the voter details and try again." }, { status: 500 });
  }
}
