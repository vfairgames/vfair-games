import { Flex, Text } from '@radix-ui/themes';
import { MINES_GRID_SIZE } from '@vfair/game-math';
import bombSvg from '../../../assets/bomb.svg';
import gemSvg from '../../../assets/gem.svg';
import './mines-verify-result.scss';

type MinesVerifyResultProps = {
  label: string;
  mineLayout: number[];
};

export const MinesVerifyResult = ({
  label,
  mineLayout,
}: MinesVerifyResultProps) => (
  <Flex direction="column" gap="2">
    <Text size="3" weight="medium">
      {label}
    </Text>
    <div className="mines-verify-result__grid">
      {Array.from({ length: MINES_GRID_SIZE }, (_, index) => {
        const isMine = mineLayout.includes(index);
        return (
          <div key={index} className="mines-verify-result__tile">
            <img
              className="mines-verify-result__tile-icon"
              src={isMine ? bombSvg : gemSvg}
              alt=""
            />
          </div>
        );
      })}
    </div>
  </Flex>
);
