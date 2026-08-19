import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeTranslations } from '../i18n/i18n';
import { useMainStore } from '../store/main-store/main-store';
import { socketService } from './socket.service';

type MockSocket = {
  connected: boolean;
  on: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  io: {
    on: ReturnType<typeof vi.fn>;
  };
};

let mockSocket: MockSocket;
const socketHandlers = new Map<string, Array<(...args: unknown[]) => void>>();
const managerHandlers = new Map<string, Array<(...args: unknown[]) => void>>();

const registerHandler = (
  store: Map<string, Array<(...args: unknown[]) => void>>,
  event: string,
  handler: (...args: unknown[]) => void,
) => {
  const handlers = store.get(event) ?? [];
  handlers.push(handler);
  store.set(event, handlers);
};

const createMockSocket = (): MockSocket => {
  socketHandlers.clear();
  managerHandlers.clear();

  return {
    connected: false,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      registerHandler(socketHandlers, event, handler);
    }),
    once: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      registerHandler(socketHandlers, event, handler);
    }),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(() => {
      mockSocket.connected = true;
      socketHandlers.get('connection:status')?.forEach((handler) => {
        handler();
      });
    }),
    disconnect: vi.fn(() => {
      mockSocket.connected = false;
    }),
    io: {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        registerHandler(managerHandlers, event, handler);
      }),
    },
  };
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

describe('socketService', () => {
  beforeEach(async () => {
    await initializeTranslations('en');

    mockSocket = createMockSocket();

    useMainStore.setState({
      connectionState: 'disconnected',
    });

    socketService.disconnect();
    vi.clearAllMocks();
    mockSocket = createMockSocket();
  });

  it('connects in demo mode without a socket', async () => {
    const listener = vi.fn();
    socketService.on('connectionState', listener);

    await socketService.connect(null);

    expect(listener).toHaveBeenCalledWith('connecting');
    expect(listener).toHaveBeenCalledWith('connected');
    expect(socketService.connected).toBe(true);
    expect(mockSocket.connect).not.toHaveBeenCalled();
  });

  it('disconnects demo mode without calling socket disconnect', async () => {
    await socketService.connect(null);

    socketService.disconnect();

    expect(socketService.connected).toBe(false);
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });

  it('rejects emit when not connected and logs the error', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(socketService.emit('session:get')).rejects.toThrow(
      'Not connected to game server',
    );

    expect(consoleError).toHaveBeenCalledWith({
      event: 'session:get',
      error: new Error('Not connected to game server'),
    });

    consoleError.mockRestore();
  });

  it('resolves emit on success response', async () => {
    await socketService.connect('token-1');

    mockSocket.emit.mockImplementation(
      (event: string, callback: (response: unknown) => void) => {
        if (event === 'session:get') {
          callback({ playerId: 'player-1' });
        }
      },
    );

    await expect(socketService.emit('session:get')).resolves.toEqual({
      playerId: 'player-1',
    });
  });

  it('rejects emit on socket error response and logs the error', async () => {
    await socketService.connect('token-1');

    mockSocket.emit.mockImplementation(
      (event: string, callback: (response: unknown) => void) => {
        if (event === 'session:get') {
          callback({
            error: {
              err_code: 'game_not_available',
              message: 'Under Maintenance',
            },
          });
        }
      },
    );

    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(socketService.emit('session:get')).rejects.toThrow(
      'Under Maintenance',
    );

    expect(consoleError).toHaveBeenCalledWith({
      event: 'session:get',
      error: new Error('Under Maintenance'),
    });

    consoleError.mockRestore();
  });

  it('passes payload to emit when provided', async () => {
    await socketService.connect('token-1');

    mockSocket.emit.mockImplementation(
      (
        event: string,
        payload: unknown,
        callback: (response: unknown) => void,
      ) => {
        if (event === 'game:placeBet') {
          expect(payload).toEqual({ betAmount: 10 });
          callback({ id: 'bet-1' });
        }
      },
    );

    await expect(
      socketService.emit('game:placeBet', { betAmount: 10 }),
    ).resolves.toEqual({ id: 'bet-1' });
  });

  it('rejects emit when response times out after 10 seconds', async () => {
    vi.useFakeTimers();

    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      await socketService.connect('token-1');

      mockSocket.emit.mockImplementation(() => undefined);

      const emitPromise = socketService.emit('session:get');
      const rejection = expect(emitPromise).rejects.toThrow(
        'Game server request timed out',
      );

      await vi.advanceTimersByTimeAsync(10_000);

      await rejection;

      expect(consoleError).toHaveBeenCalledWith({
        event: 'session:get',
        error: new Error('Game server request timed out'),
      });
    } finally {
      consoleError.mockRestore();
      vi.useRealTimers();
    }
  });

  it('rejects connect when the server emits connection:error', async () => {
    mockSocket.connect.mockImplementation(() => {
      socketHandlers.get('connection:error')?.forEach((handler) => {
        handler({
          err_code: 'invalid_session_token',
          message: 'Invalid session token',
        });
      });
    });

    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(socketService.connect('bad-token')).rejects.toThrow(
      'Invalid session token',
    );

    expect(useMainStore.getState().connectionState).toBe('error');
    expect(consoleError).toHaveBeenCalledWith({
      event: 'connect',
      error: new Error('Invalid session token'),
    });

    consoleError.mockRestore();
  });

  it('marks connected only after connection:status, not raw connect', async () => {
    const listener = vi.fn();
    socketService.on('connectionState', listener);

    mockSocket.connect.mockImplementation(() => {
      mockSocket.connected = true;
    });

    const connectPromise = socketService.connect('token-1');

    expect(useMainStore.getState().connectionState).toBe('connecting');

    socketHandlers.get('connect')?.forEach((handler) => {
      handler();
    });

    expect(useMainStore.getState().connectionState).toBe('connecting');

    socketHandlers.get('connection:status')?.forEach((handler) => {
      handler();
    });

    await connectPromise;

    expect(listener).toHaveBeenCalledWith('connecting');
    expect(listener).toHaveBeenCalledWith('connected');
    expect(useMainStore.getState().connectionState).toBe('connected');
  });

  it('removes listener with off', async () => {
    const listener = vi.fn();
    socketService.on('connectionState', listener);
    socketService.off('connectionState', listener);

    await socketService.connect(null);

    expect(listener).not.toHaveBeenCalled();
  });

  it('sets reconnecting state on reconnect_attempt', async () => {
    const listener = vi.fn();
    socketService.on('connectionState', listener);

    await socketService.connect('token-1');

    managerHandlers.get('reconnect_attempt')?.forEach((handler) => {
      handler();
    });

    expect(listener).toHaveBeenCalledWith('reconnecting');
  });
});
