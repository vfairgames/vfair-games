import { Flex, Spinner, Text, TextField } from '@radix-ui/themes';
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { ComboboxSelect } from '../../../components/combobox-select/combobox-select';
import type { UserRole } from '../../../services/admin-api.service';
import type { UserFormValues } from '../user-form-schema';

type PartnerOption = {
  id: number;
  name: string;
};

type UserFormFieldsProps = {
  register: UseFormRegister<UserFormValues>;
  control: Control<UserFormValues>;
  errors: FieldErrors<UserFormValues>;
  roles: UserRole[];
  partners: PartnerOption[];
  isPartnerRole: boolean;
  partnersLoading: boolean;
  fixedAssignment?: {
    roleName: string;
    partnerName: string;
  };
  passwordOptional?: boolean;
  emailAutoFocus?: boolean;
};

export const UserFormFields = ({
  register,
  control,
  errors,
  roles,
  partners,
  isPartnerRole,
  partnersLoading,
  fixedAssignment,
  passwordOptional = false,
  emailAutoFocus = false,
}: UserFormFieldsProps) => (
  <>
    <Flex direction="column" gap="1">
      <Text as="label" size="2" weight="medium">
        Email
      </Text>
      <TextField.Root
        type="email"
        placeholder="user@example.com"
        autoComplete="off"
        autoFocus={emailAutoFocus}
        color={errors.email ? 'red' : undefined}
        {...register('email')}
      />
      {errors.email && (
        <Text size="1" color="red">
          {errors.email.message}
        </Text>
      )}
    </Flex>

    <Flex direction="column" gap="1">
      <Text as="label" size="2" weight="medium">
        Password
      </Text>
      <TextField.Root
        type="password"
        placeholder={
          passwordOptional ? 'Leave blank to keep current' : 'Min. 6 characters'
        }
        autoComplete="off"
        color={errors.password ? 'red' : undefined}
        {...register('password')}
      />
      {errors.password && (
        <Text size="1" color="red">
          {errors.password.message}
        </Text>
      )}
    </Flex>

    <Flex direction="column" gap="1">
      <Text as="label" size="2" weight="medium">
        Role
      </Text>
      {fixedAssignment ? (
        <Text size="2">{fixedAssignment.roleName}</Text>
      ) : (
        <>
          <Controller
            name="roleId"
            control={control}
            render={({ field }) => (
              <ComboboxSelect
                value={field.value}
                onChange={field.onChange}
                placeholder="Select role"
                hasError={!!errors.roleId}
                options={roles.map((r) => ({
                  value: String(r.id),
                  label: r.name,
                }))}
              />
            )}
          />
          {errors.roleId && (
            <Text size="1" color="red">
              {errors.roleId.message}
            </Text>
          )}
        </>
      )}
    </Flex>

    {isPartnerRole && (
      <Flex direction="column" gap="1">
        <Text as="label" size="2" weight="medium">
          Partner
        </Text>
        {fixedAssignment ? (
          <Text size="2">{fixedAssignment.partnerName}</Text>
        ) : partnersLoading && partners.length === 0 ? (
          <Spinner size="2" />
        ) : (
          <>
            <Controller
              name="partnerId"
              control={control}
              render={({ field }) => (
                <ComboboxSelect
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Select partner"
                  hasError={!!errors.partnerId}
                  options={partners.map((p) => ({
                    value: String(p.id),
                    label: p.name,
                  }))}
                />
              )}
            />
            {errors.partnerId && (
              <Text size="1" color="red">
                {errors.partnerId.message}
              </Text>
            )}
          </>
        )}
      </Flex>
    )}
  </>
);
