"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VoterRecord = {
  name?: string;
  voterCode?: string;
  email?: string;
  department?: string;
  year?: string;
  campus?: string;
  password?: string;
};

export function VoterImport() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save(records: VoterRecord[], form?: HTMLFormElement) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/voters/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ records }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to register voter.");
        return;
      }
      const skipped = data.skipped ? ` ${data.skipped} duplicate(s) skipped.` : "";
      setMessage(`${data.imported} voter(s) registered.${skipped}`);
      form?.reset();
      router.refresh();
    } catch {
      setError("The server could not be reached. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addVoter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form)) as VoterRecord;
    await save([values], form);
  }

  async function importFile(file: File) {
    const text = await file.text();
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
    const headers = lines.shift()?.split(",").map((value) => value.trim().toLowerCase()) || [];
    const get = (cells: string[], name: string) => cells[headers.indexOf(name)]?.trim();
    const records = lines.map((line) => {
      const cells = line.split(",");
      return {
        name: get(cells, "name"),
        voterCode: get(cells, "voter id") || get(cells, "voterid"),
        email: get(cells, "email"),
        department: get(cells, "department"),
        year: get(cells, "year"),
        campus: get(cells, "campus"),
        password: get(cells, "password"),
      };
    });
    await save(records);
  }

  return <>
    <form className="panel" onSubmit={addVoter}>
      <div className="panel-head">
        <div><h3>Add voter manually</h3><span className="label">Create the exact credentials the voter will use to sign in.</span></div>
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      {message && <div className="notice">{message}</div>}
      <div className="dashboard-grid">
        <div className="field"><label>Full name</label><input name="name" required minLength={2} maxLength={140}/></div>
        <div className="field"><label>Voter ID</label><input name="voterCode" required minLength={2} maxLength={80} autoCapitalize="characters" placeholder="e.g. VOTER001"/></div>
        <div className="field"><label>Password</label><input name="password" type="password" required minLength={8} maxLength={200} autoComplete="new-password"/></div>
        <div className="field"><label>Email (optional)</label><input name="email" type="email" maxLength={255}/></div>
        <div className="field"><label>Department (optional)</label><input name="department" maxLength={140}/></div>
        <div className="field"><label>Year / class (optional)</label><input name="year" maxLength={40}/></div>
        <div className="field"><label>Campus (optional)</label><input name="campus" maxLength={120}/></div>
      </div>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Registering…" : "Register voter"}</button>
    </form>
    <div style={{height: 16}}/>
    <section className="panel">
      <div className="panel-head">
        <div><h3>Bulk import voters</h3><span className="label">CSV headers: Name, Voter ID, Email, Department, Year, Campus, Password</span></div>
        <label className="btn btn-secondary">{busy ? "Importing…" : "Choose CSV"}<input hidden type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0])}/></label>
      </div>
    </section>
  </>;
}
