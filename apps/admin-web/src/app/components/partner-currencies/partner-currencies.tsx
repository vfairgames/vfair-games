import {
  Button,
  Card,
  Flex,
  IconButton,
  Spinner,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import { zodResolver } from '@hookform/resolvers/zod';
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { z } from 'zod';
import { CURRENCIES } from '@vfair/app-common';
import { ComboboxSelect } from '../combobox-select/combobox-select';
import { ConfirmDeleteDialog } from '../confirm-delete-dialog/confirm-delete-dialog';
import { CurrencyFlagIcon } from '../currency-flag-icon/currency-flag-icon';
import {
  createPartnerCurrency,
  deletePartnerCurrency,
  fetchPartnerCurrencies,
  updatePartnerCurrency,
  type PartnerCurrency,
} from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';
import './partner-currencies.scss';

const limitsSchema = z
  .object({
    minBet: z.number().positive('Min bet must be greater than 0'),
    maxBet: z.number().positive('Max bet must be greater than 0'),
    maxWin: z.number().positive('Max win must be greater than 0'),
    decimals: z
      .number()
      .int('Decimals must be a whole number')
      .min(0, 'Decimals must be at least 0')
      .max(8, 'Decimals must be at most 8'),
  })
  .refine((values) => values.maxBet >= values.minBet, {
    message: 'Max bet must be greater than or equal to min bet',
    path: ['maxBet'],
  })
  .refine((values) => values.maxWin >= values.maxBet, {
    message: 'Max win must be greater than or equal to max bet',
    path: ['maxWin'],
  });

const createCurrencySchema = limitsSchema.safeExtend({
  code: z.string().min(1, 'Currency is required'),
});

type CreateCurrencyFormValues = z.infer<typeof createCurrencySchema>;
type LimitsFormValues = z.infer<typeof limitsSchema>;

type PartnerCurrenciesProps = {
  partnerId: number;
};

const numberField = { valueAsNumber: true } as const;

const LimitsFields = ({
  register,
  errors,
}: {
  register: UseFormRegister<LimitsFormValues>;
  errors: FieldErrors<LimitsFormValues>;
}) => (
  <>
    <Flex direction="column" gap="1">
      <Text as="label" size="2" weight="medium">
        Min bet
      </Text>
      <TextField.Root
        type="number"
        step="any"
        min="0"
        color={errors.minBet ? 'red' : undefined}
        {...register('minBet', numberField)}
      />
      {errors.minBet && (
        <Text size="1" color="red">
          {errors.minBet.message}
        </Text>
      )}
    </Flex>
    <Flex direction="column" gap="1">
      <Text as="label" size="2" weight="medium">
        Max bet
      </Text>
      <TextField.Root
        type="number"
        step="any"
        min="0"
        color={errors.maxBet ? 'red' : undefined}
        {...register('maxBet', numberField)}
      />
      {errors.maxBet && (
        <Text size="1" color="red">
          {errors.maxBet.message}
        </Text>
      )}
    </Flex>
    <Flex direction="column" gap="1">
      <Text as="label" size="2" weight="medium">
        Max win
      </Text>
      <TextField.Root
        type="number"
        step="any"
        min="0"
        color={errors.maxWin ? 'red' : undefined}
        {...register('maxWin', numberField)}
      />
      {errors.maxWin && (
        <Text size="1" color="red">
          {errors.maxWin.message}
        </Text>
      )}
    </Flex>
    <Flex direction="column" gap="1">
      <Text as="label" size="2" weight="medium">
        Decimals
      </Text>
      <TextField.Root
        type="number"
        step="1"
        min="0"
        max="8"
        color={errors.decimals ? 'red' : undefined}
        {...register('decimals', numberField)}
      />
      {errors.decimals && (
        <Text size="1" color="red">
          {errors.decimals.message}
        </Text>
      )}
    </Flex>
  </>
);

export const PartnerCurrencies = ({ partnerId }: PartnerCurrenciesProps) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PartnerCurrency | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartnerCurrency | null>(
    null,
  );

  const { data: currencies = [], isFetching } = useQuery({
    queryKey: ['partner-currencies', partnerId],
    queryFn: () => fetchPartnerCurrencies(partnerId),
  });

  const configuredCodes = useMemo(
    () => new Set(currencies.map((currency) => currency.code)),
    [currencies],
  );

  const availableCurrencyOptions = useMemo(
    () =>
      Object.keys(CURRENCIES)
        .filter((code) => !configuredCodes.has(code))
        .map((code) => ({
          value: code,
          label: code,
          leading: <CurrencyFlagIcon currency={code} />,
        })),
    [configuredCodes],
  );

  const invalidateCurrencies = () => {
    void queryClient.invalidateQueries({
      queryKey: ['partner-currencies', partnerId],
    });
  };

  const createMutation = useMutation({
    mutationFn: (values: CreateCurrencyFormValues) =>
      createPartnerCurrency(partnerId, values),
    onSuccess: (created) => {
      toast.success(`${created.code} currency added`);
      invalidateCurrencies();
      setAddOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      currencyId,
      values,
    }: {
      currencyId: number;
      values: LimitsFormValues;
    }) => updatePartnerCurrency(partnerId, currencyId, values),
    onSuccess: (updated) => {
      toast.success(`${updated.code} currency updated`);
      invalidateCurrencies();
      setEditTarget(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (currency: PartnerCurrency) =>
      deletePartnerCurrency(partnerId, currency.id),
    onSuccess: (_data, currency) => {
      toast.success(`${currency.code} currency removed`);
      setDeleteTarget(null);
      invalidateCurrencies();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createForm = useForm<CreateCurrencyFormValues>({
    resolver: zodResolver(createCurrencySchema),
    defaultValues: {
      code: '',
      minBet: 1,
      maxBet: 100,
      maxWin: 1000,
      decimals: 2,
    },
  });

  const editForm = useForm<LimitsFormValues>({
    resolver: zodResolver(limitsSchema),
    values: editTarget
      ? {
          minBet: editTarget.minBet,
          maxBet: editTarget.maxBet,
          maxWin: editTarget.maxWin,
          decimals: editTarget.decimals,
        }
      : undefined,
  });

  const onCreateSubmit = createForm.handleSubmit((values) => {
    createMutation.mutate(values);
  });

  const onEditSubmit = editForm.handleSubmit((values) => {
    if (!editTarget) {
      return;
    }
    updateMutation.mutate({ currencyId: editTarget.id, values });
  });

  const handleAddOpen = () => {
    setEditTarget(null);
    createForm.reset({
      code: '',
      minBet: 1,
      maxBet: 100,
      maxWin: 1000,
      decimals: 2,
    });
    setAddOpen(true);
  };

  if (isFetching && currencies.length === 0) {
    return (
      <Flex justify="center" py="6">
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4" className="partner-currencies">
      <Flex justify="end">
        <Button
          onClick={handleAddOpen}
          disabled={addOpen || availableCurrencyOptions.length === 0}
        >
          Add currency
        </Button>
      </Flex>

      {addOpen && (
        <Card className="partner-currencies__form-card">
          <form onSubmit={onCreateSubmit}>
            <Flex direction="column" gap="4">
              <Text size="3" weight="medium">
                Add currency
              </Text>
              <Flex direction="column" gap="1">
                <Text as="label" size="2" weight="medium">
                  Currency
                </Text>
                <ComboboxSelect
                  value={createForm.watch('code')}
                  onChange={(value) =>
                    createForm.setValue('code', value, { shouldValidate: true })
                  }
                  options={availableCurrencyOptions}
                  placeholder="Select currency"
                  hasError={!!createForm.formState.errors.code}
                />
                {createForm.formState.errors.code && (
                  <Text size="1" color="red">
                    {createForm.formState.errors.code.message}
                  </Text>
                )}
              </Flex>
              <LimitsFields
                register={
                  createForm.register as unknown as UseFormRegister<LimitsFormValues>
                }
                errors={createForm.formState.errors}
              />
              <Flex gap="2" justify="end">
                <Button
                  type="button"
                  variant="soft"
                  color="gray"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={createMutation.isPending}>
                  Add
                </Button>
              </Flex>
            </Flex>
          </form>
        </Card>
      )}

      {editTarget && (
        <Card className="partner-currencies__form-card">
          <form onSubmit={onEditSubmit}>
            <Flex direction="column" gap="4">
              <Flex align="center" gap="2">
                <Text size="3" weight="medium">
                  Edit
                </Text>
                <CurrencyFlagIcon currency={editTarget.code} />
                <Text size="3" weight="medium">
                  {editTarget.code}
                </Text>
              </Flex>
              <LimitsFields
                register={editForm.register}
                errors={editForm.formState.errors}
              />
              <Flex gap="2" justify="end">
                <Button
                  type="button"
                  variant="soft"
                  color="gray"
                  onClick={() => setEditTarget(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={updateMutation.isPending}>
                  Save
                </Button>
              </Flex>
            </Flex>
          </form>
        </Card>
      )}

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Currency</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Min bet</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Max bet</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Max win</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Decimals</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="partner-currencies__actions-col">
              Actions
            </Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {currencies.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={6}>
                <Text size="2" color="gray">
                  No currencies configured.
                </Text>
              </Table.Cell>
            </Table.Row>
          ) : (
            currencies.map((currency) => (
              <Table.Row key={currency.id}>
                <Table.Cell>
                  <Flex align="center" gap="2">
                    <CurrencyFlagIcon currency={currency.code} />
                    <Text size="2">{currency.code}</Text>
                  </Flex>
                </Table.Cell>
                <Table.Cell>{currency.minBet}</Table.Cell>
                <Table.Cell>{currency.maxBet}</Table.Cell>
                <Table.Cell>{currency.maxWin}</Table.Cell>
                <Table.Cell>{currency.decimals}</Table.Cell>
                <Table.Cell>
                  <Flex gap="2" justify="end">
                    <IconButton
                      variant="ghost"
                      size="1"
                      onClick={() => {
                        setAddOpen(false);
                        setEditTarget(currency);
                      }}
                      aria-label={`Edit ${currency.code}`}
                    >
                      <PencilSimpleIcon size={16} />
                    </IconButton>
                    <IconButton
                      variant="ghost"
                      size="1"
                      color="red"
                      onClick={() => setDeleteTarget(currency)}
                      aria-label={`Remove ${currency.code}`}
                    >
                      <TrashIcon size={16} />
                    </IconButton>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table.Root>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Remove currency"
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        description={
          <>
            Remove <strong>{deleteTarget?.code ?? ''}</strong> config for this
            partner? This action cannot be undone.
          </>
        }
      />
    </Flex>
  );
};
