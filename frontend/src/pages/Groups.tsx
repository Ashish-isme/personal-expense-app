import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, LogIn, ChevronRight } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { api } from "../lib/api";
import type { GroupSummary } from "../lib/types";
import { formatCurrency, cx } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { FieldWrap, Input } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";

export function Groups() {
  const { data, loading, reload } = useFetch<GroupSummary[]>("/api/groups");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Groups"
        subtitle="Split expenses with friends and keep track of who owes who"
        actions={
          <>
            <Button variant="secondary" onClick={() => setJoinOpen(true)}>
              <LogIn size={16} /> Join
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> New Group
            </Button>
          </>
        }
      />

      {loading && !data ? (
        <div className="card p-6 text-sm text-neutral-400">Loading…</div>
      ) : data && data.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.map((g) => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="card flex items-center justify-between p-4 transition hover:border-brand/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{g.name}</p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {g.memberCount} member{g.memberCount === 1 ? "" : "s"} · {g.expenseCount} expense
                  {g.expenseCount === 1 ? "" : "s"}
                </p>
                <p
                  className={cx(
                    "mt-2 text-sm font-semibold",
                    g.net > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : g.net < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-neutral-400"
                  )}
                >
                  {g.net > 0
                    ? `You're owed ${formatCurrency(g.net)}`
                    : g.net < 0
                      ? `You owe ${formatCurrency(Math.abs(g.net))}`
                      : "All settled up"}
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-neutral-300 dark:text-neutral-600" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="Create a group for your flat, trip or dinner crew — then share the invite code with friends."
          />
        </div>
      )}

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); reload(); }} />
      <JoinGroupModal open={joinOpen} onClose={() => setJoinOpen(false)} onSaved={() => { setJoinOpen(false); reload(); }} />
    </div>
  );
}

function CreateGroupModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (form: HTMLFormElement) => {
    const name = String(new FormData(form).get("name") || "");
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/groups", { name });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="New Group" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
        className="space-y-4"
      >
        <FieldWrap label="Group Name">
          <Input name="name" placeholder="e.g. Pokhara Trip, Flat 3B" required autoFocus />
        </FieldWrap>
        <p className="text-xs text-neutral-400">
          You'll get an invite code to share once the group is created.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function JoinGroupModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (form: HTMLFormElement) => {
    const inviteCode = String(new FormData(form).get("inviteCode") || "");
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/groups/join", { inviteCode });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Join a Group" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
        className="space-y-4"
      >
        <FieldWrap label="Invite Code">
          <Input
            name="inviteCode"
            placeholder="e.g. K3M9PQ7X"
            required
            autoFocus
            autoCapitalize="characters"
            className="font-mono uppercase tracking-widest"
          />
        </FieldWrap>
        <p className="text-xs text-neutral-400">Ask a group member to share their invite code with you.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Joining…" : "Join"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
