import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required."),
  phone: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").optional(),
  address: z.string().trim().optional(),
  isMainBranch: z.boolean().optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required.").optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").optional(),
  address: z.string().trim().optional(),
  isMainBranch: z.boolean().optional(),
  image: z.string().url().optional(),
});

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

// ── Reassignment (used during branch deactivation flow) ───────────────────

export const bulkReassignStaffSchema = z.object({
  staffIds: z.array(z.string().uuid()).min(1, "Select at least one staff member."),
  newBranchId: z.string().uuid("Select a destination branch."),
});

export type BulkReassignStaffInput = z.infer<typeof bulkReassignStaffSchema>;