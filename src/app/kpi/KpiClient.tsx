"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Trash2 } from "lucide-react";
import { fetcher } from "@/lib/swr-fetcher";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Notice } from "@/components/ui/Notice";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface Option {
  id: string;
  name?: string;
  displayName?: string;
}

interface KpiTarget {
  id: string;
  period: string;
  projectId: string;
  memberId: string;
  memberName: string;
  projectName: string;
  targetPoint: number | null;
  targetTask: number | null;
  weightCompletion: number;
}

interface KpiRow {
  projectId: string;
  scopeName: string;
  memberId: string;
  memberName: string;
  targetPoint: number | null;
  targetTask: number | null;
  weightCompletion: number;
  completedPoint: number;
  completedTask: number;
  pointAchievementPct: number | null;
  taskAchievementPct: number | null;
  kpiScore: number | null;
}

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function scoreTone(score: number | null): "success" | "warning" | "danger" | "neutral" {
  if (score == null) return "neutral";
  if (score >= 100) return "success";
  if (score >= 75) return "warning";
  return "danger";
}

export default function KpiClient({ initialProjects, initialMembers }: { initialProjects: Option[]; initialMembers: Option[] }) {
  const [period, setPeriod] = useState(currentPeriod());
  const [viewProjectId, setViewProjectId] = useState("");

  const [formProjectId, setFormProjectId] = useState("");
  const [formMemberId, setFormMemberId] = useState(initialMembers[0]?.id ?? "");
  const [targetPoint, setTargetPoint] = useState("");
  const [targetTask, setTargetTask] = useState("");
  const [weightCompletion, setWeightCompletion] = useState("100");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const targetsUrl = `/api/kpi/targets?period=${period}`;
  const rowsUrl = useMemo(() => {
    const params = new URLSearchParams({ period });
    if (viewProjectId) params.set("projectId", viewProjectId);
    return `/api/kpi?${params.toString()}`;
  }, [period, viewProjectId]);

  const { data: targetsData, mutate: mutateTargets } = useSWR<{ targets: KpiTarget[] }>(targetsUrl, fetcher, { revalidateOnFocus: false });
  const { data: rowsData, isLoading: rowsLoading, mutate: mutateRows } = useSWR<{ rows: KpiRow[] }>(rowsUrl, fetcher, { revalidateOnFocus: false });

  const targets = targetsData?.targets ?? [];
  const rows = rowsData?.rows ?? [];

  const saveTarget = () => {
    if (!formMemberId) {
      setFormError("Pilih anggota terlebih dahulu.");
      return;
    }
    if (!targetPoint && !targetTask) {
      setFormError("Isi minimal salah satu: Target Point atau Target Task.");
      return;
    }
    setSaving(true);
    setFormError(null);
    fetch("/api/kpi/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period,
        projectId: formProjectId,
        memberId: formMemberId,
        targetPoint: targetPoint || null,
        targetTask: targetTask || null,
        weightCompletion,
      }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Gagal menyimpan target");
        setTargetPoint("");
        setTargetTask("");
        setWeightCompletion("100");
        mutateTargets();
        mutateRows();
      })
      .catch((err) => setFormError(err.message))
      .finally(() => setSaving(false));
  };

  const deleteTarget = (id: string) => {
    fetch(`/api/kpi/targets?id=${id}`, { method: "DELETE" }).then(() => {
      mutateTargets();
      mutateRows();
    });
  };

  const targetColumns: Column<KpiTarget>[] = [
    { key: "member", header: "Anggota", mobile: "title", cell: (t) => t.memberName },
    { key: "project", header: "Scope", mobile: "subtitle", cell: (t) => t.projectName },
    { key: "targetPoint", header: "Target Point", align: "right", mobile: "field", cell: (t) => t.targetPoint ?? "-" },
    { key: "targetTask", header: "Target Task", align: "right", mobile: "field", cell: (t) => t.targetTask ?? "-" },
    { key: "weight", header: "Bobot Point", align: "right", mobile: "field", cell: (t) => `${t.weightCompletion}%` },
    {
      key: "actions",
      header: "",
      align: "right",
      mobile: "hidden",
      cell: (t) => (
        <Button variant="ghost" size="sm" onClick={() => deleteTarget(t.id)} aria-label={`Hapus target ${t.memberName}`}>
          <Trash2 className="size-4 text-danger" />
        </Button>
      ),
    },
  ];

  const kpiColumns: Column<KpiRow>[] = [
    { key: "member", header: "Anggota", mobile: "title", cell: (r) => r.memberName },
    { key: "scope", header: "Scope", mobile: "subtitle", cell: (r) => r.scopeName },
    {
      key: "point",
      header: "Point (Actual/Target)",
      align: "right",
      mobile: "field",
      cell: (r) => (r.targetPoint != null ? `${r.completedPoint} / ${r.targetPoint}` : "-"),
    },
    {
      key: "task",
      header: "Task (Actual/Target)",
      align: "right",
      mobile: "field",
      cell: (r) => (r.targetTask != null ? `${r.completedTask} / ${r.targetTask}` : "-"),
    },
    {
      key: "score",
      header: "Skor KPI",
      align: "right",
      mobile: "badge",
      cell: (r) => (
        <Badge tone={scoreTone(r.kpiScore)}>{r.kpiScore != null ? `${r.kpiScore}%` : "-"}</Badge>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="KPI"
        description="Target KPI harus dikonfigurasi dulu per anggota/periode — tanpa target, sistem tidak menampilkan skor (PRD 17)."
      />

      <FilterBar>
        <Field label="Periode">
          <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </Field>
        <Field label="Filter Project (tampilan)">
          <Select value={viewProjectId} onChange={(e) => setViewProjectId(e.target.value)}>
            <option value="">Semua Project</option>
            {initialProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </FilterBar>

      <Card>
        <CardHeader title="Tambah / Ubah Target" description="Target berdasarkan role belum didukung — Plane tidak punya konsep role yang cocok untuk KPI. Gunakan per-anggota, opsional dibatasi per-project." />
        <CardBody className="flex flex-col gap-3">
          {/* Same nesting FilterBar.tsx uses: the width-constrained field
              group and the action button are siblings inside one
              flex-wrap row, not the button forced into the [&>*]:sm:w-48
              group — that forced it to the same 192px field width and let
              it get pushed onto its own line the moment the row ran out
              of space. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end [&>*]:sm:w-48">
              <Field label="Anggota">
                <Select value={formMemberId} onChange={(e) => setFormMemberId(e.target.value)}>
                  {initialMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Scope" hint="Kosongkan untuk lintas-project">
                <Select value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)}>
                  <option value="">Semua Project</option>
                  {initialProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Target Point">
                <Input type="number" min={0} placeholder="cth. 40" value={targetPoint} onChange={(e) => setTargetPoint(e.target.value)} />
              </Field>
              <Field label="Target Task">
                <Input type="number" min={0} placeholder="opsional" value={targetTask} onChange={(e) => setTargetTask(e.target.value)} />
              </Field>
              <Field label="Bobot Point (%)" hint="Sisanya jadi bobot task">
                <Input type="number" min={0} max={100} value={weightCompletion} onChange={(e) => setWeightCompletion(e.target.value)} />
              </Field>
            </div>
            <Button variant="primary" onClick={saveTarget} loading={saving}>
              Simpan Target
            </Button>
          </div>

          {formError && <Notice tone="danger" title="Gagal menyimpan">{formError}</Notice>}

          {targets.length > 0 ? (
            <DataTable<KpiTarget> columns={targetColumns} rows={targets} getRowKey={(t) => t.id} caption="Target KPI periode ini" />
          ) : (
            <EmptyState title="Belum ada target untuk periode ini" description="Tambahkan target di atas dulu sebelum skor KPI bisa dihitung." />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Skor KPI — ${period}`} description="Dihitung dari Completed Point/Task (completed-date basis) dibanding target di atas." />
        <CardBody>
          {rows.length > 0 || rowsLoading ? (
            <DataTable<KpiRow> columns={kpiColumns} rows={rows} getRowKey={(r) => `${r.projectId}:${r.memberId}`} loading={rowsLoading} caption="Skor KPI anggota" />
          ) : (
            <EmptyState title="Belum ada skor KPI" description="Tidak ada target yang cocok dengan filter saat ini." />
          )}
        </CardBody>
      </Card>
    </PageShell>
  );
}
