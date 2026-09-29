import {
  DICE_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
  KENO_GAME_ID,
} from '../libs/game-contracts/src/games';
import type { PrismaClient } from '../generated/prisma/client';

const FIELDS_EN = `<h3>Verification fields</h3><p><strong>Server seed</strong><br />64-character hex seed from the server. Shown after seed rotation so you can check past rounds.</p><p><strong>Client seed</strong><br />Your seed for the round. Used with the server seed and nonce to make the outcome.</p><p><strong>Nonce</strong><br />Bet number for the current seed pair. Each bet uses the next nonce.</p><p><strong>Server seed hash (optional)</strong><br />SHA-256 of the server seed before it was revealed. Paste to confirm the seed, or leave empty.</p>`;

const FIELDS_HY = `<h3>Ստուգման դաշտեր</h3><p><strong>Սերվերի seed</strong><br />Սերվերի 64 նիշանոց hex seed-ը։ Ցուցադրվում է seed-երը փոխելուց հետո՝ անցյալ րաունդները ստուգելու համար։</p><p><strong>Հաճախորդի seed</strong><br />Ձեր րաունդի seed-ը։ Սերվերի seed-ի և nonce-ի հետ որոշում է արդյունքը։</p><p><strong>Nonce</strong><br />Ընթացիկ seed զույգի խաղադրույքի համարը։ Յուրաքանչյուր խաղադրույք վերցնում է հաջորդ nonce-ը։</p><p><strong>Սերվերի seed-ի հեշ (ըստ ցանկության)</strong><br />Սերվերի seed-ի SHA-256-ը բացահայտումից առաջ։ Տեղադրեք՝ seed-ը հաստատելու համար, կամ թողեք դատարկ։</p>`;

const FIELDS_RU = `<h3>Поля проверки</h3><p><strong>Серверный seed</strong><br />64-символьный hex-seed сервера. Показывается после смены seed, чтобы проверить прошлые раунды.</p><p><strong>Клиентский seed</strong><br />Ваш seed раунда. Вместе с серверным seed и nonce задаёт результат.</p><p><strong>Nonce</strong><br />Номер ставки для текущей пары seed. Каждая ставка берёт следующий nonce.</p><p><strong>Хэш серверного seed (необязательно)</strong><br />SHA-256 серверного seed до раскрытия. Вставьте, чтобы подтвердить seed, или оставьте пустым.</p>`;

const MINES_FIELD_EN = `<p><strong>Mine count</strong><br />How many mines were on the 5×5 board for that round (1–24).</p>`;
const MINES_FIELD_HY = `<p><strong>Ականների քանակ</strong><br />Այն րաունդում 5×5 տախտակի ականների քանակը (1–24)։</p>`;
const MINES_FIELD_RU = `<p><strong>Число мин</strong><br />Сколько мин было на поле 5×5 в этом раунде (1–24).</p>`;

const PLINKO_FIELD_EN = `<p><strong>Rows</strong><br />Pin rows for that drop (8–16). More rows mean more buckets and a wider multiplier spread.</p>`;
const PLINKO_FIELD_HY = `<p><strong>Տողեր</strong><br />Այն նետման պիների տողերի քանակը (8–16)։ Ավելի շատ տողեր՝ ավելի շատ զամբյուղներ և ավելի լայն բազմապատիկներ։</p>`;
const PLINKO_FIELD_RU = `<p><strong>Ряды</strong><br />Число рядов пинов для этого дропа (8–16). Больше рядов — больше карманов и шире разброс множителей.</p>`;

const DICE_HOW_EN = `<h3>How to play</h3><p>Set a bet and a slider target. Roll Under wins if the roll is below the target; Roll Over wins if it is at or above.</p><p>The game rolls 0.00–99.99. Harder targets pay more. Auto-bet can repeat the same setup.</p>`;
const LIMBO_HOW_EN = `<h3>How to play</h3><p>Set a bet and a target multiplier (or win chance — they stay linked).</p><p>You win if the crash multiplier is at least your target. Higher targets pay more but win less often.</p>`;
const MINES_HOW_EN = `<h3>How to play</h3><p>Set a bet and mine count on a 5×5 board (1–24). Reveal tiles for gems; a mine ends the round.</p><p>Cash out after at least one gem to take the current payout.</p>`;
const PLINKO_HOW_EN = `<h3>How to play</h3><p>Set a bet, risk level (Easy–Expert), and rows (8–16). Drop a ball through the pin pyramid into a multiplier bucket.</p><p>Edges pay more on higher risk; the centre pays less. Every drop is provably fair from your seeds and nonce.</p>`;

