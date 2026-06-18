"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = { id: string; name: string; department: string | null; statement: string | null; symbol: string | null };
type Position = { id: string; name: string; description: string | null; maxSelections: number; candidates: Candidate[] };

export function BallotBuilder({ electionId, positions, editable }: { electionId: string; positions: Position[]; editable: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function send(payload: object, form?: HTMLFormElement) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/elections/${electionId}/ballot`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Unable to update ballot.");
      return;
    }
    form?.reset();
    router.refresh();
  }

  async function addPosition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await send({ action: "addPosition", ...Object.fromEntries(new FormData(form)) }, form);
  }

  async function addCandidate(event: React.FormEvent<HTMLFormElement>, positionId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    await send({ action: "addCandidate", positionId, ...Object.fromEntries(new FormData(form)) }, form);
  }

  async function remove(kind: "position" | "candidate", id: string) {
    if (!confirm(`Remove this ${kind}?`)) return;
    await send({ action: kind === "position" ? "deletePosition" : "deleteCandidate", id });
  }

  return <>
    {error && <div className="error" role="alert">{error}</div>}
    {editable && <form className="panel" onSubmit={addPosition}>
      <div className="panel-head"><div><h3>Add ballot position</h3><span className="label">Examples: President, Secretary, Treasurer</span></div></div>
      <div className="dashboard-grid">
        <div className="field"><label>Position name</label><input name="name" required minLength={2} maxLength={120}/></div>
        <div className="field"><label>Maximum selections</label><input name="maxSelections" type="number" min="1" max="20" defaultValue="1" required/></div>
      </div>
      <div className="field"><label>Description (optional)</label><input name="description" maxLength={500}/></div>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Adding…" : "Add position"}</button>
    </form>}

    <div style={{height: 16}}/>
    {!positions.length && <div className="panel empty">Add the first position, then add candidates beneath it.</div>}
    {positions.map((position) => <section className="panel" key={position.id} style={{marginBottom: 16}}>
      <div className="panel-head">
        <div><h3>{position.name}</h3><span className="label">Choose up to {position.maxSelections} · {position.description || "No description"}</span></div>
        {editable && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => remove("position", position.id)}>Remove position</button>}
      </div>
      {position.candidates.length ? <div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Department</th><th>Symbol</th><th>Statement</th>{editable && <th>Action</th>}</tr></thead><tbody>
        {position.candidates.map((candidate) => <tr key={candidate.id}><td><strong>{candidate.name}</strong></td><td>{candidate.department || "—"}</td><td>{candidate.symbol || "—"}</td><td>{candidate.statement || "—"}</td>{editable && <td><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => remove("candidate", candidate.id)}>Remove</button></td>}</tr>)}
      </tbody></table></div> : <div className="empty">No candidates yet. Add at least one candidate before opening voting.</div>}
      {editable && <form onSubmit={(event) => addCandidate(event, position.id)} style={{marginTop: 16}}>
        <h3>Add candidate</h3>
        <div className="dashboard-grid">
          <div className="field"><label>Candidate name</label><input name="name" required minLength={2} maxLength={140}/></div>
          <div className="field"><label>Department (optional)</label><input name="department" maxLength={140}/></div>
          <div className="field"><label>Ballot symbol (optional)</label><input name="symbol" maxLength={12} placeholder="★"/></div>
        </div>
        <div className="field"><label>Candidate statement (optional)</label><textarea name="statement" rows={2} maxLength={2000}/></div>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Adding…" : "Add candidate"}</button>
      </form>}
    </section>)}
  </>;
}
