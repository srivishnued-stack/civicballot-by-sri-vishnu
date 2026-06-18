"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "draft" | "scheduled" | "open" | "closed" | "published";

export function ElectionActions({ electionId, status }: { electionId: string; status: Status }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const next = status === "draft" || status === "scheduled" ? "open" : status === "open" ? "closed" : status === "closed" ? "published" : null;
  const label = next === "open" ? "Open voting" : next === "closed" ? "Close voting" : next === "published" ? "Publish results" : "Completed";

  async function update() {
    if (!next) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/elections", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ electionId, status: next }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Unable to update election.");
      return;
    }
    router.refresh();
  }

  return <div>
    <button type="button" className={next === "open" ? "btn btn-primary" : "btn btn-secondary"} disabled={!next || busy} onClick={update}>{busy ? "Updating…" : label}</button>
    {error && <div className="error" style={{marginTop: 8}}>{error}</div>}
  </div>;
}