const DICE_HOW_HY = `<h3>Ինչպես խաղալ</h3><p>Ընտրեք խաղադրույք և սահիկի նպատակ։ Roll Under՝ նետումը նպատակից ցածր՝ Roll Over՝ մեծ կամ հավասար։</p><p>Խաղը նետում է 0.00–99.99։ Ավելի դժվար նպատակը ավելի շատ է վճարում։</p>`;
const LIMBO_HOW_HY = `<h3>Ինչպես խաղալ</h3><p>Ընտրեք խաղադրույք և նպատակային բազմապատիկ (կամ հաղթանականություն)։</p><p>Հաղթում էք, եթե crash-ը առնվազն ձեր նպատակն է։ Ավելի բարձր նպատակը ավելի շատ է վճարում, բայց ավելի հազվադեպ։</p>`;
const MINES_HOW_HY = `<h3>Ինչպես խաղալ</h3><p>Ընտրեք խաղադրույք և ականների քանակ 5×5 տախտակի վրա (1–24)։ Բացեք վանդակներ գոհարների համար՝ ականը ավարտում է րաունդը։</p><p>Առնվազն մեկ գոհարից հետո կարող էք վերցնել ընթացիկ վճարումը։</p>`;
const PLINKO_HOW_HY = `<h3>Ինչպես խաղալ</h3><p>Ընտրեք խաղադրույք, ռիսկ (Easy–Expert) և տողեր (8–16)։ Գնդակը գցեք պիների բուրգի միջով բազմապատիկ զամբյուղ։</p><p>Եզրերը ավելի շատ են վճարում բարձր ռիսկում։ Յուրաքանչյուր նետումը ստուգելի է seed-երով։</p>`;

const DICE_HOW_RU = `<h3>Как играть</h3><p>Выберите ставку и цель на слайдере. Roll Under — выигрыш ниже цели; Roll Over — больше или равно.</p><p>Игра выдаёт 0.00–99.99. Более сложная цель платит больше. Авто-ставка повторяет ту же настройку.</p>`;
const LIMBO_HOW_RU = `<h3>Как играть</h3><p>Выберите ставку и целевой множитель (или шанс — они связаны).</p><p>Выигрыш, если краш не ниже цели. Более высокая цель платит больше, но реже выигрывает.</p>`;
const MINES_HOW_RU = `<h3>Как играть</h3><p>Выберите ставку и число мин на поле 5×5 (1–24). Открывайте клетки ради самоцветов; мина завершает раунд.</p><p>После хотя бы одного самоцвета можно забрать текущую выплату.</p>`;
const PLINKO_HOW_RU = `<h3>Как играть</h3><p>Выберите ставку, риск (Easy–Expert) и ряды (8–16). Бросьте шар через пирамиду пинов в карман с множителем.</p><p>Края платят больше на высоком риске. Каждый дроп проверяется по seed и nonce.</p>`;

const KENO_HOW_EN = `<h3>How to play</h3><p>Pick 1–10 numbers on the 1–40 grid. Choose a risk level and place a bet.</p><p>Ten numbers are drawn. Payout depends on how many of your picks match. Higher risk wins less often but pays more. Every draw can be checked with your seeds and nonce.</p>`;
const KENO_HOW_HY = `<h3>Ինչպես խաղալ</h3><p>Ընտրեք 1–10 թիվ 1–40 ցանցում։ Ընտրեք ռիսկ և դրեք խաղադրույք։</p><p>Խաղարկվում է 10 թիվ։ Վճարումը կախված է համընկնումների քանակից։ Բարձր ռիսկը ավելի հազվադեպ է հաղթում, բայց ավելի շատ է վճարում։ Յուրաքանչյուր խաղարկում կարելի է ստուգել seed-երով և nonce-ով։</p>`;
const KENO_HOW_RU = `<h3>Как играть</h3><p>Выберите 1–10 чисел на сетке 1–40. Выберите риск и сделайте ставку.</p><p>Выпадает 10 чисел. Выплата зависит от числа совпадений. Более высокий риск выигрывает реже, но платит больше. Каждый розыгрыш можно проверить по seed и nonce.</p>`;

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
  { gameId: DICE_GAME_ID, lang: 'hy', html: `${DICE_HOW_HY}${FIELDS_HY}` },
  { gameId: LIMBO_GAME_ID, lang: 'hy', html: `${LIMBO_HOW_HY}${FIELDS_HY}` },
  {
    gameId: MINES_GAME_ID,
    lang: 'hy',
    html: `${MINES_HOW_HY}${FIELDS_HY}${MINES_FIELD_HY}`,
  },
  {
    gameId: PLINKO_GAME_ID,
    lang: 'hy',
    html: `${PLINKO_HOW_HY}${FIELDS_HY}${PLINKO_FIELD_HY}`,
  },
  { gameId: KENO_GAME_ID, lang: 'hy', html: `${KENO_HOW_HY}${FIELDS_HY}` },
  { gameId: DICE_GAME_ID, lang: 'ru', html: `${DICE_HOW_RU}${FIELDS_RU}` },
  { gameId: LIMBO_GAME_ID, lang: 'ru', html: `${LIMBO_HOW_RU}${FIELDS_RU}` },
  {
    gameId: MINES_GAME_ID,
    lang: 'ru',
    html: `${MINES_HOW_RU}${FIELDS_RU}${MINES_FIELD_RU}`,
  },
  {
    gameId: PLINKO_GAME_ID,
    lang: 'ru',
    html: `${PLINKO_HOW_RU}${FIELDS_RU}${PLINKO_FIELD_RU}`,
  },
  { gameId: KENO_GAME_ID, lang: 'ru', html: `${KENO_HOW_RU}${FIELDS_RU}` },
] as const;

export const seedGameVerificationContent = async (
  prisma: PrismaClient,
  partnerId: number,
): Promise<void> => {
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
