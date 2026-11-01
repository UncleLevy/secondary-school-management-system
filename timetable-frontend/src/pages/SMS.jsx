import React, { useMemo, useState } from "react";
import { entities } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Mail, Send, CalendarDays, AlertTriangle, ShieldAlert, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { SCHOOL_DAYS } from "@/lib/timetable";
import PageHeader from "@/components/shared/PageHeader";
import Loader from "@/components/shared/Loader";
import EmptyState from "@/components/shared/EmptyState";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const MAX_LENGTH = 612; // four SMS segments
const STATUS_COLORS = {
  Sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Failed: "bg-rose-50 text-rose-700 border-rose-200",
};

const hasPhone = (teacher) => (teacher.phone || "").replace(/\D/g, "").length >= 9;
const hasEmail = (teacher) => /^\S+@\S+\.\S+$/.test(teacher.user_email || "");

// Everything that differs between the two channels lives here.
const CHANNELS = {
  sms: {
    label: "SMS", verb: "text", past: "texted", icon: MessageSquare, api: () => entities.SMS,
    canReach: hasPhone, contact: (t) => t.phone, none: "No phone number", everyone: "Everyone with a phone",
  },
  email: {
    label: "Email", verb: "email", past: "emailed", icon: Mail, api: () => entities.Email,
    canReach: hasEmail, contact: (t) => t.user_email, none: "No email address", everyone: "Everyone with an email",
  },
};

const defaultDay = () => {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  return SCHOOL_DAYS.includes(today) ? today : "Monday";
};

