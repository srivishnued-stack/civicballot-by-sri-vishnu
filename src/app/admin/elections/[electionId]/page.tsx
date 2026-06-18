import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { candidates, elections, positions } from "@/lib/db/schema";
import { BallotBuilder } from "@/components/ballot-builder";

export const dynamic = "force-dynamic";

export default async function ConfigureElectionPage({ params }: { params: Promise<{ electionId: string }> }) {
  const session = await requireRole("admin");
  const { electionId } = await params;
  const [election] = await db.select().from(elections).where(and(eq(elections.id, electionId), eq(elections.organizationId, session.organizationId))).limit(1);
  if (!election) notFound();
  const positionRows = await db.select().from(positions).where(eq(positions.electionId, election.id)).orderBy(asc(positions.sortOrder));
  const candidateRows = positionRows.length ? await db.select().from(candidates).where(inArray(candidates.positionId, positionRows.map((position) => position.id))).orderBy(asc(candidates.sortOrder)) : [];
  const ballot = positionRows.map((position) => ({ ...position, candidates: candidateRows.filter((candidate) => candidate.positionId === position.id) }));
  const editable = election.status === "draft" || election.status === "scheduled";
  return <>
    <div className="page-title"><div><div className="eyebrow">Ballot configuration</div><h2>{election.name}</h2><p>Add positions and candidates before opening voting.</p></div><Link className="btn btn-secondary" href="/admin/elections">Back to elections</Link></div>
    {!editable && <div className="notice" style={{marginBottom: 16}}>This ballot is locked because the election is {election.status}.</div>}
    <BallotBuilder electionId={election.id} positions={ballot} editable={editable}/>
  </>;
}
