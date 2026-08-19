import { Flex, Text } from '@radix-ui/themes';

type PlinkoVerifyResultProps = {
  pathLabel: string;
  bucketLabel: string;
  path: boolean[];
  bucketIndex: number;
};

export const PlinkoVerifyResult = ({
  pathLabel,
  bucketLabel,
  path,
  bucketIndex,
}: PlinkoVerifyResultProps) => (
  <Flex direction="column" gap="1">
    <Text size="2">
      {pathLabel}: {path.map((goRight) => (goRight ? 'R' : 'L')).join('')}
    </Text>
    <Text size="2">
      {bucketLabel}: {bucketIndex}
    </Text>
  </Flex>
);
