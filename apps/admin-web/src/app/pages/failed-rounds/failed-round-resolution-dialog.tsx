import { Button, Dialog, Flex, Text, TextArea } from '@radix-ui/themes';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  failedRoundResolutionFormSchema,
  type FailedRoundResolutionFormValues,
} from './failed-round-resolution-form-schema';

type FailedRoundResolutionDialogProps = {
  open: boolean;
  mode: 'solve' | 'unsolve';
  loading: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
};

export const FailedRoundResolutionDialog = ({
  open,
  mode,
  loading,
  onClose,
  onSubmit,
}: FailedRoundResolutionDialogProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FailedRoundResolutionFormValues>({
    resolver: zodResolver(failedRoundResolutionFormSchema),
    defaultValues: { note: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ note: '' });
    }
  }, [open, reset]);

  const title = mode === 'solve' ? 'Mark as solved' : 'Mark as unsolved';
  const confirmLabel = mode === 'solve' ? 'Mark as solved' : 'Mark as unsolved';
  const description =
    mode === 'solve'
      ? 'Describe how this failed round was resolved.'
      : 'Describe why this failed round is being marked unsolved.';

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description mb="3">{description}</Dialog.Description>
        <form
          onSubmit={handleSubmit((values) => {
            onSubmit(values.note);
          })}
        >
          <Flex direction="column" gap="1" mb="4">
            <Text as="label" size="2" weight="medium" htmlFor="resolution-note">
              Note
            </Text>
            <TextArea
              id="resolution-note"
              rows={5}
              color={errors.note ? 'red' : undefined}
              {...register('note')}
            />
            {errors.note ? (
              <Text size="1" color="red">
                {errors.note.message}
              </Text>
            ) : null}
          </Flex>
          <Flex gap="2" justify="end">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" loading={loading}>
              {confirmLabel}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};
