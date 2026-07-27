"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EntryActions({
  entryId,
  foodName,
}: {
  entryId: string;
  foodName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"duplicate" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: "duplicate" | "delete") {
    if (
      action === "delete" &&
      !window.confirm(`Delete ${foodName} from your Food log?`)
    )
      return;
    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch(`/api/food-log/entries/${entryId}`, {
        method: action === "delete" ? "DELETE" : "POST",
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(body.error ?? `Unable to ${action} this food`);
      setMessage(action === "delete" ? "Deleted" : "Duplicated");
      router.refresh();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="entry-actions">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => run("duplicate")}
      >
        {busy === "duplicate" ? "Duplicating…" : "Duplicate"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => run("delete")}
      >
        {busy === "delete" ? "Deleting…" : "Delete"}
      </button>
      {message && (
        <small
          role="status"
          className={message.startsWith("Unable") ? "error" : "muted"}
        >
          {message}
        </small>
      )}
    </div>
  );
}
