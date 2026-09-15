import { AdminTable } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { getAdminAuditRecords } from "@/lib/admin/operations";

export default async function AuditLogsPage() {
  await requireAdminPermission("audit.read", "/admin/audit-logs");
  const records = await getAdminAuditRecords();
  return (
    <AdminShell description="Recent immutable administrative and system audit events." title="Audit Logs">
      <AdminTable columns={["Action", "Object", "Actor", "Reason", "Created"]} emptyMessage="No audit events have been recorded." rows={records.map((record) => [
        <span className="font-semibold text-stone-950" key="action">{record.action}</span>,
        <span className="font-mono text-xs" key="object">{record.objectType}: {record.objectId}</span>,
        record.actorEmail ?? "System",
        record.reason ?? "No reason recorded",
        record.createdAt.toLocaleString("en-NG"),
      ])} />
    </AdminShell>
  );
}