export default function SMS() {
  const { canManage, isLoading: loadingUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const [channel, setChannel] = useState("sms");
  const ch = CHANNELS[channel];
  const api = ch.api();
  const [subject, setSubject] = useState("");
  const [selected, setSelected] = useState(null); // null = "everyone reachable on this channel"
  const [day, setDay] = useState(defaultDay);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(null); // { title, description, run }
  const [lastResult, setLastResult] = useState(null);

  const { data: status } = useQuery({ queryKey: [channel, "status"], queryFn: () => api.status(), enabled: canManage });
  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ["teachers"], queryFn: () => entities.Teacher.list(), enabled: canManage,
  });
  const { data: history = [] } = useQuery({ queryKey: [channel, "history"], queryFn: () => api.list(), enabled: canManage });
  const { data: clashData } = useQuery({
    queryKey: ["timetable-clashes"], queryFn: () => entities.TimetableSlot.clashes(), enabled: canManage,
  });
  const clashCount = clashData?.count ?? 0;

  const activeTeachers = useMemo(() => teachers.filter((t) => t.status === "Active"), [teachers]);
  const selectedIds = useMemo(
    () => selected ?? new Set(activeTeachers.filter(ch.canReach).map((t) => t.id)),
    [selected, activeTeachers, ch],
  );
  const toggle = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const configured = status?.configured;
  const recipientIds = [...selectedIds];

  const onDone = (result) => {
    setLastResult(result);
    queryClient.invalidateQueries({ queryKey: [channel, "history"] });
    if (result.detail && result.sent === 0 && result.failed === 0) toast.info(result.detail);
    else if (result.failed > 0) toast.error(`${result.sent} sent, ${result.failed} failed`);
    else toast.success(`${result.sent} message${result.sent === 1 ? "" : "s"} sent`);
  };
  const onError = (error) => toast.error(getErrorMessage(error, `Could not send ${ch.label === "SMS" ? "SMS" : "email"}`));

  const sendMessage = useMutation({
    mutationFn: () => api.send(channel === "email" ? { teacher_ids: recipientIds, subject: subject.trim(), message: message.trim() } : { teacher_ids: recipientIds, message: message.trim() }),
    onSuccess: (r) => { onDone(r); setMessage(""); setSubject(""); }, onError,
  });
  const sendTimetable = useMutation({
    mutationFn: () => api.sendTimetable({ teacher_ids: recipientIds, day }),
    onSuccess: onDone, onError,
  });
  const sendClashAlerts = useMutation({
    mutationFn: () => api.sendClashAlerts(), onSuccess: onDone, onError,
  });
  const busy = sendMessage.isPending || sendTimetable.isPending || sendClashAlerts.isPending;

  if (loadingUser) return <Loader label="Loading…" />;
  if (!canManage) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access restricted"
        description="Only administrators and management can send messages."
      />
    );
  }

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Send teachers their timetable, clash alerts and notices by SMS or email"
      />

      <div className="inline-flex p-1 mb-6 rounded-lg bg-muted" role="tablist" aria-label="Channel">
        {Object.entries(CHANNELS).map(([key, c]) => (
          <button
            key={key} role="tab" aria-selected={channel === key}
            onClick={() => { setChannel(key); setSelected(null); setLastResult(null); }}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition ${channel === key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <c.icon className="w-4 h-4" /> {c.label}
          </button>
        ))}
      </div>

      {status && !configured && (
        <Card className="mb-6 border shadow-none border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-2 p-4 text-sm text-amber-900">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            {channel === "sms" ? (
              <p>
                <strong>SMS is not set up yet.</strong> Add <code>AT_USERNAME</code> and{" "}
                <code>AT_API_KEY</code> to the backend{" "}
                <code>.env</code> file and restart the server. Sending is disabled until then.
              </p>
            ) : (
              <p>
                <strong>Email is not set up yet.</strong> Set <code>EMAIL_BACKEND</code> to the SMTP backend and add{" "}
                <code>EMAIL_HOST_USER</code> and <code>EMAIL_HOST_PASSWORD</code> to the backend{" "}
                <code>.env</code> file, then restart the server.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {status?.configured && channel === "email" && !status.real_delivery && (
        <Card className="mb-6 border shadow-none border-sky-300 bg-sky-50">
          <CardContent className="flex items-start gap-2 p-4 text-sm text-sky-900">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              <strong>Test mode.</strong> Emails are printed in the server terminal instead of being delivered.
              Switch <code>EMAIL_BACKEND</code> to the SMTP backend in <code>.env</code> to send real emails.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="send">
        <TabsList className="mb-4">
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Recipients */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Recipients</CardTitle>
                <p className="text-xs text-muted-foreground">{selectedIds.size} of {activeTeachers.length} teachers selected</p>
              </CardHeader>
              <CardContent>
                {loadingTeachers ? <Loader /> : activeTeachers.length === 0 ? (
                  <p className="py-6 text-sm text-center text-muted-foreground">No active teachers yet. Add them on the Teachers page.</p>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-3 pb-2 text-xs">
                      <button className="text-primary hover:underline" onClick={() => setSelected(new Set(activeTeachers.filter(ch.canReach).map((t) => t.id)))}>{ch.everyone}</button>
                      <button className="text-muted-foreground hover:underline" onClick={() => setSelected(new Set())}>Clear</button>
                    </div>
                    {activeTeachers.map((t) => (
                      <label key={t.id} className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-muted/50">
                        <Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggle(t.id)} disabled={!ch.canReach(t)} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">{t.full_name}</span>
                          <span className="block text-xs text-muted-foreground">{ch.canReach(t) ? ch.contact(t) : ch.none}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6 lg:col-span-2">
              {/* Timetable */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <CalendarDays className="w-4 h-4 text-primary" /> Send timetable
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Each selected teacher receives their own lessons for the day.</p>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label>Day</Label>
                    <Select value={day} onValueChange={setDay}>
                      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{SCHOOL_DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="gap-2"
                    disabled={!configured || busy || selectedIds.size === 0}
                    onClick={() => setConfirm({
                      title: `${ch.label === "SMS" ? "Text" : "Email"} the ${day} timetable?`,
                      description: `${plural(selectedIds.size, "teacher")} will receive their ${day} lessons by ${ch.label.toLowerCase()}. Teachers with no lessons that day are skipped.`,
                      run: () => sendTimetable.mutate(),
                    })}
                  >
                    <Send className="w-4 h-4" /> Send {day} timetable
                  </Button>
                </CardContent>
              </Card>

              {/* Clash alerts */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Clash alerts
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {clashCount === 0
                      ? "The timetable has no clashes right now."
                      : `${plural(clashCount, "clash")} in the timetable. Every teacher involved is ${ch.past}, regardless of the selection.`}
                  </p>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={!configured || busy || clashCount === 0}
                    onClick={() => setConfirm({
                      title: "Alert teachers about clashes?",
                      description: `Teachers involved in the ${plural(clashCount, "clash")} will each receive a ${channel === "sms" ? "text" : "email"} describing it.`,
                      run: () => sendClashAlerts.mutate(),
                    })}
                  >
                    <Send className="w-4 h-4" /> Alert affected teachers
                  </Button>
                </CardContent>
              </Card>

              {/* Custom message */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <MessageSquare className="w-4 h-4 text-primary" /> Custom message
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {channel === "email" && (
                    <Input placeholder="Subject" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} />
                  )}
                  <Textarea
                    rows={4}
                    maxLength={channel === "sms" ? MAX_LENGTH : 5000}
                    placeholder="e.g. Staff meeting today at 14:30 in the library."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {channel === "sms"
                        ? `${message.length}/${MAX_LENGTH} characters · ${Math.max(1, Math.ceil(message.length / 160))} SMS part(s)`
                        : `${message.length}/5000 characters`}
                    </span>
                    <Button
                      className="gap-2"
                      disabled={!configured || busy || !message.trim() || (channel === "email" && !subject.trim()) || selectedIds.size === 0}
                      onClick={() => setConfirm({
                        title: "Send this message?",
                        description: `"${message.trim()}" will be ${ch.past} to ${plural(selectedIds.size, "teacher")}.`,
                        run: () => sendMessage.mutate(),
                      })}
                    >
                      <Send className="w-4 h-4" /> Send message
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {lastResult && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Last send</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>{lastResult.sent} sent · {lastResult.failed} failed · {lastResult.skipped.length} skipped</p>
                    {lastResult.results.filter((r) => r.status === "Failed").map((r, i) => (
                      <p key={i} className="text-xs text-rose-700">{r.recipient}: {r.error}</p>
                    ))}
                    {lastResult.skipped.map((s, i) => (
                      <p key={i} className="text-xs text-muted-foreground">{s.recipient}: skipped — {s.reason}</p>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          {history.length === 0 ? (
            <EmptyState icon={ch.icon} title="No messages yet" description="Messages you send will be listed here." />
          ) : (
            <div className="overflow-hidden border shadow-sm rounded-xl bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Sent</TableHead>
                      <TableHead className="font-semibold">Recipient</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Message</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(m.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{m.recipient_name || m.phone || m.email}</p>
                          <p className="text-xs text-muted-foreground">{channel === "email" ? m.email : m.phone}</p>
                        </TableCell>
                        <TableCell className="text-xs">{m.kind}</TableCell>
                        <TableCell className="max-w-[360px]">
                          {m.subject && <p className="text-xs font-medium">{m.subject}</p>}
                          <p className="text-xs line-clamp-2">{m.body}</p>
                          {m.error && <p className="mt-0.5 text-xs text-rose-700">{m.error}</p>}
                        </TableCell>
                        <TableCell><Badge variant="outline" className={STATUS_COLORS[m.status]}>{m.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirm.run(); setConfirm(null); }}>Send {ch.label === "SMS" ? "SMS" : "email"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
