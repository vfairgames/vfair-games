import {
  Badge,
  Button,
  Callout,
  Flex,
  Grid,
  Heading,
  IconButton,
  Select,
  Spinner,
  Text,
  TextField,
} from '@radix-ui/themes';
import { MoonIcon, SunIcon } from '@phosphor-icons/react';
import {
  DICE_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
  KENO_GAME_ID,
  getAvailableGame,
} from '@vfair/game-contracts';
import {
  DEFAULT_PLINKO_ROWS,
  MAX_MINE_COUNT,
  MAX_PLINKO_ROWS,
  MIN_MINE_COUNT,
  MIN_PLINKO_ROWS,
  drawKenoNumbers,
  generateMineLayout,
  hashServerSeed,
  rollDice,
  rollLimbo,
  rollPlinko,
} from '@vfair/game-math';
import DOMPurify from 'dompurify';
import { useEffect, useState, type ReactNode } from 'react';
import type { ResolvedVerificationSettings } from '../../bootstrap/bootstrap-verification-settings';
import { createTranslator } from '../../i18n/i18n';
import { fetchVerificationContent } from '../../services/verification-content.service';
import { DiceVerifyResult } from '../dice-verify-result/dice-verify-result';
import { LimboVerifyResult } from '../limbo-verify-result/limbo-verify-result';
import { MinesVerifyResult } from '../mines-verify-result/mines-verify-result';
import { KenoVerifyResult } from '../keno-verify-result/keno-verify-result';
import { PlinkoVerifyResult } from '../plinko-verify-result/plinko-verify-result';
import './verification-tool.scss';

type VerificationToolProps = {
  settings: ResolvedVerificationSettings;
  hasSettingsError: boolean;
  appearance: 'light' | 'dark';
  onToggleAppearance: () => void;
};

type HashStatus = 'match' | 'mismatch' | 'skipped';

type VerifyResult =
  | { kind: 'dice'; rolledValue: number; hashStatus: HashStatus }
  | { kind: 'limbo'; rolledMultiplier: number; hashStatus: HashStatus }
  | { kind: 'mines'; mineLayout: number[]; hashStatus: HashStatus }
  | {
      kind: 'plinko';
      path: boolean[];
      bucketIndex: number;
      hashStatus: HashStatus;
    }
  | {
      kind: 'keno';
      drawnNumbers: number[];
      hashStatus: HashStatus;
    };

const MINE_COUNT_OPTIONS = Array.from(
  { length: MAX_MINE_COUNT - MIN_MINE_COUNT + 1 },
  (_, index) => MIN_MINE_COUNT + index,
);

const PLINKO_ROW_OPTIONS = Array.from(
  { length: MAX_PLINKO_ROWS - MIN_PLINKO_ROWS + 1 },
  (_, index) => MIN_PLINKO_ROWS + index,
);

const HASH_BADGE = {
  match: { color: 'green' as const, key: 'hashMatch' as const },
  mismatch: { color: 'red' as const, key: 'hashMismatch' as const },
  skipped: { color: 'gray' as const, key: 'hashSkipped' as const },
};

const resolveHashStatus = (
  serverSeed: string,
  serverSeedHash: string,
): HashStatus => {
  const trimmedHash = serverSeedHash.trim();
  if (!trimmedHash) {
    return 'skipped';
  }
  return hashServerSeed(serverSeed) === trimmedHash ? 'match' : 'mismatch';
};

const LabeledField = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <Flex direction="column" gap="2">
    <Text size="2" weight="medium">
      {label}
    </Text>
    {children}
  </Flex>
);

