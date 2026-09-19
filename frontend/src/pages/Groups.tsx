import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, LogIn, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { api } from "@/lib/api";
import type { GroupSummary } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { FormError, FormField } from "@/components/app/FormField";
import { ListSkeleton } from "@/components/app/ListSkeleton";

export function Groups() {
  const { data, loading, reload } = useFetch<GroupSummary[]>("/api/groups");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Groups"
        description="Split expenses with friends and keep track of who owes who"
        actions={
          <>
            <Button variant="outline" onClick={() => setJoinOpen(true)}>
              <LogIn /> Join
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> New group
            </Button>
          </>
        }
      />

      {loading && !data ? (
        <Card className="py-0">
          <ListSkeleton rows={3} />
        </Card>
      ) : data && data.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="group/card rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <Card className="hover:bg-accent/40 flex-row items-center justify-between gap-3 p-4 shadow-none transition-colors">
                <div className="min-w-0">
                  <p className="truncate font-medium">{g.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {g.memberCount} member{g.memberCount === 1 ? "" : "s"} · {g.expenseCount} expense
                    {g.expenseCount === 1 ? "" : "s"}
                  </p>
                  <p
                    className={cn(
                      "tabular mt-2 text-sm font-medium",
                      g.net > 0 ? "text-positive" : g.net < 0 ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {g.net > 0
                      ? `You're owed ${formatCurrency(g.net)}`
                      : g.net < 0
                        ? `You owe ${formatCurrency(Math.abs(g.net))}`
                        : "All settled up"}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover/card:translate-x-0.5" />
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="py-0">
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="Create a group for your flat, trip or dinner crew — then share the invite code with friends."
            action={
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus /> New group
              </Button>
            }
          />
        </Card>
      )}

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => {
          setCreateOpen(false);
          reload();
        }}
      />
      <JoinGroupDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onSaved={() => {
          setJoinOpen(false);
          reload();
        }}
      />
    </>
  );
}

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function CreateGroupDialog({ open, onOpenChange, onSaved }: GroupDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (form: HTMLFormElement) => {
    const name = String(new FormData(form).get("name") || "");
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/groups", { name });
      toast.success("Group created");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setError(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>You'll get an invite code to share once the group is created.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
          className="grid gap-4"
        >
          <FormField label="Group name" htmlFor="group-name">
            <Input id="group-name" name="name" placeholder="e.g. Pokhara Trip, Flat 3B" required autoFocus />
          </FormField>
          <FormError message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function JoinGroupDialog({ open, onOpenChange, onSaved }: GroupDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (form: HTMLFormElement) => {
    const inviteCode = String(new FormData(form).get("inviteCode") || "");
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/groups/join", { inviteCode });
      toast.success("Joined group");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setError(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a group</DialogTitle>
          <DialogDescription>Ask a group member to share their invite code with you.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
          className="grid gap-4"
        >
          <FormField label="Invite code" htmlFor="invite-code">
            <Input
              id="invite-code"
              name="inviteCode"
              placeholder="e.g. K3M9PQ7X"
              required
              autoFocus
              autoCapitalize="characters"
              className="font-mono tracking-widest uppercase"
            />
          </FormField>
          <FormError message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Joining…" : "Join"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
