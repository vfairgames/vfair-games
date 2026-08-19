import { AlertDialog, Button, Flex } from '@radix-ui/themes';
import type { ReactNode } from 'react';

type ConfirmDeleteDialogBaseProps = {
  open: boolean;
  title: string;
  confirmLabel?: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

type ConfirmDeleteDialogWithEntity = ConfirmDeleteDialogBaseProps & {
  entityName: string;
  description?: never;
};

type ConfirmDeleteDialogWithDescription = ConfirmDeleteDialogBaseProps & {
  description: ReactNode;
  entityName?: never;
};

type ConfirmDeleteDialogProps =
  | ConfirmDeleteDialogWithEntity
  | ConfirmDeleteDialogWithDescription;

export const ConfirmDeleteDialog = ({
  open,
  title,
  confirmLabel = 'Delete',
  loading,
  onConfirm,
  onClose,
  ...content
}: ConfirmDeleteDialogProps) => (
  <AlertDialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
    <AlertDialog.Content maxWidth="400px">
      <AlertDialog.Title>{title}</AlertDialog.Title>
      <AlertDialog.Description>
        {'description' in content && content.description ? (
          content.description
        ) : (
          <>
            Are you sure you want to delete{' '}
            <strong>{content.entityName}</strong>? This action cannot be undone.
          </>
        )}
      </AlertDialog.Description>
      <Flex gap="2" mt="4" justify="end">
        <AlertDialog.Cancel>
          <Button variant="soft" color="gray">
            Cancel
          </Button>
        </AlertDialog.Cancel>
        <AlertDialog.Action>
          <Button color="red" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </AlertDialog.Action>
      </Flex>
    </AlertDialog.Content>
  </AlertDialog.Root>
);
