import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { auth } from "@/api/apiClient";

export default function ChangePasswordDialog({ open, onOpenChange }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const close = (value) => {
    if (!value) { setCurrent(""); setNext(""); setConfirm(""); }
    onOpenChange(value);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (next !== confirm) return toast.error("The new passwords do not match");
    setBusy(true);
    try {
      await auth.changePassword(current, next);
      toast.success("Password changed");
      close(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not change password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">Current password</Label>
            <Input id="cp-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">New password</Label>
            <Input id="cp-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">Confirm new password</Label>
            <Input id="cp-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>Change password</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
