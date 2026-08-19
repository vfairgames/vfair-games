export type PartnerJwtPayload = {
  sub: string;
  iat?: number;
  exp?: number;
};

export type AuthenticatedPartner = {
  partnerId: number;
  partnerCode: string;
  ipWhitelist: string;
};
