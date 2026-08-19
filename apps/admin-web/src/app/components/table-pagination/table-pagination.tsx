import { Button, Flex, Text } from '@radix-ui/themes';

type TablePaginationProps = {
  page: number;
  onPageChange: (next: number | ((current: number) => number)) => void;
  showTotal?: boolean;
  totalPages?: number;
  total?: number;
  totalLabel?: string;
  hasMore?: boolean;
};

export const TablePagination = ({
  page,
  onPageChange,
  showTotal = true,
  totalPages,
  total = 0,
  totalLabel = 'item',
  hasMore = false,
}: TablePaginationProps) => {
  const nextDisabled = totalPages != null ? page >= totalPages : !hasMore;

  return (
    <Flex align="center" justify="between" gap="2">
      {showTotal ? (
        <Text size="2" color="gray">
          {total} {totalLabel}
          {total !== 1 ? 's' : ''}
        </Text>
      ) : (
        <span />
      )}
      <Flex align="center" gap="2">
        <Button
          variant="soft"
          size="1"
          disabled={page <= 1}
          onClick={() => onPageChange((current) => current - 1)}
        >
          Previous
        </Button>
        <Text size="2">
          {totalPages != null ? `${page} / ${totalPages}` : `Page ${page}`}
        </Text>
        <Button
          variant="soft"
          size="1"
          disabled={nextDisabled}
          onClick={() => onPageChange((current) => current + 1)}
        >
          Next
        </Button>
      </Flex>
    </Flex>
  );
};
