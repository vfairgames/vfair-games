import { Flex, Text } from '@radix-ui/themes';

type KenoVerifyResultProps = {
  label: string;
  drawnNumbers: number[];
};

export const KenoVerifyResult = ({
  label,
  drawnNumbers,
}: KenoVerifyResultProps) => (
  <Flex direction="column" gap="1">
    <Text size="2">
      {label}: {drawnNumbers.join(', ')}
    </Text>
  </Flex>
);
