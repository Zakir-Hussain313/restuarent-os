import { SettingsBranchFilter } from "./SettingsBranchFilter";
import type { SettingsBranchContext } from "../lib/resolveSettingsBranch";

export function SettingsBranchHeader({
  context,
}: {
  context: SettingsBranchContext;
}) {
  if (!context.isSuperAdmin || !context.branches) return null;

  return (
    <div className="flex justify-end">
      <SettingsBranchFilter
        branches={context.branches}
        selectedBranchId={context.branchId}
      />
    </div>
  );
}