"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import ConfigNotice from "@/components/ConfigNotice";
import { fetcher } from "@/lib/swr-fetcher";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { Badge, EstimateMissingBadge, type BadgeTone } from "@/components/ui/Badge";
import { StatGrid } from "@/components/ui/StatGrid";
import { StatCard } from "@/components/ui/StatCard";

type Priority = "urgent" | "high" | "medium" | "low" | "none";

interface MemberTask {
  id: string;
  name: string;
  point: number;
  hasUncountedEstimate: boolean;
  completedAt: string | null;
  projectId: string;
  priority: Priority;
}

interface MemberRow {
  memberId: string;
  memberName: string;
  doneTask: number;
  totalPoint: number;
  uncountedEstimateTask: number;
  tasks: MemberTask[];
}

interface ProjectOption {
  id: string;
  name: string;
}

interface FilterOption {
  id: string;
  name: string;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  urgent: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
  none: "neutral",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No priority",
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// The member detail dialog's "analytics" content — by-project breakdown +
// a recent-activity task feed. Kept as its own component so MembersClient's
// filter/table logic doesn't get buried under this.
function MemberAnalytics({ member, projectNames }: { member: MemberRow; projectNames: Map<string, string> }) {
  const avgPoint = member.doneTask > 0 ? Math.round((member.totalPoint / member.doneTask) * 10) / 10 : 0;

  const byProject = useMemo(() => {
    const map = new Map<string, { projectId: string; name: string; point: number; count: number }>();
    for (const t of member.tasks) {
      const entry = map.get(t.projectId) ?? { projectId: t.projectId, name: projectNames.get(t.projectId) ?? "Unknown project", point: 0, count: 0 };
      entry.point += t.point;
      entry.count += 1;
      map.set(t.projectId, entry);
    }
    return [...map.values()].sort((a, b) => b.point - a.point);
  }, [member.tasks, projectNames]);

  const maxProjectPoint = Math.max(1, ...byProject.map((p) => p.point));

  const recentTasks = useMemo(
    () => [...member.tasks].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [member.tasks],
  );

  return (
    <div className="flex flex-col gap-5">
      <StatGrid>
        <StatCard label="Done Task" value={member.doneTask} />
        <StatCard label="Total Point" value={member.totalPoint} />
        <StatCard label="Avg Point / Task" value={avgPoint} />
      </StatGrid>

      {member.uncountedEstimateTask > 0 && <EstimateMissingBadge count={member.uncountedEstimateTask} />}

      {byProject.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-sm font-semibold text-fg">Berdasarkan Project</h3>
          <div className="flex flex-col gap-2">
            {byProject.map((p) => (
              <div key={p.projectId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-fg-subtle">
                    {p.point} point · {p.count} task
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-muted">
                  <div className="h-full rounded-pill bg-primary" style={{ width: `${(p.point / maxProjectPoint) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-display text-sm font-semibold text-fg">Task Selesai</h3>
        <ul className="flex flex-col gap-2.5">
          {recentTasks.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3 border-t border-line pt-2.5 text-sm first:border-t-0 first:pt-0">
              <div className="min-w-0">
                <p className="break-words">{t.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-fg-subtle">{projectNames.get(t.projectId) ?? "Unknown project"}</span>
                  {t.priority !== "none" && (
                    <>
                      <span className="text-fg-faint">·</span>
                      <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                    </>
                  )}
                  <span className="text-fg-faint">·</span>
                  <span className="text-xs text-fg-subtle">{formatDate(t.completedAt)}</span>
                </div>
              </div>
              <span className="shrink-0 tabular-nums text-fg-subtle">
                {t.hasUncountedEstimate ? <EstimateMissingBadge /> : `${t.point} pt`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function MembersClient({
  initialProjects,
  initialRows,
  initialPeriod,
}: {
  initialProjects: ProjectOption[];
  initialRows: MemberRow[];
  initialPeriod: { start: string; end: string };
}) {
  const [periodStart, setPeriodStart] = useState(initialPeriod.start);
  const [periodEnd, setPeriodEnd] = useState(initialPeriod.end);
  const [dateBasis, setDateBasis] = useState<"created" | "completed">("created");
  const [projectId, setProjectId] = useState<string>("");
  const [cycleId, setCycleId] = useState<string>("");
  const [moduleId, setModuleId] = useState<string>("");
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);

  const projectNames = useMemo(() => new Map(initialProjects.map((p) => [p.id, p.name])), [initialProjects]);

  const recapUrl = useMemo(() => {
    const params = new URLSearchParams({ periodStart, periodEnd, dateBasis });
    if (projectId) params.set("projectId", projectId);
    if (cycleId) params.set("cycleId", cycleId);
    if (moduleId) params.set("moduleId", moduleId);
    return `/api/members/recap?${params.toString()}`;
  }, [periodStart, periodEnd, dateBasis, projectId, cycleId, moduleId]);

  const isDefaultQuery =
    periodStart === initialPeriod.start && periodEnd === initialPeriod.end && dateBasis === "created" && !projectId && !cycleId && !moduleId;

  const { data, error, isLoading } = useSWR<{ rows: MemberRow[] }>(recapUrl, fetcher, {
    fallbackData: isDefaultQuery ? { rows: initialRows } : undefined,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const { data: projectDetail } = useSWR<{
    cycles: { id: string; name: string }[];
    modules: { id: string; name: string }[];
  }>(projectId ? `/api/projects/${projectId}` : null, fetcher, { revalidateOnFocus: false });

  const cycles: FilterOption[] = projectDetail?.cycles ?? [];
  const modules: FilterOption[] = projectDetail?.modules ?? [];
  const rows = data?.rows ?? [];

  const applyPreset = (offset: number) => {
    const r = monthRange(offset);
    setPeriodStart(r.start);
    setPeriodEnd(r.end);
  };

  const handleProjectChange = (value: string) => {
    setProjectId(value);
    setCycleId("");
    setModuleId("");
  };

  const columns: Column<MemberRow>[] = [
    { key: "member", header: "Anggota", mobile: "title", cell: (row) => row.memberName },
    { key: "doneTask", header: "Done Task", align: "right", mobile: "field", cell: (row) => row.doneTask },
    {
      key: "totalPoint",
      header: "Total Point",
      align: "right",
      mobile: "field",
      cell: (row) => (
        <span className="inline-flex items-center gap-2">
          <span className="tabular-nums">{row.totalPoint}</span>
          {row.uncountedEstimateTask > 0 && <EstimateMissingBadge count={row.uncountedEstimateTask} />}
        </span>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Rekap Point Anggota Tim"
        description={
          <>
            Dihitung dari task berstatus <b>Done</b> berdasarkan{" "}
            <b>{dateBasis === "completed" ? "tanggal task selesai (Completed Date)" : "tanggal task dibuat (Created Date)"}</b> pada periode yang
            dipilih. Klik anggota untuk lihat detail per project.
          </>
        }
      />

      <FilterBar>
        <Field label="Preset">
          <div className="flex h-11 gap-2 sm:h-9">
            <Button variant="secondary" size="sm" onClick={() => applyPreset(0)}>
              Bulan ini
            </Button>
            <Button variant="secondary" size="sm" onClick={() => applyPreset(-1)}>
              Bulan lalu
            </Button>
          </div>
        </Field>
        <Field label="Dari">
          <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </Field>
        <Field label="Sampai">
          <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        </Field>
        <Field label="Basis Tanggal">
          <Select value={dateBasis} onChange={(e) => setDateBasis(e.target.value as "created" | "completed")}>
            <option value="created">Created Date</option>
            <option value="completed">Completed Date</option>
          </Select>
        </Field>
        <Field label="Project">
          <Select value={projectId} onChange={(e) => handleProjectChange(e.target.value)}>
            <option value="">Semua Project</option>
            {initialProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cycle">
          <Select value={cycleId} onChange={(e) => setCycleId(e.target.value)} disabled={!projectId || cycles.length === 0}>
            <option value="">Semua Cycle</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Module">
          <Select value={moduleId} onChange={(e) => setModuleId(e.target.value)} disabled={!projectId || modules.length === 0}>
            <option value="">Semua Module</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </FilterBar>

      {error && <ConfigNotice message={error.message} />}

      {!error && (
        <DataTable<MemberRow>
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.memberId}
          loading={isLoading}
          onRowClick={(row) => setSelectedMember(row)}
          caption="Rekap point per anggota tim"
        />
      )}

      <Dialog
        open={selectedMember !== null}
        onOpenChange={(open) => !open && setSelectedMember(null)}
        title={selectedMember?.memberName ?? ""}
        size="lg"
      >
        {selectedMember && <MemberAnalytics member={selectedMember} projectNames={projectNames} />}
      </Dialog>
    </PageShell>
  );
}
