jest.mock('../partner-config/partner-config.service', () => ({
  PartnerConfigService: class PartnerConfigService {},
}));

import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PartnerConfigService } from '../partner-config/partner-config.service';
import { SessionTokenService } from './session-token.service';

const partnerSecret = 'test-partner-secret';

describe('SessionTokenService', () => {
  let service: SessionTokenService;
  let partnerConfig: Pick<PartnerConfigService, 'getPartnerSecret'>;

  beforeAll(async () => {
    partnerConfig = {
      getPartnerSecret: jest.fn().mockResolvedValue(partnerSecret),
    };

    const module = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        SessionTokenService,
        { provide: PartnerConfigService, useValue: partnerConfig },
      ],
    }).compile();

    service = module.get(SessionTokenService);
  });

  it('creates and verifies a session token with jti', async () => {
    const token = await service.createToken({
      playerId: 42,
      partnerId: 1,
      partnerCode: 'acme',
      gameId: 'v_dice',
      externalPlayerId: 'player-1',
    });

    expect(partnerConfig.getPartnerSecret).toHaveBeenCalledWith('acme');
    await expect(service.verifyToken(token)).resolves.toMatchObject({
      sub: '42',
      partnerId: 1,
      partnerCode: 'acme',
      gameId: 'v_dice',
      externalPlayerId: 'player-1',
      jti: expect.any(String),
    });
  });

  it('returns null from verifyForSocket for invalid tokens', async () => {
    await expect(service.verifyForSocket('not-a-token')).resolves.toBeNull();
  });
});
