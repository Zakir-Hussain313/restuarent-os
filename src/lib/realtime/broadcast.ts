import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { branchChannel, type RealtimeResource } from "./channels";

export async function broadcastChange(
  branchId: string,
  resource: RealtimeResource
): Promise<void> {
  if (!branchId) return;

  try {
    const channel = supabaseAdmin.channel(branchChannel(branchId, resource));
    await channel.httpSend("changed", {});
    await supabaseAdmin.removeChannel(channel);
  } catch (err) {
    console.error(`[broadcastChange] failed for ${resource} on branch ${branchId}:`, err);
  }
}