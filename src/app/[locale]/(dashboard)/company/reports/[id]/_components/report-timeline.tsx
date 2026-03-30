"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, AlertTriangle, UserCheck, Search, Send, Shield, Loader2 } from "lucide-react";

interface TimelineEvent {
  id: string;
  event_type: string;
  event_label: string;
  actor_type: string;
  created_at: string;
}

const EVENT_ICONS: Record<string, typeof Clock> = {
  submitted: Send,
  acknowledged: CheckCircle2,
  under_review: Search,
  investigating: Search,
  assigned: UserCheck,
  resolved: CheckCircle2,
  closed: Shield,
  escalated: AlertTriangle,
  sla_warning: AlertTriangle,
  status_changed: Clock,
  comment_added: Send,
};

const EVENT_COLORS: Record<string, string> = {
  submitted: "text-blue-500 bg-blue-50",
  acknowledged: "text-emerald-500 bg-emerald-50",
  resolved: "text-green-500 bg-green-50",
  closed: "text-gray-500 bg-gray-50",
  escalated: "text-red-500 bg-red-50",
  sla_warning: "text-amber-500 bg-amber-50",
  assigned: "text-indigo-500 bg-indigo-50",
};

export function ReportTimeline({ reportId, token }: { reportId: string; token?: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`/api/reports/${reportId}/timeline`, { headers })
      .then((r) => r.ok ? r.json() : { timeline: [] })
      .then((d) => setEvents(d.timeline || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reportId, token]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          진행 타임라인
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6 space-y-4">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />

          {events.map((event) => {
            const Icon = EVENT_ICONS[event.event_type] || Clock;
            const colorClass = EVENT_COLORS[event.event_type] || "text-gray-500 bg-gray-50";

            return (
              <div key={event.id} className="relative flex gap-3">
                <div className={`absolute -left-6 w-[22px] h-[22px] rounded-full flex items-center justify-center ${colorClass}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{event.event_label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString("ko-KR")}
                    {event.actor_type === "admin" && " · 관리자"}
                    {event.actor_type === "reporter" && " · 제보자"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
