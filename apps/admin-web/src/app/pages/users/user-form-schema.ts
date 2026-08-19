import { z } from 'zod';
import type { UserRole } from '../../services/admin-api.service';

export type UserFormValues = {
  email: string;
  password: string;
  roleId: string;
  partnerId?: string;
};

export const buildUserFormSchema = (
  roles: UserRole[],
  mode: 'create' | 'edit',
) =>
  z
    .object({
      email: z.string().email('Enter a valid email'),
      password:
        mode === 'create'
          ? z.string().min(6, 'Password must be at least 6 characters')
          : z
              .string()
              .refine(
                (v) => v === '' || v.length >= 6,
                'Password must be at least 6 characters',
              ),
      roleId: z.string().min(1, 'Role is required'),
      partnerId: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const role = roles.find((r) => String(r.id) === data.roleId);
      if (role?.name === 'PARTNER' && !data.partnerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Partner is required for PARTNER role',
          path: ['partnerId'],
        });
      }
    });

export const isPartnerRole = (roles: UserRole[], roleId: string) =>
  roles.find((r) => String(r.id) === roleId)?.name === 'PARTNER';
