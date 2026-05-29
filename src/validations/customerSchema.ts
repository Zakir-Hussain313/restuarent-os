import { z } from "zod";

export const customerAddressSchema = z.object({
  label: z.string().min(1, "Label is required"),
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const customerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^[0-9+\-\s]{10,15}$/, "Invalid phone number")
    .min(1, "Phone number is required"),
  addresses: z.array(customerAddressSchema).default([]),
  notes: z.string().max(500).optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;