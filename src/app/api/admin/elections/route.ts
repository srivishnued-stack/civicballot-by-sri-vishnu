import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogs, candidates, elections, eligibility, positions, voters } from "@/lib/db/schema";

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

const updateInput = z.object({
  electionId: z.string().uuid(),
  status: z.enum(["open", "closed", "published"]),
});

export async function PATCH(request: Request) {
  const session = await readSession();
  if (!session || session.role === "voter") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = updateInput.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Invalid election update." }, { status: 400 });

  try {
    const updated = await db.transaction(async (tx) => {
      const [election] = await tx.select().from(elections).where(and(eq(elections.id, body.data.electionId), eq(elections.organizationId, session.organizationId))).limit(1);
      if (!election) return null;
      const allowed = (body.data.status === "open" && (election.status === "draft" || election.status === "scheduled")) ||
        (body.data.status === "closed" && election.status === "open") ||
        (body.data.status === "published" && election.status === "closed");
      if (!allowed) throw new Error("INVALID_TRANSITION");

      if (body.data.status === "open") {
        const ballotPositions = await tx.select({ id: positions.id }).from(positions).where(eq(positions.electionId, election.id));
        if (!ballotPositions.length) throw new Error("EMPTY_BALLOT");
        const ballotCandidates = await tx.select({ positionId: candidates.positionId }).from(candidates).where(inArray(candidates.positionId, ballotPositions.map((position) => position.id)));
        if (ballotPositions.some((position) => !ballotCandidates.some((candidate) => candidate.positionId === position.id))) throw new Error("EMPTY_POSITION");
        const registeredVoters = await tx.select({ id: voters.id }).from(voters).where(and(eq(voters.organizationId, session.organizationId), eq(voters.disabled, false)));
        if (registeredVoters.length) await tx.insert(eligibility).values(registeredVoters.map((voter) => ({ voterId: voter.id, electionId: election.id }))).onConflictDoNothing();
      }
      const [result] = await tx.update(elections).set({ status: body.data.status }).where(eq(elections.id, election.id)).returning();
      await tx.insert(auditLogs).values({ organizationId: session.organizationId, actorId: session.sub, action: `election.${body.data.status}`, entityType: "election", entityId: election.id });
      return result;
    });
    if (!updated) return NextResponse.json({ error: "Election not found." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TRANSITION") return NextResponse.json({ error: "That election status change is not allowed." }, { status: 409 });
    if (error instanceof Error && error.message === "EMPTY_BALLOT") return NextResponse.json({ error: "Configure at least one ballot position before opening voting." }, { status: 409 });
    if (error instanceof Error && error.message === "EMPTY_POSITION") return NextResponse.json({ error: "Every ballot position needs at least one candidate." }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Unable to update the election." }, { status: 500 });
  }
}
