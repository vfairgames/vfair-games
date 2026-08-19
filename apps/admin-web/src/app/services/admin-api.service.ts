import type { BetFailureStage } from '@vfair/game-contracts';
import { type PartnerThemeConfig } from '@vfair/radix-palette';
import type { AuthUser } from '../auth/auth-types';
import { API_BASE, apiClient } from './api-client';

type ApiErrorBody = {
  message?: string | string[];
};

const parseErrorMessage = (body: ApiErrorBody): string => {
  if (Array.isArray(body.message)) {
    return body.message.join(', ');
  }
  return body.message ?? 'Request failed';
};

export type SessionVerifyResult =
  | { status: 'ok'; user: AuthUser }
  | { status: 'invalid' }
  | { status: 'network' };

export const verifySessionWithApi = async (
  token: string,
): Promise<SessionVerifyResult> => {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401 || response.status === 403) {
      return { status: 'invalid' };
    }

    if (!response.ok) {
      return { status: 'network' };
    }

    const user = (await response.json()) as AuthUser;
    return { status: 'ok', user };
  } catch {
    return { status: 'network' };
  }
};

export const signInRequest = async (
  email: string,
  password: string,
): Promise<{ accessToken: string } | { error: string }> => {
  try {
    const response = await fetch(`${API_BASE}/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
      return { error: parseErrorMessage(body) };
    }

    const { accessToken } = (await response.json()) as { accessToken: string };

    if (!accessToken) {
      return { error: 'Received an invalid token. Please try again.' };
    }

    return { accessToken };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
};

export type UpdateProfilePayload = {
  email?: string;
  currentPassword?: string;
  password?: string;
};

export type UpdateProfileResult = {
  accessToken: string;
} & AuthUser;

export const updateProfile = (
  payload: UpdateProfilePayload,
): Promise<UpdateProfileResult> =>
  apiClient.patch('auth/me', { json: payload }).json<UpdateProfileResult>();

export type Partner = {
  id: number;
  name: string;
  code: string;
  lobbyUrl: string | null;
  webhookUrl: string | null;
  secret: string;
  ipWhitelist: string;
  createdAt: string;
  updatedAt: string;
  usersCount?: number;
};

export type PartnerListResult = {
  data: Partner[];
  total: number;
};

export const fetchPartner = (id: number): Promise<Partner> =>
  apiClient.get(`partners/${id}`).json<Partner>();

export const fetchPartners = (params: {
  page: number;
  limit: number;
  name?: string;
}): Promise<PartnerListResult> => {
  const searchParams: Record<string, string> = {
    page: String(params.page),
    limit: String(params.limit),
  };
  if (params.name) {
    searchParams['name'] = params.name;
  }
  return apiClient.get('partners', { searchParams }).json<PartnerListResult>();
};

export const createPartner = (name: string): Promise<Partner> =>
  apiClient.post('partners', { json: { name } }).json<Partner>();

type UpdatePartnerPayload = {
  name: string;
  lobbyUrl?: string | null;
  webhookUrl?: string | null;
  ipWhitelist?: string;
};

export const updatePartner = (
  id: number,
  payload: UpdatePartnerPayload,
): Promise<Partner> =>
  apiClient.patch(`partners/${id}`, { json: payload }).json<Partner>();

export const regeneratePartnerSecret = (id: number): Promise<Partner> =>
  apiClient.post(`partners/${id}/regenerate-secret`).json<Partner>();

export const deletePartner = (id: number): Promise<void> =>
  apiClient.delete(`partners/${id}`).then(() => undefined);

export type PartnerCurrency = {
  id: number;
  partnerId: number;
  code: string;
  minBet: number;
  maxBet: number;
  maxWin: number;
  decimals: number;
  createdAt: string;
  updatedAt: string;
};

export type CreatePartnerCurrencyPayload = {
  code: string;
  minBet: number;
  maxBet: number;
  maxWin: number;
  decimals: number;
};

export type UpdatePartnerCurrencyPayload = {
  minBet?: number;
  maxBet?: number;
  maxWin?: number;
  decimals?: number;
};

export const fetchPartnerCurrencies = (
  partnerId: number,
): Promise<PartnerCurrency[]> =>
  apiClient.get(`partners/${partnerId}/currencies`).json<PartnerCurrency[]>();

export const createPartnerCurrency = (
  partnerId: number,
  payload: CreatePartnerCurrencyPayload,
): Promise<PartnerCurrency> =>
  apiClient
    .post(`partners/${partnerId}/currencies`, { json: payload })
    .json<PartnerCurrency>();

export const updatePartnerCurrency = (
  partnerId: number,
  currencyId: number,
  payload: UpdatePartnerCurrencyPayload,
): Promise<PartnerCurrency> =>
  apiClient
    .patch(`partners/${partnerId}/currencies/${currencyId}`, { json: payload })
    .json<PartnerCurrency>();

export const deletePartnerCurrency = (
  partnerId: number,
  currencyId: number,
): Promise<void> =>
  apiClient
    .delete(`partners/${partnerId}/currencies/${currencyId}`)
    .then(() => undefined);

export type PartnerGame = {
  gameId: string;
  name: string;
  enabled: boolean;
};

export type PartnerGameConfig = {
  gameId: string;
  name: string;
  enabled: boolean;
  rtp: number;
};

export type UpdatePartnerGamePayload = {
  enabled?: boolean;
  rtp?: number | null;
};

export const fetchPartnerGames = (partnerId: number): Promise<PartnerGame[]> =>
  apiClient.get(`partners/${partnerId}/games`).json<PartnerGame[]>();

export const fetchPartnerGameConfig = (
  partnerId: number,
  gameId: string,
): Promise<PartnerGameConfig> =>
  apiClient
    .get(`partners/${partnerId}/games/${gameId}`)
    .json<PartnerGameConfig>();

export const updatePartnerGame = (
  partnerId: number,
  gameId: string,
  payload: UpdatePartnerGamePayload,
): Promise<PartnerGameConfig> =>
  apiClient
    .patch(`partners/${partnerId}/games/${gameId}`, { json: payload })
    .json<PartnerGameConfig>();

export type GameHelpContentItem = {
  lang: string;
  html: string;
  updatedAt: string;
};

export const fetchGameHelpContent = (
  partnerId: number,
  gameId: string,
): Promise<GameHelpContentItem[]> =>
  apiClient
    .get(`partners/${partnerId}/games/${gameId}/help-content`)
    .json<GameHelpContentItem[]>();

export const upsertGameHelpContent = (
  partnerId: number,
  gameId: string,
  lang: string,
  html: string,
): Promise<GameHelpContentItem> =>
  apiClient
    .put(`partners/${partnerId}/games/${gameId}/help-content/${lang}`, {
      json: { html },
    })
    .json<GameHelpContentItem>();

export const fetchPartnerTheme = (
  partnerId: number,
): Promise<PartnerThemeConfig> =>
  apiClient.get(`partners/${partnerId}/theme`).json<PartnerThemeConfig>();

export const updatePartnerTheme = (
  partnerId: number,
  payload: Omit<
    PartnerThemeConfig,
    'theme' | 'logo' | 'lightAccentColor' | 'darkAccentColor'
  >,
): Promise<PartnerThemeConfig> =>
  apiClient
    .put(`partners/${partnerId}/theme`, { json: payload })
    .json<PartnerThemeConfig>();

export const uploadPartnerLogo = (
  partnerId: number,
  file: File,
): Promise<{ logo: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient
    .post(`partners/${partnerId}/theme/logo`, { body: formData })
    .json<{ logo: string }>();
};

export const removePartnerLogo = async (partnerId: number): Promise<void> => {
  await apiClient.delete(`partners/${partnerId}/theme/logo`);
};

export type UserRole = {
  id: number;
  name: string;
};

export type User = {
  id: number;
  email: string;
  role: { id: number; name: string };
  partner: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
  lastAccessAt: string | null;
};

export type UserListResult = {
  data: User[];
  total: number;
};

export type UserSignIn = {
  id: number;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
};

export type UserSignInListResult = {
  data: UserSignIn[];
  total: number;
};

export type CreateUserPayload = {
  email: string;
  password: string;
  roleId: number;
  partnerId?: number;
};

export type UpdateUserPayload = {
  email?: string;
  password?: string;
  roleId?: number;
  partnerId?: number | null;
};

export const fetchUserRoles = (): Promise<UserRole[]> =>
  apiClient.get('users/roles').json<UserRole[]>();

export const fetchUsers = (params: {
  page: number;
  limit: number;
  email?: string;
  partnerId?: number;
  roleId?: number;
}): Promise<UserListResult> => {
  const searchParams: Record<string, string> = {
    page: String(params.page),
    limit: String(params.limit),
  };
  if (params.email) {
    searchParams['email'] = params.email;
  }
  if (params.partnerId) {
    searchParams['partnerId'] = String(params.partnerId);
  }
  if (params.roleId) {
    searchParams['roleId'] = String(params.roleId);
  }
  return apiClient.get('users', { searchParams }).json<UserListResult>();
};

export const fetchUser = (id: number): Promise<User> =>
  apiClient.get(`users/${id}`).json<User>();

export const fetchUserSignIns = (
  id: number,
  params: { page: number; limit: number },
): Promise<UserSignInListResult> => {
  const searchParams: Record<string, string> = {
    page: String(params.page),
    limit: String(params.limit),
  };
  return apiClient
    .get(`users/${id}/sign-ins`, { searchParams })
    .json<UserSignInListResult>();
};

export const createUser = (payload: CreateUserPayload): Promise<User> =>
  apiClient.post('users', { json: payload }).json<User>();

export const updateUser = (
  id: number,
  payload: UpdateUserPayload,
): Promise<User> =>
  apiClient.patch(`users/${id}`, { json: payload }).json<User>();

export const deleteUser = (id: number): Promise<void> =>
  apiClient.delete(`users/${id}`).then(() => undefined);

export type AdminPlayerListItem = {
  id: number;
  externalId: string;
  partner: { id: number; name: string };
  createdAt: string;
};

export type AdminPlayer = {
  id: number;
  externalId: string;
  partner: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
};

export type AdminPlayerListResult = {
  data: AdminPlayerListItem[];
  total: number;
};

export type AdminPlayerCurrencyOption = {
  code: string;
  decimals: number;
};

export type AdminPlayerRoundListItem = {
  id: string;
  betAmount: number;
  winAmount: number;
  status: 'won' | 'lost' | 'active' | 'failed';
  gameId: string;
  gameName: string;
  multiplier: number | null;
  currency: { code: string; decimals: number };
  createdAt: string;
};

export type AdminPlayerRoundListResult = {
  data: AdminPlayerRoundListItem[];
  hasMore: boolean;
};

export type AdminPlayerRoundDetail = {
  id: string;
  gameId: string;
  status: 'won' | 'lost' | 'active' | 'failed';
  betAmount: number;
  cashOut: number;
  balance: number;
  currency: { code: string; decimals: number };
  createdAt: number;
  fairness: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    serverSeed: string | null;
  };
  gameData: Record<string, unknown>;
  outcome: unknown;
  requestId: string;
  settledAt: string | null;
  rtp: number;
};

export type AdminPlayerKpiSummary = {
  totalWagered: number;
  totalWon: number;
  ggr: number;
  totalBets: number;
  avgBet: number | null;
  playerRtp: number | null;
};

export type AdminPlayerKpiDaily = {
  date: string;
  totalWagered: number;
  totalWon: number;
  ggr: number;
  totalBets: number;
};

export type AdminPlayerKpiGame = {
  gameId: string;
  gameName: string;
  totalWagered: number;
  totalWon: number;
  ggr: number;
  totalBets: number;
  playerRtp: number | null;
};

export type AdminPlayerKpi = {
  currency: { code: string; decimals: number };
  summary: AdminPlayerKpiSummary;
  daily: AdminPlayerKpiDaily[];
  games: AdminPlayerKpiGame[];
};

export const fetchPlayers = (params: {
  page: number;
  limit: number;
  externalId?: string;
  partnerId?: number;
}): Promise<AdminPlayerListResult> => {
  const searchParams: Record<string, string> = {
    page: String(params.page),
    limit: String(params.limit),
  };
  if (params.externalId) {
    searchParams['externalId'] = params.externalId;
  }
  if (params.partnerId) {
    searchParams['partnerId'] = String(params.partnerId);
  }
  return apiClient
    .get('players', { searchParams })
    .json<AdminPlayerListResult>();
};

export const fetchPlayer = (id: number): Promise<AdminPlayer> =>
  apiClient.get(`players/${id}`).json<AdminPlayer>();

export const fetchPlayerCurrencies = (
  playerId: number,
): Promise<AdminPlayerCurrencyOption[]> =>
  apiClient
    .get(`players/${playerId}/currencies`)
    .json<AdminPlayerCurrencyOption[]>();

export const fetchPlayerRounds = (
  playerId: number,
  params: {
    page: number;
    limit: number;
    gameId?: string;
    currency?: string;
    status?: 'won' | 'lost' | 'active' | 'failed';
    dateFrom?: string;
    dateTo?: string;
    betAmountMin?: number;
    betAmountMax?: number;
    roundId?: string;
  },
): Promise<AdminPlayerRoundListResult> => {
  const searchParams: Record<string, string> = {
    page: String(params.page),
    limit: String(params.limit),
  };
  if (params.gameId) {
    searchParams['gameId'] = params.gameId;
  }
  if (params.currency) {
    searchParams['currency'] = params.currency;
  }
  if (params.status) {
    searchParams['status'] = params.status;
  }
  if (params.dateFrom) {
    searchParams['dateFrom'] = params.dateFrom;
  }
  if (params.dateTo) {
    searchParams['dateTo'] = params.dateTo;
  }
  if (params.betAmountMin !== undefined) {
    searchParams['betAmountMin'] = String(params.betAmountMin);
  }
  if (params.betAmountMax !== undefined) {
    searchParams['betAmountMax'] = String(params.betAmountMax);
  }
  if (params.roundId) {
    searchParams['roundId'] = params.roundId;
  }
  return apiClient
    .get(`players/${playerId}/rounds`, { searchParams })
    .json<AdminPlayerRoundListResult>();
};

export const fetchPlayerRound = (
  playerId: number,
  roundId: string,
): Promise<AdminPlayerRoundDetail> =>
  apiClient
    .get(`players/${playerId}/rounds/${roundId}`)
    .json<AdminPlayerRoundDetail>();

export type AdminPlayerWalletTxType = 'DEBIT' | 'CREDIT' | 'ROLLBACK';

export type AdminPlayerWalletTxStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'ROLLED_BACK';

export type AdminPlayerWalletTxListItem = {
  id: string;
  type: AdminPlayerWalletTxType;
  status: AdminPlayerWalletTxStatus;
  amount: number;
  balanceAfter: number | null;
  currency: { code: string; decimals: number };
  roundId: string | null;
  requestId: string;
  createdAt: string;
};

export type AdminPlayerWalletTxListResult = {
  data: AdminPlayerWalletTxListItem[];
  hasMore: boolean;
};

export const fetchPlayerTransactions = (
  playerId: number,
  params: {
    page: number;
    limit: number;
    type?: 'debit' | 'credit' | 'rollback';
    status?: 'pending' | 'confirmed' | 'failed' | 'rolled_back';
    currency?: string;
    dateFrom?: string;
    dateTo?: string;
    amountMin?: number;
    amountMax?: number;
    roundId?: string;
  },
): Promise<AdminPlayerWalletTxListResult> => {
  const searchParams: Record<string, string> = {
    page: String(params.page),
    limit: String(params.limit),
  };
  if (params.type) {
    searchParams['type'] = params.type;
  }
  if (params.status) {
    searchParams['status'] = params.status;
  }
  if (params.currency) {
    searchParams['currency'] = params.currency;
  }
  if (params.dateFrom) {
    searchParams['dateFrom'] = params.dateFrom;
  }
  if (params.dateTo) {
    searchParams['dateTo'] = params.dateTo;
  }
  if (params.amountMin !== undefined) {
    searchParams['amountMin'] = String(params.amountMin);
  }
  if (params.amountMax !== undefined) {
    searchParams['amountMax'] = String(params.amountMax);
  }
  if (params.roundId) {
    searchParams['roundId'] = params.roundId;
  }
  return apiClient
    .get(`players/${playerId}/transactions`, { searchParams })
    .json<AdminPlayerWalletTxListResult>();
};

export const fetchPlayerKpi = (
  playerId: number,
  params: {
    currency: string;
    dateFrom: string;
    dateTo: string;
  },
): Promise<AdminPlayerKpi> =>
  apiClient
    .get(`players/${playerId}/kpi`, {
      searchParams: {
        currency: params.currency,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
    })
    .json<AdminPlayerKpi>();

export type DashboardCurrencyOption = {
  code: string;
  decimals: number;
};

type DashboardMeta = {
  partner: { id: number; name: string };
  currencies: DashboardCurrencyOption[];
  playerCount: number;
  enabledGameCount: number;
};

export const fetchDashboardMeta = (params: {
  partnerId?: number;
}): Promise<DashboardMeta> => {
  const searchParams: Record<string, string> = {};
  if (params.partnerId) {
    searchParams['partnerId'] = String(params.partnerId);
  }
  return apiClient
    .get('dashboard/meta', { searchParams })
    .json<DashboardMeta>();
};

export const fetchDashboardKpi = (params: {
  partnerId?: number;
  currency: string;
  dateFrom: string;
  dateTo: string;
}): Promise<AdminPlayerKpi> => {
  const searchParams: Record<string, string> = {
    currency: params.currency,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };
  if (params.partnerId) {
    searchParams['partnerId'] = String(params.partnerId);
  }
  return apiClient
    .get('dashboard/kpi', { searchParams })
    .json<AdminPlayerKpi>();
};

export type AdminFailedRoundListItem = {
  id: string;
  player: { id: number; externalId: string };
  partner: { id: number; name: string };
  gameId: string;
  gameName: string;
  betAmount: number;
  currency: { code: string; decimals: number };
  failureStage: BetFailureStage | null;
  errCode: string | null;
  settledAt: string | null;
  solved: boolean;
};

export type AdminFailedRoundListResult = {
  data: AdminFailedRoundListItem[];
  hasMore: boolean;
};

export type AdminFailedRoundTransaction = {
  id: string;
  type: AdminPlayerWalletTxType;
  status: AdminPlayerWalletTxStatus;
  amount: number;
  balanceBefore: number | null;
  balanceAfter: number | null;
  currency: { code: string; decimals: number };
  partnerTransactionId: string | null;
  requestId: string;
  reversesTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminFailedRoundSolved = {
  note: string;
  solvedAt: string;
  solvedBy: { id: number; email: string };
};

export type AdminFailedRoundEvent = {
  id: number;
  action: 'SOLVED' | 'UNSOLVED';
  note: string;
  createdAt: string;
  createdBy: { id: number; email: string };
};

export type AdminFailedRoundDetail = {
  id: string;
  status: 'FAILED';
  player: { id: number; externalId: string };
  partner: { id: number; name: string };
  gameId: string;
  gameName: string;
  betAmount: number;
  winAmount: number | null;
  payoutMultiplier: number | null;
  balanceAfter: number | null;
  currency: { code: string; decimals: number };
  nonce: number;
  rtp: number;
  requestId: string;
  failureStage: BetFailureStage | null;
  errCode: string | null;
  outcome: unknown;
  gameData: Record<string, unknown>;
  fairness: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    serverSeed: string | null;
  };
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  solved: AdminFailedRoundSolved | null;
  events: AdminFailedRoundEvent[];
  transactions: AdminFailedRoundTransaction[];
};

export const fetchFailedRound = (id: string): Promise<AdminFailedRoundDetail> =>
  apiClient.get(`failed-rounds/${id}`).json<AdminFailedRoundDetail>();

export const markFailedRoundSolved = (
  id: string,
  note: string,
): Promise<AdminFailedRoundDetail> =>
  apiClient
    .post(`failed-rounds/${id}/solve`, { json: { note } })
    .json<AdminFailedRoundDetail>();

export const markFailedRoundUnsolved = (
  id: string,
  note: string,
): Promise<AdminFailedRoundDetail> =>
  apiClient
    .post(`failed-rounds/${id}/unsolve`, { json: { note } })
    .json<AdminFailedRoundDetail>();

export const fetchFailedRounds = (params: {
  page: number;
  limit: number;
  partnerId?: number;
  playerId?: number;
  externalId?: string;
  roundId?: string;
  requestId?: string;
  gameId?: string;
  failureStage?: BetFailureStage;
  solved?: boolean;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AdminFailedRoundListResult> => {
  const searchParams: Record<string, string> = {
    page: String(params.page),
    limit: String(params.limit),
  };
  if (params.partnerId) {
    searchParams['partnerId'] = String(params.partnerId);
  }
  if (params.playerId) {
    searchParams['playerId'] = String(params.playerId);
  }
  if (params.externalId) {
    searchParams['externalId'] = params.externalId;
  }
  if (params.roundId) {
    searchParams['roundId'] = params.roundId;
  }
  if (params.requestId) {
    searchParams['requestId'] = params.requestId;
  }
  if (params.gameId) {
    searchParams['gameId'] = params.gameId;
  }
  if (params.failureStage) {
    searchParams['failureStage'] = params.failureStage;
  }
  if (params.solved !== undefined) {
    searchParams['solved'] = String(params.solved);
  }
  if (params.dateFrom) {
    searchParams['dateFrom'] = params.dateFrom;
  }
  if (params.dateTo) {
    searchParams['dateTo'] = params.dateTo;
  }
  return apiClient
    .get('failed-rounds', { searchParams })
    .json<AdminFailedRoundListResult>();
};
