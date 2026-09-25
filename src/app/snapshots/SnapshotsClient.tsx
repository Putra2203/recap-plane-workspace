"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Lock, ShieldCheck } from "lucide-react";
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

interface ProjectOption {
  id: string;
  name: string;
}

interface SnapshotRow {
  projectId: string;
  projectName: string;
  memberId: string;
  memberName: string;
  totalAssignedTask: number;
  completedTask: number;
  totalEstimate: number;
  completedEstimate: number;
}

interface PeriodSummary {
  period: string;
  rowCount: number;
  lastSnapshotAt: string;
}

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const rowColumns = (showProject: boolean): Column<SnapshotRow>[] => [
  ...(showProject
    ? [{ key: "project", header: "Project", mobile: "subtitle", cell: (r: SnapshotRow) => r.projectName } as Column<SnapshotRow>]
    : []),
  { key: "member", header: "Anggota", mobile: "title", cell: (r) => r.memberName },
  { key: "doneTask", header: "Done Task", align: "right", mobile: "field", cell: (r) => r.completedTask },
  { key: "point", header: "Point", align: "right", mobile: "field", cell: (r) => <span className="tabular-nums">{r.completedEstimate}</span> },
];

const historyColumns: Column<PeriodSummary>[] = [
  { key: "period", header: "Periode", mobile: "title", cell: (r) => r.period },
  { key: "rowCount", header: "Baris Terkunci", align: "right", mobile: "field", cell: (r) => r.rowCount },
  {
    key: "lastSnapshotAt",
    header: "Terakhir Dikunci",
    mobile: "subtitle",
    cell: (r) => new Date(r.lastSnapshotAt).toLocaleString("id-ID"),
  },
];

export default function SnapshotsClient({ initialProjects }: { initialProjects: ProjectOption[] }) {
  const [period, setPeriod] = useState(currentPeriod());
  const [projectId, setProjectId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({ period });
    if (projectId) params.set("projectId", projectId);
    return `/api/snapshots/preview?${params.toString()}`;
  }, [period, projectId]);

  const lockedUrl = useMemo(() => {
    const params = new URLSearchParams({ period });
    if (projectId) params.set("projectId", projectId);
    return `/api/snapshots?${params.toString()}`;
  }, [period, projectId]);

  // keepPreviousData on both: without it, changing Period/Project makes both
  // queries return undefined for a moment, so previewProjectIds/
  // lockedProjectIds below both empty out and `fullyLocked` goes false —
  // a real flash of "not locked yet" (Kunci button enabled, live-data copy)
  // for a period that's actually already locked, until both resolve.
  const { data: previewData, isLoading: previewLoading } = useSWR<{ rows: SnapshotRow[] }>(previewUrl, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
  const { data: lockedData, mutate: mutateLocked } = useSWR<{ rows: SnapshotRow[] }>(lockedUrl, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
  const { data: historyData, mutate: mutateHistory } = useSWR<{ periods: PeriodSummary[] }>("/api/snapshots", fetcher, {
    revalidateOnFocus: false,
  });

  const previewRows = previewData?.rows ?? [];
  const lockedRows = lockedData?.rows ?? [];
  const previewProjectIds = new Set(previewRows.map((r) => r.projectId));
  const lockedProjectIds = new Set(lockedRows.map((r) => r.projectId));
  const fullyLocked = previewProjectIds.size > 0 && [...previewProjectIds].every((id) => lockedProjectIds.has(id));
  const partiallyLocked = lockedProjectIds.size > 0 && !fullyLocked;

  const handlePeriodOrScopeChange = () => {
    setConfirming(false);
    setLockError(null);
  };

  const handleLock = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setLocking(true);
    setLockError(null);
    fetch("/api/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, projectId: projectId || undefined }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Gagal mengunci periode ini");
        mutateLocked();
        mutateHistory();
        setConfirming(false);
      })
      .catch((err) => setLockError(err.message))
      .finally(() => setLocking(false));
  };

  return (
    <PageShell>
      <PageHeader
        title="Kunci Rekap Bulanan"
        description="Bekukan rekap point anggota untuk satu bulan supaya angkanya tidak berubah lagi walau data di Plane diedit belakangan. Sekali dikunci, periode & project yang sama tidak bisa dikunci ulang."
      />

      <FilterBar>
        <Field label="Periode">
          <Input
            type="month"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              handlePeriodOrScopeChange();
            }}
          />
        </Field>
        <Field label="Project">
          <Select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              handlePeriodOrScopeChange();
            }}
          >
            <option value="">Semua Project</option>
            {initialProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </FilterBar>

      {lockError && <Notice tone="danger" title="Gagal mengunci">{lockError}</Notice>}

      {partiallyLocked && (
        <Notice tone="warning" title="Sebagian project di periode ini sudah dikunci">
          Project yang sudah terkunci tidak akan dikunci ulang. Pilih project satu per satu untuk melihat mana yang belum.
        </Notice>
      )}

      <Card>
        <CardHeader
          title={`Preview — ${period}`}
          description={
            fullyLocked
              ? "Periode & scope ini sudah terkunci. Angka di bawah adalah data yang tersimpan (frozen), bukan data live."
              : "Data live dari sync terakhir. Cek dulu sebelum dikunci."
          }
          actions={
            fullyLocked ? (
              <Badge tone="success" icon={<ShieldCheck className="size-3.5" />}>
                Terkunci
              </Badge>
            ) : (
              <Button variant={confirming ? "danger" : "primary"} size="sm" leftIcon={<Lock className="size-4" />} loading={locking} onClick={handleLock}>
                {confirming ? "Klik lagi untuk konfirmasi" : "Kunci Bulan Ini"}
              </Button>
            )
          }
        />
        <CardBody>
          {fullyLocked ? (
            lockedRows.length > 0 ? (
              <DataTable<SnapshotRow> columns={rowColumns(!projectId)} rows={lockedRows} getRowKey={(r) => `${r.projectId}:${r.memberId}`} caption="Rekap terkunci" />
            ) : (
              <EmptyState title="Tidak ada baris terkunci" description="Periode ini sudah ditandai terkunci tapi tidak ada baris tersimpan." />
            )
          ) : previewLoading ? (
            <DataTable<SnapshotRow> columns={rowColumns(!projectId)} rows={[]} getRowKey={(r) => `${r.projectId}:${r.memberId}`} loading caption="Preview rekap" />
          ) : previewRows.length > 0 ? (
            <DataTable<SnapshotRow> columns={rowColumns(!projectId)} rows={previewRows} getRowKey={(r) => `${r.projectId}:${r.memberId}`} caption="Preview rekap" />
          ) : (
            <EmptyState title="Tidak ada task Done" description="Tidak ada task Done pada periode & scope ini untuk dikunci." />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Riwayat Lock" description="Periode yang sudah pernah dikunci. Klik baris untuk lompat ke periode itu." />
        <CardBody>
          {historyData?.periods.length ? (
            <DataTable<PeriodSummary>
              columns={historyColumns}
              rows={historyData.periods}
              getRowKey={(r) => r.period}
              onRowClick={(r) => {
                setPeriod(r.period);
                handlePeriodOrScopeChange();
              }}
              caption="Riwayat periode terkunci"
            />
          ) : (
            <EmptyState title="Belum ada periode yang dikunci" description="Kunci bulan pertama Anda untuk mulai membangun riwayat." />
          )}
        </CardBody>
      </Card>
    </PageShell>
  );
}
