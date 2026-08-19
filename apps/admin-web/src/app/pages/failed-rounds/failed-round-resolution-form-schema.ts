import { z } from 'zod';

export const failedRoundResolutionFormSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, 'Note is required')
    .max(4000, 'Note must be at most 4000 characters'),
});

export type FailedRoundResolutionFormValues = z.infer<
  typeof failedRoundResolutionFormSchema
>;
