import { z } from 'zod';

const partnerNameSchema = z
  .string()
  .trim()
  .min(1, 'Partner name is required')
  .max(100, 'Partner name must be at most 100 characters');

const optionalHttpUrlSchema = (label: string) =>
  z
    .string()
    .trim()
    .max(2048, `${label} must be at most 2048 characters`)
    .pipe(
      z.union([
        z.literal(''),
        z.url({
          protocol: /^https?$/,
          hostname: /.*/,
          error: 'Enter a valid URL starting with http:// or https://',
        }),
      ]),
    );

export const partnerFormSchema = z.object({
  name: partnerNameSchema,
  lobbyUrl: optionalHttpUrlSchema('Lobby URL'),
  webhookUrl: optionalHttpUrlSchema('Webhook URL'),
});

export type PartnerFormValues = z.infer<typeof partnerFormSchema>;

export const toUpdatePartnerPayload = (values: PartnerFormValues) => ({
  name: values.name.trim(),
  lobbyUrl: values.lobbyUrl.trim() || null,
  webhookUrl: values.webhookUrl.trim() || null,
});
