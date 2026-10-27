import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { entities } from "@/api/apiClient";

const errorText = (err) => err?.response?.data?.detail || "Something went wrong";

/**
 * mode "create" makes a login for the teacher; mode "reset" sets a new password.
 * Leave the password blank to have one generated. It is shown once, to pass on.
 */
export default function TeacherAccountDialog({ teacher, mode, onClose, onDone }) {
  const [password, setPassword] = useState("");
  const [issued, setIssued] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setPassword(""); setIssued(null); setCopied(false); }, [teacher, mode]);

  if (!teacher) return null;
  const creating = mode === "create";

  const submit = async () => {
    setBusy(true);
    try {
      const call = creating ? entities.Teacher.createAccount : entities.Teacher.resetPassword;
      const res = await call(teacher.id, password.trim() || undefined);
      setIssued(res.temporary_password);
      onDone();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(issued); setCopied(true); } catch { toast.error("Could not copy"); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{creating ? "Create login account" : "Reset password"}</DialogTitle>
          <DialogDescription>
            {issued
              ? "Share these sign-in details with the teacher. The password is only shown now."
              : creating
                ? `${teacher.full_name} will sign in with their email address as the username.`
                : `Set a new password for ${teacher.full_name}.`}
          </DialogDescription>
        </DialogHeader>

        {issued ? (
          <div className="p-3 space-y-2 text-sm border rounded-lg bg-muted/40">
            <div><span className="text-muted-foreground">Username: </span><strong>{teacher.user_email.toLowerCase()}</strong></div>
            <div className="flex items-center justify-between gap-2">
              <span><span className="text-muted-foreground">Password: </span><strong className="font-mono">{issued}</strong></span>
              <Button size="sm" variant="outline" onClick={copy} className="gap-1">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="acct-pw">Password (optional)</Label>
            <Input id="acct-pw" type="text" autoComplete="off" value={password}
                   onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to generate one" />
            <p className="text-xs text-muted-foreground">At least 8 characters, not all digits and not too common.</p>
          </div>
        )}

        <DialogFooter>
          {issued ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={submit} disabled={busy}>{creating ? "Create account" : "Reset password"}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
