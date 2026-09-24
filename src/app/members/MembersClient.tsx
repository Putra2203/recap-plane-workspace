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
import { EstimateMissingBadge } from "@/components/ui/Badge";
import { KeyValue } from "@/components/ui/KeyValue";

interface MemberTask {
  id: string;
  name: string;
  point: number;
  hasUncountedEstimate: boolean;
  completedAt: string | null;
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
            dipilih.
          </>
        }
      />

      <FilterBar>
        <Field label="Preset">
          <div className="flex h-9 gap-2 sm:h-8">
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

      <Dialog open={selectedMember !== null} onOpenChange={(open) => !open && setSelectedMember(null)} title={selectedMember?.memberName ?? ""}>
        {selectedMember && (
          <div className="flex flex-col gap-3">
            <KeyValue
              items={[
                { key: "doneTask", label: "Done Task", value: selectedMember.doneTask },
                { key: "totalPoint", label: "Total Point", value: selectedMember.totalPoint },
              ]}
            />
            <ul className="flex flex-col gap-2 text-sm">
              {selectedMember.tasks.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-2 border-t border-line pt-2 first:border-t-0 first:pt-0">
                  <span className="min-w-0 break-words">{t.name}</span>
                  <span className="shrink-0 tabular-nums text-fg-subtle">
                    {t.hasUncountedEstimate ? <EstimateMissingBadge /> : `${t.point} point`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Dialog>
    </PageShell>
  );
}
