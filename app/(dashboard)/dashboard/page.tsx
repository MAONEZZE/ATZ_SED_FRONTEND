"use client";

import Link from "next/link";
import { CalendarDays, Mail, MessageCircle } from "lucide-react";
import { useEvents } from "@/lib/api/events";
import { useAllMessageLogs } from "@/lib/api/global-messaging";
import { useProfile } from "@/lib/api/profile";
import type { EventObject, EventStatus } from "@/lib/api/types";
import { EventStatusBadge, MessageLogStatusBadge } from "@/components/common/status-badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils/format-date";
import { eventStatusConfig } from "@/lib/utils/status-maps";
import { countByStatus, upcomingEvents } from "@/lib/utils/dashboard-metrics";

const EVENT_STATUS_ORDER: EventStatus[] = ["published", "draft", "cancelled", "ended"];

function KpiCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: profile } = useProfile();
  const {
    data: eventsResponse,
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useEvents();
  const {
    data: logsResponse,
    isLoading: logsLoading,
    isError: logsError,
    refetch: refetchLogs,
  } = useAllMessageLogs(1, 10);

  const isLoading = eventsLoading || logsLoading;
  const isError = eventsError || logsError;

  const events: EventObject[] = eventsResponse?.data ?? [];
  const eventsTotal = eventsResponse?.total ?? 0;
  const complete = events.length >= eventsTotal;

  const statusCounts = countByStatus(events);
  const publishedCount = statusCounts.published ?? 0;
  const draftCount = statusCounts.draft ?? 0;

  const sublabel = complete ? undefined : `de ${events.length} de ${eventsTotal} eventos`;
  const derivedValue = (n: number) => (complete ? String(n) : `${n}+`);

  const upcoming = complete ? upcomingEvents(events) : [];
  const logs = logsResponse?.data ?? [];
  const logsTotal = logsResponse?.total ?? 0;

  const displayName = profile?.name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {displayName ? `Olá, ${displayName}` : "Dashboard"}
      </h1>

      {isLoading && <LoadingSpinner />}

      {isError && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">Não foi possível carregar o dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              void refetchEvents();
              void refetchLogs();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Eventos totais" value={String(eventsTotal)} />
            <KpiCard
              label="Publicados"
              value={derivedValue(publishedCount)}
              sublabel={sublabel}
            />
            <KpiCard label="Rascunhos" value={derivedValue(draftCount)} sublabel={sublabel} />
            <KpiCard label="Mensagens registradas" value={String(logsTotal)} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Próximos eventos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!complete ? (
                  <Link href="/eventos" className="text-sm text-primary hover:underline">
                    Ver todos os eventos
                  </Link>
                ) : upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento futuro.</p>
                ) : (
                  upcoming.map((event) => (
                    <div key={event.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/eventos/${event.id}/edit`}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {event.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {event.eventDate && formatDate(event.eventDate)}
                        </p>
                      </div>
                      <EventStatusBadge status={event.status} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Atividade recente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
                ) : (
                  logs
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    )
                    .slice(0, 10)
                    .map((log) => (
                      <div key={log.id} className="flex items-center gap-3">
                        {log.channel === "whatsapp" ? (
                          <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{log.recipient}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {log.event?.title ?? "Sem evento"} ·{" "}
                            {formatDateTime(log.createdAt)}
                          </p>
                        </div>
                        <MessageLogStatusBadge status={log.status} />
                      </div>
                    ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por status</CardTitle>
            </CardHeader>
            <CardContent>
              {!complete ? (
                <Link href="/eventos" className="text-sm text-primary hover:underline">
                  Ver todos os eventos
                </Link>
              ) : eventsTotal === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento ainda.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-border">
                    {EVENT_STATUS_ORDER.filter((status) => statusCounts[status]).map(
                      (status) => (
                        <div
                          key={status}
                          className={eventStatusConfig[status].className}
                          style={{ width: `${((statusCounts[status] ?? 0) / eventsTotal) * 100}%` }}
                        />
                      ),
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {EVENT_STATUS_ORDER.filter((status) => statusCounts[status]).map(
                      (status) => (
                        <div key={status} className="flex items-center gap-2 text-sm">
                          <EventStatusBadge status={status} />
                          <span className="text-muted-foreground">
                            {statusCounts[status]}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
