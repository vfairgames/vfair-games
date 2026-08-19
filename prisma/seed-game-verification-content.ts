import {
  DICE_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
  KENO_GAME_ID,
} from '../libs/game-contracts/src/games';
import type { PrismaClient } from '../generated/prisma/client';

const FIELDS_EN = `<h3>Verification fields</h3><p><strong>Server seed</strong><br />64-character hex seed from the server. Shown after seed rotation so you can check past rounds.</p><p><strong>Client seed</strong><br />Your seed for the round. Used with the server seed and nonce to make the outcome.</p><p><strong>Nonce</strong><br />Bet number for the current seed pair. Each bet uses the next nonce.</p><p><strong>Server seed hash (optional)</strong><br />SHA-256 of the server seed before it was revealed. Paste to confirm the seed, or leave empty.</p>`;

const MINES_FIELD_EN = `<p><strong>Mine count</strong><br />How many mines were on the 5×5 board for that round (1–24).</p>`;

const PLINKO_FIELD_EN = `<p><strong>Rows</strong><br />Pin rows for that drop (8–16). More rows mean more buckets and a wider multiplier spread.</p>`;

const DICE_HOW_EN = `<h3>How to play</h3><p>Set a bet and a slider target. Roll Under wins if the roll is below the target; Roll Over wins if it is at or above.</p><p>The game rolls 0.00–99.99. Harder targets pay more. Auto-bet can repeat the same setup.</p>`;
const LIMBO_HOW_EN = `<h3>How to play</h3><p>Set a bet and a target multiplier (or win chance — they stay linked).</p><p>You win if the crash multiplier is at least your target. Higher targets pay more but win less often.</p>`;
const MINES_HOW_EN = `<h3>How to play</h3><p>Set a bet and mine count on a 5×5 board (1–24). Reveal tiles for gems; a mine ends the round.</p><p>Cash out after at least one gem to take the current payout.</p>`;
const PLINKO_HOW_EN = `<h3>How to play</h3><p>Set a bet, risk level (Easy–Expert), and rows (8–16). Drop a ball through the pin pyramid into a multiplier bucket.</p><p>Edges pay more on higher risk; the centre pays less. Every drop is provably fair from your seeds and nonce.</p>`;
const KENO_HOW_EN = `<h3>How to play</h3><p>Pick 1–10 numbers on the 1–40 grid. Choose a risk level and place a bet.</p><p>Ten numbers are drawn. Payout depends on how many of your picks match. Higher risk wins less often but pays more. Every draw can be checked with your seeds and nonce.</p>`;

const CONTENT = [
  { gameId: DICE_GAME_ID, lang: 'en', html: `${DICE_HOW_EN}${FIELDS_EN}` },
  { gameId: LIMBO_GAME_ID, lang: 'en', html: `${LIMBO_HOW_EN}${FIELDS_EN}` },
  {
    gameId: MINES_GAME_ID,
    lang: 'en',
    html: `${MINES_HOW_EN}${FIELDS_EN}${MINES_FIELD_EN}`,
  },
  {
    gameId: PLINKO_GAME_ID,
    lang: 'en',
    html: `${PLINKO_HOW_EN}${FIELDS_EN}${PLINKO_FIELD_EN}`,
  },
  { gameId: KENO_GAME_ID, lang: 'en', html: `${KENO_HOW_EN}${FIELDS_EN}` },
] as const;

const SEEDED_LANGS = [...new Set(CONTENT.map((entry) => entry.lang))];

export const seedGameVerificationContent = async (
  prisma: PrismaClient,
  partnerId: number,
): Promise<void> => {
  await prisma.gameVerificationContent.deleteMany({
    where: { partnerId, lang: { notIn: [...SEEDED_LANGS] } },
  });

  for (const entry of CONTENT) {
    const existing = await prisma.gameVerificationContent.findUnique({
      where: {
        partnerId_gameId_lang: {
          partnerId,
          gameId: entry.gameId,
          lang: entry.lang,
        },
      },
      select: { id: true, html: true },
    });

    if (!existing) {
      await prisma.gameVerificationContent.create({
        data: {
          partnerId,
          gameId: entry.gameId,
          lang: entry.lang,
          html: entry.html,
        },
      });
      continue;
    }

    if (!existing.html.trim()) {
      await prisma.gameVerificationContent.update({
        where: { id: existing.id },
        data: { html: entry.html },
      });
    }
  }
};
