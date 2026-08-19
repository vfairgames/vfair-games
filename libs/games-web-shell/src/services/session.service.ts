import type { GetBalanceRequest } from '@vfair/game-contracts';
import { WS_SESSION_GET_BALANCE } from '@vfair/game-contracts';
import { socketService } from './socket.service';
import { readSessionTokenFromSettings } from '../bootstrap/bootstrap';
import { translate } from '../i18n/i18n';
import { useMainStore, type Session } from '../store/main-store/main-store';

type SessionGetResponse = {
  playerId: string;
};

type SessionGetBalanceResponse = {
  balance: number;
};

const DEMO_BALANCE = 1000;

class SessionService {
  readToken(): string | null {
    return readSessionTokenFromSettings();
  }

  createDemoSession(): Session {
    return {
      playerId: null,
    };
  }

  applySession(session: Session): void {
    useMainStore.getState().initSession(session);
  }

  async fetchSession(): Promise<Session> {
    const response =
      await socketService.emit<SessionGetResponse>('session:get');

    return {
      playerId: response.playerId,
    };
  }

  async fetchBalance(): Promise<number> {
    if (useMainStore.getState().isDemo) {
      return DEMO_BALANCE;
    }

    const { currency } = useMainStore.getState();
    const request: GetBalanceRequest = { currency };
    const response = await socketService.emit<
      SessionGetBalanceResponse,
      GetBalanceRequest
    >(WS_SESSION_GET_BALANCE, request);

    return response.balance;
  }

  disconnect(): void {
    socketService.disconnect();
    useMainStore.getState().setIsDemo(false);
  }

  async initialize(): Promise<void> {
    const { status, setError, setBalance, setIsDemo } = useMainStore.getState();
    if (status !== 'idle') return;

    const token = this.readToken();
    const isDemo = !token;
    setIsDemo(isDemo);

    try {
      await socketService.connect(token);

      if (isDemo) {
        setBalance(await this.fetchBalance());
        this.applySession(this.createDemoSession());
        return;
      }

      const session = await this.fetchSession();
      setBalance(await this.fetchBalance());
      this.applySession(session);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : translate('errorSessionLoadFailed'),
      );
    }
  }
}

export const sessionService = new SessionService();
