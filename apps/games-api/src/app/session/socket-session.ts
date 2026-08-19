import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import type { SessionTokenPayload } from './session-token.service';

export type SocketSessionData = {
  session: SessionTokenPayload;
};

export const readSocketSession = (
  client: Socket,
): SessionTokenPayload | undefined => {
  return (client.data as SocketSessionData).session;
};

export const attachSocketSession = (
  client: Socket,
  session: SessionTokenPayload,
): void => {
  (client.data as SocketSessionData).session = session;
};

export const requireSocketSession = (client: Socket): SessionTokenPayload => {
  const session = readSocketSession(client);

  if (!session) {
    throw new Error('Socket session is missing');
  }

  return session;
};

export const assertSessionGameId = (
  session: SessionTokenPayload,
  gameId: string,
): void => {
  if (session.gameId !== gameId) {
    throw new WsException({
      err_code: 'game_not_available',
      message: 'Game not available',
    });
  }
};
