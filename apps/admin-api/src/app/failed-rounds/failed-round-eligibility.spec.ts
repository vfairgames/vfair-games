import { readErrCode, readFailureStage } from './failed-round-eligibility';

describe('failed-round-eligibility', () => {
  describe('readFailureStage', () => {
    it('reads debit settle and credit stages', () => {
      expect(readFailureStage({ failure_stage: 'debit' })).toBe('debit');
      expect(readFailureStage({ failure_stage: 'settle' })).toBe('settle');
      expect(readFailureStage({ failure_stage: 'credit' })).toBe('credit');
    });

    it('returns null for unknown values', () => {
      expect(readFailureStage({ failure_stage: 'other' })).toBeNull();
      expect(readFailureStage(null)).toBeNull();
      expect(readFailureStage('credit')).toBeNull();
    });
  });

  describe('readErrCode', () => {
    it('reads err_code when present', () => {
      expect(readErrCode({ err_code: 'bet_failed' })).toBe('bet_failed');
    });

    it('returns null when missing', () => {
      expect(readErrCode({})).toBeNull();
    });
  });
});
