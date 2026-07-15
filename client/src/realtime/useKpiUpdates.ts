import { useEffect, useRef } from 'react';
import { SOCKET_EVENTS, type KpiUpdatePayload } from '@saiji/shared';
import { getSocket } from './socket';

/**
 * KPI 更新イベントを購読する。
 * handler が変わっても再購読しないよう ref 経由で最新を呼ぶ。
 */
export function useKpiUpdates(handler: (payload: KpiUpdatePayload) => void): void {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    const listener = (payload: KpiUpdatePayload) => ref.current(payload);
    socket.on(SOCKET_EVENTS.KPI_UPDATE, listener);
    return () => {
      socket.off(SOCKET_EVENTS.KPI_UPDATE, listener);
    };
  }, []);
}
