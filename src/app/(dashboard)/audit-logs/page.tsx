import { getAuditLogsAction, getBranchesForFilterAction } from "@/features/audit-logs/actions";
import { AuditLogFeed } from "@/features/audit-logs/components/AuditLogFeed";

export default async function AuditLogsPage() {
  const [firstPage, { branches }] = await Promise.all([
    getAuditLogsAction(),
    getBranchesForFilterAction(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
        <p className="text-sm text-[#8a8680] mt-1">
          A history of important actions across your restaurant
        </p>
      </div>

      {!firstPage.success ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {firstPage.error}
        </div>
      ) : (
        <AuditLogFeed
          initialLogs={firstPage.logs}
          initialBranchNames={Object.fromEntries(firstPage.branchName)}
          initialCursor={firstPage.nextCursor}
          branches={branches}
        />
      )}
    </div>
  );
}