export const VerificationTool = ({
  settings,
  hasSettingsError,
  appearance,
  onToggleAppearance,
}: VerificationToolProps) => {
  const t = createTranslator(settings.lang);
  const [gameId, setGameId] = useState(settings.games[0]?.id ?? DICE_GAME_ID);
  const [serverSeed, setServerSeed] = useState('');
  const [serverSeedHash, setServerSeedHash] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState('0');
  const [mineCount, setMineCount] = useState('3');
  const [plinkoRows, setPlinkoRows] = useState(String(DEFAULT_PLINKO_ROWS));
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [helpHtml, setHelpHtml] = useState('');
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpError, setHelpError] = useState(false);

  const selectedGame =
    settings.games.find((game) => game.id === gameId) ?? settings.games[0];

  useEffect(() => {
    let cancelled = false;

    const loadHelp = async () => {
      if (!settings.partnerCode) {
        setHelpHtml('');
        setHelpLoading(false);
        setHelpError(false);
        return;
      }

      setHelpLoading(true);
      setHelpError(false);
      try {
        const html = await fetchVerificationContent(
          gameId,
          settings.partnerCode,
          settings.lang,
        );
        if (!cancelled) {
          setHelpHtml(html);
        }
      } catch {
        if (!cancelled) {
          setHelpHtml('');
          setHelpError(true);
        }
      } finally {
        if (!cancelled) {
          setHelpLoading(false);
        }
      }
    };

    void loadHelp();

    return () => {
      cancelled = true;
    };
  }, [gameId, settings.lang, settings.partnerCode]);

  const handleVerify = () => {
    setFormError(null);
    setResult(null);

    const trimmedServerSeed = serverSeed.trim();
    const trimmedClientSeed = clientSeed.trim();
    const parsedNonce = Number(nonce);

    if (
      !trimmedServerSeed ||
      !trimmedClientSeed ||
      !Number.isInteger(parsedNonce) ||
      parsedNonce < 0
    ) {
      setFormError(t('invalidInputs'));
      return;
    }

    const hashStatus = resolveHashStatus(trimmedServerSeed, serverSeedHash);

    try {
      if (gameId === MINES_GAME_ID) {
        const parsedMineCount = Number(mineCount);
        if (
          !Number.isInteger(parsedMineCount) ||
          parsedMineCount < MIN_MINE_COUNT ||
          parsedMineCount > MAX_MINE_COUNT
        ) {
          setFormError(t('invalidMineCount'));
          return;
        }

        setResult({
          kind: 'mines',
          mineLayout: generateMineLayout(
            trimmedServerSeed,
            trimmedClientSeed,
            parsedNonce,
            parsedMineCount,
          ),
          hashStatus,
        });
        return;
      }

      if (gameId === LIMBO_GAME_ID) {
        const rtp = selectedGame?.rtp;
        if (typeof rtp !== 'number' || !Number.isFinite(rtp)) {
          setFormError(t('verifyError'));
          return;
        }

        setResult({
          kind: 'limbo',
          rolledMultiplier: rollLimbo(
            trimmedServerSeed,
            trimmedClientSeed,
            parsedNonce,
            rtp,
          ),
          hashStatus,
        });
        return;
      }

      if (gameId === PLINKO_GAME_ID) {
        const parsedRows = Number(plinkoRows);
        if (
          !Number.isInteger(parsedRows) ||
          parsedRows < MIN_PLINKO_ROWS ||
          parsedRows > MAX_PLINKO_ROWS
        ) {
          setFormError(t('invalidPlinkoRows'));
          return;
        }

        const roll = rollPlinko(
          trimmedServerSeed,
          trimmedClientSeed,
          parsedNonce,
          parsedRows,
        );

        setResult({
          kind: 'plinko',
          path: roll.path,
          bucketIndex: roll.bucketIndex,
          hashStatus,
        });
        return;
      }

      if (gameId === KENO_GAME_ID) {
        setResult({
          kind: 'keno',
          drawnNumbers: drawKenoNumbers(
            trimmedServerSeed,
            trimmedClientSeed,
            parsedNonce,
          ),
          hashStatus,
        });
        return;
      }

      setResult({
        kind: 'dice',
        rolledValue: rollDice(
          trimmedServerSeed,
          trimmedClientSeed,
          parsedNonce,
        ),
        hashStatus,
      });
    } catch {
      setFormError(t('verifyError'));
    }
  };

  if (!selectedGame) {
    return (
      <Flex className="verification-tool" p="4" align="center" justify="center">
        <Text color="gray">{t('noGames')}</Text>
      </Flex>
    );
  }

  const hashBadge = result ? HASH_BADGE[result.hashStatus] : null;
  const gameName = getAvailableGame(gameId)?.name ?? gameId;
  const sanitizedHelpHtml = DOMPurify.sanitize(helpHtml);

  return (
    <Flex className="verification-tool" direction="column" gap="4" p="4">
      <Flex align="center" justify="between" gap="3" wrap="wrap">
        <Flex align="center" gap="3">
          {settings.logo ? (
            <img
              className="verification-tool__logo"
              src={settings.logo}
              alt=""
            />
          ) : null}
          <Heading size="5">{t('appTitle')}</Heading>
        </Flex>
        {settings.themeSwitcherEnabled ? (
          <IconButton
            type="button"
            size="2"
            variant="soft"
            color="gray"
            aria-label={t('toggleAppearance')}
            onClick={onToggleAppearance}
          >
            {appearance === 'dark' ? (
              <SunIcon size={16} />
            ) : (
              <MoonIcon size={16} />
            )}
          </IconButton>
        ) : null}
      </Flex>

      {hasSettingsError ? (
        <Callout.Root color="amber" size="1">
          <Callout.Text>{t('settingsError')}</Callout.Text>
        </Callout.Root>
      ) : null}

      <Text size="2" color="gray">
        {t('sharedIntro')}
      </Text>

      <Flex direction="column" gap="2" width="100%" maxWidth="280px">
        <Text size="2" weight="medium">
          {t('selectGame')}
        </Text>
        <Select.Root
          value={gameId}
          onValueChange={(value) => {
            setGameId(value);
            setResult(null);
            setFormError(null);
          }}
        >
          <Select.Trigger />
          <Select.Content>
            {settings.games.map((game) => (
              <Select.Item key={game.id} value={game.id}>
                {getAvailableGame(game.id)?.name ?? game.id}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>

      <Grid columns={{ initial: '1', md: '2' }} gap="4" width="100%">
        <Flex
          className="verification-tool__panel"
          direction="column"
          gap="3"
          p="4"
        >
          <Heading size="4">{t('verifyHeading')}</Heading>
          <LabeledField label={t('serverSeed')}>
            <TextField.Root
              value={serverSeed}
              onChange={(event) => setServerSeed(event.target.value)}
              autoComplete="off"
            />
          </LabeledField>
          <LabeledField label={t('serverSeedHash')}>
            <TextField.Root
              value={serverSeedHash}
              onChange={(event) => setServerSeedHash(event.target.value)}
              autoComplete="off"
            />
          </LabeledField>
          <LabeledField label={t('clientSeed')}>
            <TextField.Root
              value={clientSeed}
              onChange={(event) => setClientSeed(event.target.value)}
              autoComplete="off"
            />
          </LabeledField>
          <LabeledField label={t('nonce')}>
            <TextField.Root
              type="number"
              min={0}
              step={1}
              value={nonce}
              onChange={(event) => setNonce(event.target.value)}
            />
          </LabeledField>
          {gameId === MINES_GAME_ID ? (
            <LabeledField label={t('mineCount')}>
              <Select.Root value={mineCount} onValueChange={setMineCount}>
                <Select.Trigger />
                <Select.Content position="popper">
                  {MINE_COUNT_OPTIONS.map((count) => (
                    <Select.Item key={count} value={String(count)}>
                      {count}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </LabeledField>
          ) : null}
          {gameId === PLINKO_GAME_ID ? (
            <LabeledField label={t('plinkoRows')}>
              <Select.Root value={plinkoRows} onValueChange={setPlinkoRows}>
                <Select.Trigger />
                <Select.Content position="popper">
                  {PLINKO_ROW_OPTIONS.map((rows) => (
                    <Select.Item key={rows} value={String(rows)}>
                      {rows}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </LabeledField>
          ) : null}
          {formError ? (
            <Callout.Root color="red" size="1">
              <Callout.Text>{formError}</Callout.Text>
            </Callout.Root>
          ) : null}
          <Flex align="stretch">
            <Button size="3" onClick={handleVerify}>
              {t('verify')}
            </Button>
          </Flex>
          {result && hashBadge ? (
            <Flex direction="column" gap="2">
              <Heading size="3">{t('resultHeading')}</Heading>
              <Badge color={hashBadge.color}>{t(hashBadge.key)}</Badge>
              {result.kind === 'dice' ? (
                <DiceVerifyResult
                  label={t('diceRoll')}
                  rolledValue={result.rolledValue}
                />
              ) : null}
              {result.kind === 'limbo' ? (
                <LimboVerifyResult
                  label={t('limboCrash')}
                  rolledMultiplier={result.rolledMultiplier}
                />
              ) : null}
              {result.kind === 'mines' ? (
                <MinesVerifyResult
                  label={t('mineLayout')}
                  mineLayout={result.mineLayout}
                />
              ) : null}
              {result.kind === 'plinko' ? (
                <PlinkoVerifyResult
                  pathLabel={t('plinkoPath')}
                  bucketLabel={t('plinkoBucket')}
                  path={result.path}
                  bucketIndex={result.bucketIndex}
                />
              ) : null}
              {result.kind === 'keno' ? (
                <KenoVerifyResult
                  label={t('kenoDrawnNumbers')}
                  drawnNumbers={result.drawnNumbers}
                />
              ) : null}
            </Flex>
          ) : null}
        </Flex>

        <Flex
          className="verification-tool__panel"
          direction="column"
          gap="3"
          p="4"
        >
          <Heading size="4">{gameName}</Heading>
          {helpLoading ? (
            <Flex align="center" justify="center" py="4">
              <Spinner size="2" />
            </Flex>
          ) : null}
          {helpError ? (
            <Callout.Root color="amber" size="1">
              <Callout.Text>{t('contentError')}</Callout.Text>
            </Callout.Root>
          ) : null}
          {!helpLoading && sanitizedHelpHtml ? (
            <div
              className="verification-tool__help-html"
              dangerouslySetInnerHTML={{ __html: sanitizedHelpHtml }}
            />
          ) : null}
        </Flex>
      </Grid>
    </Flex>
  );
};
