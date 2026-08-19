import { Flex, Text } from '@radix-ui/themes';
import './dice-verify-result.scss';

type DiceVerifyResultProps = {
  label: string;
  rolledValue: number;
};

export const DiceVerifyResult = ({
  label,
  rolledValue,
}: DiceVerifyResultProps) => (
  <Flex direction="column" gap="2" align="start">
    <Text size="3" weight="medium">
      {label}
    </Text>
    <span className="dice-verify-result__roll">{rolledValue.toFixed(2)}</span>
  </Flex>
);
