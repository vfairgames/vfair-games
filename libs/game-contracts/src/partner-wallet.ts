export type PartnerWalletTxType = 'DEBIT' | 'CREDIT' | 'ROLLBACK';

export type PartnerWalletTransactionRequest = {
  type: PartnerWalletTxType;
  playerId: string;
  currency: string;
  amount: number;
  requestId: string;
  gameId: string;
  roundId?: string;
  reversesRequestId?: string;
};

export type PartnerWalletTransactionResponse = {
  partnerTransactionId: string;
  balance: number;
  balanceBefore?: number;
};

export type PartnerWalletBalanceResponse = {
  balance: number;
};
