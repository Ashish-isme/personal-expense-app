import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

/**
 * Wraps an async Express handler so thrown errors are forwarded to the
 * central error middleware instead of crashing the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Parses `body` against a Zod schema, throwing a 400-friendly error on failure. */
export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const err = new Error(result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "));
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  return result.data;
}

// ---- Shared field schemas ----------------------------------------------------

export const expenseSchema = z.object({
  date: z.coerce.date(),
  category: z.string().trim().min(1, "Category is required").max(40, "Category must be 40 characters or fewer"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["Cash", "Bank", "eSewa", "Khalti"]).default("Cash"),
  notes: z.string().optional().nullable(),
});

export const incomeSchema = z.object({
  date: z.coerce.date(),
  source: z.string().min(1, "Source is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  notes: z.string().optional().nullable(),
});

export const budgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  category: z.string().trim().min(1, "Category is required"),
  amount: z.coerce.number().nonnegative("Amount must be 0 or more"),
  // "every" = the category's standing goal for every month; "month" = this month only.
  scope: z.enum(["every", "month"]).default("every"),
});

export const recurringSchema = z
  .object({
    type: z.enum(["expense", "income"]).default("expense"),
    frequency: z.enum(["weekly", "monthly"]).default("monthly"),
    category: z.string().min(1, "Category is required"),
    description: z.string().min(1, "Description is required"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    paymentMethod: z.enum(["Cash", "Bank", "eSewa", "Khalti"]).default("Cash"),
    notes: z.string().optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    active: z.boolean().optional().default(true),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

// ---- Group / shared-expense schemas ------------------------------------------

export const groupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(60, "Group name is too long"),
});

export const groupExpenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.coerce.date(),
  // Who actually paid. Defaults to the requesting user when omitted.
  paidById: z.string().optional(),
  splitMode: z.enum(["equal", "custom", "percent"]).default("equal"),
  notes: z.string().optional().nullable(),
  participants: z
    .array(
      z.object({
        userId: z.string().min(1),
        // Exact share for "custom", percentage for "percent", unused for "equal".
        value: z.coerce.number().optional(),
      })
    )
    .min(1, "Pick at least one person to split with"),
});

export const settlementSchema = z.object({
  // Who is being paid. The payer is always the requesting user.
  toUserId: z.string().min(1, "Recipient is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  note: z.string().optional().nullable(),
});

export const debtSchema = z.object({
  person: z.string().min(1, "Person is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  direction: z.enum(["i_owe", "owed_to_me"]).default("i_owe"),
  status: z.enum(["pending", "paid"]).default("pending"),
});
