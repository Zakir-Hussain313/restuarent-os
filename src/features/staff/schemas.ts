import { z } from "zod";

export const createStaffSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z.string().trim().optional(),
  role: z.enum(["STAFF", "RIDER"], {
    message: "Select a valid role.",
  }),
  branchId: z.string().uuid("Select a branch."),
  salary: z.coerce.number().int().nonnegative().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").optional(),
  lastName: z.string().trim().min(1, "Last name is required.").optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").optional(),
  phone: z.string().trim().optional(),
  role: z.enum(["STAFF", "RIDER"], { message: "Select a valid role." }).optional(),
  branchId: z.string().uuid("Select a branch.").optional(),
  salary: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(["active", "inactive", "on_leave"]).optional(),
  image: z.string().url().optional(),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;