import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { entities } from "@/api/apiClient";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function usePublication() {
  return useQuery({ queryKey: ["publication"], queryFn: () => entities.TimetableSlot.publication() });
}

export function PublicationStatus({ className = "" }) {
  const { data } = usePublication();
  if (!data) return null;
  if (!data.published) return <span className={className}>Not published yet</span>;
  return (
    <span className={className}>
      Published {new Date(data.published_at).toLocaleString()}{data.published_by ? ` by ${data.published_by}` : ""}
    </span>
  );
}

const channelLine = (label, r) => (
  <div className="text-sm">
    <p className="font-medium">
      {label}: {r.sent} sent{r.failed ? `, ${r.failed} failed` : ""}{r.skipped.length ? `, ${r.skipped.length} skipped` : ""}
    </p>
    {r.errors.map((e, i) => <p key={i} className="text-xs text-rose-700">{e.recipient}: {e.error}</p>)}
    {r.skipped.map((s, i) => <p key={i} className="text-xs text-muted-foreground">{s.recipient}: {s.reason}</p>)}
  </div>
);

/** Publish button: releases the timetable and SMS + emails every active teacher straight away. */
export default function PublishTimetable({ clashCount = 0, slotCount = 0 }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [report, setReport] = useState(null);

  const publish = useMutation({
    mutationFn: () => entities.TimetableSlot.publish({ allow_clashes: clashCount > 0 }),
    onSuccess: (r) => {
      setReport(r);
      ["publication", "sms", "email"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      queryClient.invalidateQueries({ queryKey: ["publication"] });
      r.sms.failed + r.email.failed > 0
        ? toast.warning("Timetable published, but some messages failed")
        : toast.success("Timetable published and teachers notified");
    },
    onError: (e) => toast.error(getErrorMessage(e, "Could not publish the timetable")),
  });

  return (
    <>
      <Button variant="secondary" className="gap-2" disabled={slotCount === 0 || publish.isPending}
        onClick={() => setConfirm(true)}>
        <Megaphone className="w-4 h-4" /> {publish.isPending ? "Publishing…" : "Publish"}
      </Button>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish the timetable?</AlertDialogTitle>
            <AlertDialogDescription>
              Every active teacher will immediately receive their week by SMS and email.
              {clashCount > 0 && (
                <span className="flex items-start gap-2 p-3 mt-3 text-sm rounded-md bg-amber-50 text-amber-900">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  The timetable still has {clashCount} clash{clashCount === 1 ? "" : "es"}. Teachers will be sent a timetable that contains them.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => publish.mutate()}>
              {clashCount > 0 ? "Publish anyway" : "Publish and notify"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!report} onOpenChange={(o) => !o && setReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Timetable published
            </DialogTitle>
          </DialogHeader>
          {report && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{report.teachers} active teacher{report.teachers === 1 ? "" : "s"} notified.</p>
              {channelLine("SMS", report.sms)}
              {channelLine("Email", report.email)}
            </div>
          )}
          <DialogFooter><Button onClick={() => setReport(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
