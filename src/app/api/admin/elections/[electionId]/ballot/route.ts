import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogs, candidates, elections, positions } from "@/lib/db/schema";

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("addPosition"), name: z.string().trim().min(2).max(120), description: z.string().trim().max(500).optional(), maxSelections: z.coerce.number().int().min(1).max(20) }),
  z.object({ action: z.literal("addCandidate"), positionId: z.string().uuid(), name: z.string().trim().min(2).max(140), department: z.string().trim().max(140).optional(), statement: z.string().trim().max(2000).optional(), symbol: z.string().trim().max(12).optional() }),
  z.object({ action: z.literal("deletePosition"), id: z.string().uuid() }),
  z.object({ action: z.literal("deleteCandidate"), id: z.string().uuid() }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ electionId: string }> }) {
  const session = await readSession();
  if (!session || session.role === "voter") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { electionId } = await params;
  const [election] = await db.select().from(elections).where(and(eq(elections.id, electionId), eq(elections.organizationId, session.organizationId))).limit(1);
  if (!election) return NextResponse.json({ error: "Election not found." }, { status: 404 });
  if (election.status !== "draft" && election.status !== "scheduled") return NextResponse.json({ error: "The ballot is locked after voting opens." }, { status: 409 });
  const body = input.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message || "Invalid ballot details." }, { status: 400 });

  if (body.data.action === "addPosition") {
    const [created] = await db.insert(positions).values({ electionId, name: body.data.name, description: body.data.description || null, maxSelections: body.data.maxSelections }).returning();
    await db.insert(auditLogs).values({ organizationId: session.organizationId, actorId: session.sub, action: "position.created", entityType: "position", entityId: created.id });
    return NextResponse.json(created, { status: 201 });
  }
  if (body.data.action === "addCandidate") {
    const [position] = await db.select().from(positions).where(and(eq(positions.id, body.data.positionId), eq(positions.electionId, electionId))).limit(1);
    if (!position) return NextResponse.json({ error: "Position not found." }, { status: 404 });
    const [created] = await db.insert(candidates).values({ positionId: position.id, name: body.data.name, department: body.data.department || null, statement: body.data.statement || null, symbol: body.data.symbol || null }).returning();
    await db.insert(auditLogs).values({ organizationId: session.organizationId, actorId: session.sub, action: "candidate.created", entityType: "candidate", entityId: created.id });
    return NextResponse.json(created, { status: 201 });
  }
  if (body.data.action === "deletePosition") {
    const [position] = await db.select().from(positions).where(and(eq(positions.id, body.data.id), eq(positions.electionId, electionId))).limit(1);
    if (!position) return NextResponse.json({ error: "Position not found." }, { status: 404 });
    await db.delete(positions).where(eq(positions.id, position.id));
    return NextResponse.json({ ok: true });
  }
  const [candidate] = await db.select({ id: candidates.id }).from(candidates).innerJoin(positions, eq(candidates.positionId, positions.id)).where(and(eq(candidates.id, body.data.id), eq(positions.electionId, electionId))).limit(1);
  if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  await db.delete(candidates).where(eq(candidates.id, candidate.id));
  return NextResponse.json({ ok: true });
}
