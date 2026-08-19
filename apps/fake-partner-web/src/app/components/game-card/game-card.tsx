import { Card, Flex, Spinner } from '@radix-ui/themes';
import clsx from 'clsx';
import './game-card.scss';

type GameCardProps = {
  name: string;
  imageSrc: string;
  onClick: () => void;
  loading?: boolean;
};

export const GameCard = ({
  name,
  imageSrc,
  onClick,
  loading = false,
}: GameCardProps) => {
  return (
    <Card
      asChild
      variant="surface"
      className={clsx('game-card', loading && 'game-card--loading')}
    >
      <button
        type="button"
        className="game-card__button"
        onClick={onClick}
        disabled={loading}
        aria-label={name}
      >
        <img
          src={imageSrc}
          alt=""
          className="game-card__image"
          draggable={false}
        />
        {loading ? (
          <Flex className="game-card__loading" align="center" justify="center">
            <Spinner size="3" />
          </Flex>
        ) : null}
      </button>
    </Card>
  );
};
