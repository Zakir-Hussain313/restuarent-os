import { z } from "zod";

export const createAdminSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    phone: z.string().trim().optional(),
    role: z.enum(["ADMIN", "SUPER_ADMIN"], {
      message: "Select a valid role.",
    }),
    branchId: z.string().uuid("Select a branch.").optional(),
    salary: z.coerce.number().int().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "ADMIN" && !data.branchId) {
      ctx.addIssue({
        code: "custom",
        path: ["branchId"],
        message: "Branch is required for an Admin.",
      });
    }
  });

export type CreateAdminInput = z.infer<typeof createAdminSchema>;

export const updateAdminSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required.").optional(),
    lastName: z.string().trim().min(1, "Last name is required.").optional(),
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").optional(),
    phone: z.string().trim().optional(),
    role: z.enum(["ADMIN", "SUPER_ADMIN"], { message: "Select a valid role." }).optional(),
    branchId: z.string().uuid("Select a branch.").optional().nullable(),
    salary: z.coerce.number().int().nonnegative().optional(),
    status: z.enum(["active", "inactive", "on_leave"]).optional(),
    image: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "ADMIN" && data.branchId === null) {
      ctx.addIssue({
        code: "custom",
        path: ["branchId"],
        message: "Branch is required for an Admin.",
      });
    }
  });

export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;