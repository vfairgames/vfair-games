import { Tooltip } from '@radix-ui/themes';
import { useEffect, useRef } from 'react';

import {
  useMainStore,
  type ConnectionState,
} from '../../store/main-store/main-store';
import { useTranslation } from '../../i18n/i18n';
import { toastService } from '../../services/toast.service';

import './connection-indicator.scss';

type IndicatorState = 'connected' | 'reconnecting' | 'disconnected';

const toIndicatorState = (connectionState: ConnectionState): IndicatorState => {
  if (connectionState === 'connected') {
    return 'connected';
  }

  if (connectionState === 'reconnecting' || connectionState === 'connecting') {
    return 'reconnecting';
  }

  return 'disconnected';
};

export const ConnectionIndicator = () => {
  const { t } = useTranslation();
  const connectionState = useMainStore((state) => state.connectionState);
  const indicatorState = toIndicatorState(connectionState);
  const reconnectToastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (connectionState === 'reconnecting') {
      if (!reconnectToastIdRef.current) {
        reconnectToastIdRef.current = toastService.warning(
          t('shellReconnectingWithEllipsis'),
          {
            persist: true,
            closable: false,
          },
        );
      }
      return;
    }

    if (reconnectToastIdRef.current) {
      toastService.dismiss(reconnectToastIdRef.current);
      reconnectToastIdRef.current = null;
    }
  }, [connectionState, t]);

  useEffect(
    () => () => {
      if (reconnectToastIdRef.current) {
        toastService.dismiss(reconnectToastIdRef.current);
      }
    },
    [],
  );

  const indicatorLabels: Record<IndicatorState, string> = {
    connected: t('shellConnected'),
    reconnecting: t('shellReconnecting'),
    disconnected: t('shellConnectionLost'),
  };
  const label = indicatorLabels[indicatorState];

  return (
    <Tooltip content={label}>
      <span
        className="connection-indicator"
        data-state={indicatorState}
        role="status"
        aria-label={label}
      />
    </Tooltip>
  );
};
