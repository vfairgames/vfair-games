import type {
  ActiveRoundsState,
  FairnessState,
  NextSeedPair,
  RotateFairnessRequest,
} from '@vfair/game-contracts';
import {
  WS_SESSION_GET_ACTIVE_ROUNDS,
  WS_SESSION_GET_FAIRNESS,
  WS_SESSION_GET_NEXT_SEED_PAIR,
  WS_SESSION_ROTATE_FAIRNESS,
} from '@vfair/game-contracts';
import {
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
} from '@vfair/game-math';
import { socketService } from './socket.service';
import { useFairnessStore } from '../store/fairness-store/fairness-store';
import {
  useMainStore,
  type ConnectionState,
} from '../store/main-store/main-store';

const DEMO_MOCK_SERVER_SEED =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const createMockFairnessState = (): FairnessState => ({
  serverSeedHash: hashServerSeed(DEMO_MOCK_SERVER_SEED),
  clientSeed: generateClientSeed(),
  nonce: 0,
});

class FairnessService {
  private demoServerSeed = DEMO_MOCK_SERVER_SEED;
  private pendingServerSeed: string | null = null;

  constructor() {
    socketService.on('connectionState', (state) => {
      this.handleConnectionState(state);
    });
  }

  getDemoServerSeed(): string {
    return this.demoServerSeed;
  }

  handleConnectionState(connectionState: ConnectionState): void {
    if (connectionState === 'connected') {
      void this.syncFairnessState();
      return;
    }

    if (connectionState === 'disconnected' || connectionState === 'error') {
      this.reset();
    }
  }

  async syncFairnessState(): Promise<void> {
    try {
      const fairness = await this.fetchFairnessState();
      useFairnessStore.getState().setFairnessState(fairness);
    } catch {
      this.reset();
    }
  }

  async syncNextSeedPair(): Promise<void> {
    if (this.isDemoMode()) {
      useFairnessStore
        .getState()
        .setNextSeedPair(this.createDemoNextSeedPair());
      return;
    }

    const nextSeedPair = await socketService.emit<NextSeedPair>(
      WS_SESSION_GET_NEXT_SEED_PAIR,
    );
    useFairnessStore.getState().setNextSeedPair(nextSeedPair);
  }

  async syncActiveRounds(): Promise<void> {
    if (this.isDemoMode()) {
      useFairnessStore.getState().setActiveRounds([]);
      return;
    }

    const activeRounds = await socketService.emit<ActiveRoundsState>(
      WS_SESSION_GET_ACTIVE_ROUNDS,
    );
    useFairnessStore.getState().setActiveRounds(activeRounds.games);
  }

  reset(): void {
    useFairnessStore.getState().reset();
  }

  async applySeedPair(clientSeed: string): Promise<void> {
    if (this.isDemoMode()) {
      this.applyDemoSeedPair(clientSeed);
      return;
    }

    const request: RotateFairnessRequest = { clientSeed };
    const fairness = await socketService.emit<
      FairnessState,
      RotateFairnessRequest
    >(WS_SESSION_ROTATE_FAIRNESS, request);
    useFairnessStore.getState().setFairnessState(fairness);
  }

  private isDemoMode(): boolean {
    return useMainStore.getState().isDemo;
  }

  private async fetchFairnessState(): Promise<FairnessState> {
    if (this.isDemoMode()) {
      this.initDemo();
      return createMockFairnessState();
    }

    return socketService.emit<FairnessState>(WS_SESSION_GET_FAIRNESS);
  }

  private initDemo(): void {
    this.demoServerSeed = DEMO_MOCK_SERVER_SEED;
    this.pendingServerSeed = null;
  }

  private createDemoNextSeedPair(): NextSeedPair {
    const { nextServerSeedHash } = this.prepareNextSeedPair();

    return {
      newClientSeed: generateClientSeed(),
      nextServerSeedHash,
    };
  }

  private prepareNextSeedPair(): { nextServerSeedHash: string } {
    const nextServerSeed = generateServerSeed();
    this.pendingServerSeed = nextServerSeed;

    return {
      nextServerSeedHash: hashServerSeed(nextServerSeed),
    };
  }

  private applyDemoSeedPair(clientSeed: string): void {
    const nextServerSeed = this.pendingServerSeed ?? generateServerSeed();
    this.demoServerSeed = nextServerSeed;
    this.pendingServerSeed = null;

    useFairnessStore.getState().setFairnessState({
      clientSeed,
      serverSeedHash: hashServerSeed(nextServerSeed),
      nonce: 0,
    });
  }
}

export const fairnessService = new FairnessService();
