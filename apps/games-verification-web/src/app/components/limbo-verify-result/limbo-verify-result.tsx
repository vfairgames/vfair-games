import { Flex, Text } from '@radix-ui/themes';
import './limbo-verify-result.scss';

type LimboVerifyResultProps = {
  label: string;
  rolledMultiplier: number;
};

export const LimboVerifyResult = ({
  label,
  rolledMultiplier,
}: LimboVerifyResultProps) => (
  <Flex direction="column" gap="2" align="start">
    <Text size="3" weight="medium">
      {label}
    </Text>
    <span className="limbo-verify-result__crash">
      {rolledMultiplier.toFixed(2)}x
    </span>
  </Flex>
);
