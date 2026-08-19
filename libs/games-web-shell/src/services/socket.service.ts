/// <reference types="vite/client" />

import { io, type Socket } from 'socket.io-client';

import { translate } from '../i18n/i18n';
import {
  useMainStore,
  type ConnectionState,
} from '../store/main-store/main-store';

type SocketErrorResponse = {
  error: {
    err_code: string;
    message: string;
  };
};

type SocketServiceEventMap = {
  connectionState: ConnectionState;
};

const SOCKET_URL = import.meta.env.VITE_API_WS_URL ?? 'http://localhost:3000';
const EMIT_TIMEOUT_MS = 10_000;
const DEMO_CONNECT_DELAY_MS = 0;

const toConnectError = (payload: unknown): Error => {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return new Error(payload.message);
  }

  return new Error(translate('errorNotConnectedToGameServer'));
};

class SocketService {
  private _socket: Socket | null = null;
  private readonly listeners: {
    [E in keyof SocketServiceEventMap]?: Set<
      (payload: SocketServiceEventMap[E]) => void
    >;
  } = {};
  private demoConnectTimer: ReturnType<typeof setTimeout> | null = null;
  private demoConnected = false;

  get connected(): boolean {
    if (this.demoConnected) {
      return true;
    }

    return this._socket?.connected ?? false;
  }

  on<E extends keyof SocketServiceEventMap>(
    event: E,
    listener: (payload: SocketServiceEventMap[E]) => void,
  ): void {
    const handlers = this.listeners[event] ?? new Set();
    handlers.add(listener);
    this.listeners[event] = handlers;
  }

  off<E extends keyof SocketServiceEventMap>(
    event: E,
    listener: (payload: SocketServiceEventMap[E]) => void,
  ): void {
    this.listeners[event]?.delete(listener);
  }

  async connect(token: string | null): Promise<void> {
    if (token === null) {
      return this.connectDemo();
    }

    if (this._socket?.connected) {
      return;
    }

    this.demoConnected = false;
    this.setConnectionState('connecting');

    this._socket = io(SOCKET_URL, {
      path: '/ws',
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: {
        token,
      },
    });

    this.attachSocketListeners(this._socket);

    const socket = this._socket;

    return new Promise((resolve, reject) => {
      let settled = false;

      const finish = (error?: Error) => {
        if (settled) {
          return;
        }

        settled = true;
        socket.off('connection:status', onConnected);
        socket.off('connection:error', onConnectionError);
        socket.off('connect_error', onFailed);
        socket.off('disconnect', onFailed);
        error ? reject(error) : resolve();
      };

      const failConnect = (error: Error) => {
        this.reportError('connect', error, true);
        finish(error);
      };

      const onConnected = () => finish();
      const onConnectionError = (payload: unknown) =>
        failConnect(toConnectError(payload));
      const onFailed = () =>
        failConnect(new Error(translate('errorNotConnectedToGameServer')));

      socket.once('connection:status', onConnected);
      socket.once('connection:error', onConnectionError);
      socket.once('connect_error', onFailed);
      socket.once('disconnect', onFailed);
      socket.connect();
    });
  }

  disconnect(): void {
    if (this.demoConnectTimer) {
      clearTimeout(this.demoConnectTimer);
      this.demoConnectTimer = null;
    }

    this.demoConnected = false;
    this._socket?.disconnect();
    this._socket = null;
    this.setConnectionState('disconnected');
  }

  private connectDemo(): Promise<void> {
    if (this.demoConnected) {
      return Promise.resolve();
    }

    this.setConnectionState('connecting');

    return new Promise((resolve) => {
      this.demoConnectTimer = setTimeout(() => {
        this.demoConnectTimer = null;
        this.demoConnected = true;
        this.setConnectionState('connected');
        resolve();
      }, DEMO_CONNECT_DELAY_MS);
    });
  }

  async emit<TResponse, TPayload = void>(
    event: string,
    payload?: TPayload,
  ): Promise<TResponse> {
    try {
      const socket = this._socket;
      if (!socket?.connected) {
        throw new Error(translate('errorNotConnectedToGameServer'));
      }

      return await new Promise<TResponse>((resolve, reject) => {
        let settled = false;

        const finish = (handler: () => void) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timeoutId);
          handler();
        };

        const timeoutId = setTimeout(() => {
          finish(() =>
            reject(new Error(translate('errorSocketRequestTimedOut'))),
          );
        }, EMIT_TIMEOUT_MS);

        const onResponse = (response: TResponse | SocketErrorResponse) => {
          if (response && typeof response === 'object' && 'error' in response) {
            const { message, err_code } = response.error;
            finish(() => reject(new Error(message ?? err_code)));
            return;
          }

          finish(() => resolve(response as TResponse));
        };

        if (payload === undefined) {
          socket.emit(event, onResponse);
          return;
        }

        socket.emit(event, payload, onResponse);
      });
    } catch (error: unknown) {
      this.reportError(
        event,
        error instanceof Error
          ? error
          : new Error(translate('shellUnknownError')),
      );
      throw error;
    }
  }

  private reportError(
    event: string,
    error: Error,
    setErrorState = false,
  ): void {
    if (setErrorState) {
      this.setConnectionState('error');
    }

    console.error({ event, error });
  }

  private attachSocketListeners(socket: Socket): void {
    socket.on('connection:status', () => this.setConnectionState('connected'));
    socket.on('disconnect', () => this.setConnectionState('disconnected'));
    socket.on('connect_error', () => this.setConnectionState('error'));
    socket.io.on('reconnect_attempt', () =>
      this.setConnectionState('reconnecting'),
    );
  }

  private setConnectionState(state: ConnectionState): void {
    useMainStore.getState().setConnectionState(state);
    this.notify('connectionState', state);
  }

  private notify<E extends keyof SocketServiceEventMap>(
    event: E,
    payload: SocketServiceEventMap[E],
  ): void {
    this.listeners[event]?.forEach((listener) => {
      listener(payload);
    });
  }
}

export const socketService = new SocketService();
