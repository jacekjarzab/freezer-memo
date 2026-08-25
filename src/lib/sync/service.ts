import { useEffect, useState, useSyncExternalStore } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runForegroundSync, type SyncCoordinatorResult } from './coordinator';
import { subscribeToSharedMutations } from './repository';
import type { ConnectivityPort, RemoteInventoryStore, SyncStatus } from './ports';
import { SupabaseInventoryAdapter } from '../supabase/adapters';

const browserConnectivity = {
  isOnline: () => typeof navigator === 'undefined' || navigator.onLine,
  subscribe: (listener: (online: boolean) => void) => {
    const online = () => listener(true);
    const offline = () => listener(false);
    if (typeof window === 'undefined') return () => undefined;
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  },
};

export interface SharedSyncService {
  getStatus(): SyncStatus;
  subscribe(listener: () => void): () => void;
  start(): () => void;
  syncNow(allowMigration?: boolean): Promise<SyncCoordinatorResult>;
}

export function getSyncIndicatorTone(status: SyncStatus): 'up-to-date' | 'needs-attention' | 'offline' {
  if (status === 'up_to_date') return 'up-to-date';
  if (status === 'offline') return 'offline';
  return 'needs-attention';
}

export function createSharedSyncServiceFor(
  remote: RemoteInventoryStore,
  connectivity: ConnectivityPort,
): SharedSyncService {
  let status: SyncStatus = connectivity.isOnline() ? 'up_to_date' : 'offline';
  let running: Promise<SyncCoordinatorResult> | null = null;
  let queued: { allowMigration: boolean; promise: Promise<SyncCoordinatorResult> } | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const syncNow = (allowMigration = false): Promise<SyncCoordinatorResult> => {
    if (running) {
      if (queued) {
        queued.allowMigration ||= allowMigration;
        return queued.promise;
      }
      const request = { allowMigration, promise: undefined as unknown as Promise<SyncCoordinatorResult> };
      request.promise = running.then(() => {
        queued = null;
        return syncNow(request.allowMigration);
      });
      queued = request;
      return request.promise;
    }
    status = 'syncing';
    notify();
    running = runForegroundSync(remote, connectivity, new Date(), allowMigration)
      .then((result) => { status = result.status; notify(); return result; })
      .catch((error: unknown) => { status = 'error'; notify(); return { status: 'error' as const, reason: error instanceof Error ? error.message : 'sync_failed' }; })
      .finally(() => { running = null; });
    return running!;
  };
  return {
    getStatus: () => status,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    start: () => {
      const unsubscribeMutation = subscribeToSharedMutations(() => void syncNow());
      const unsubscribeConnectivity = connectivity.subscribe((online) => {
        if (online) void syncNow();
        else { status = 'offline'; notify(); }
      });
      const refresh = () => void syncNow();
      if (typeof window !== 'undefined') window.addEventListener('focus', refresh);
      void syncNow();
      return () => {
        unsubscribeMutation();
        unsubscribeConnectivity();
        if (typeof window !== 'undefined') window.removeEventListener('focus', refresh);
      };
    },
    syncNow,
  };
}

export function createSharedSyncService(client: SupabaseClient): SharedSyncService {
  return createSharedSyncServiceFor(new SupabaseInventoryAdapter(client), browserConnectivity);
}

export function useSharedSync(client: SupabaseClient | null) {
  const [service] = useState(() => (client ? createSharedSyncService(client) : null));
  const status = useSyncExternalStore(
    service?.subscribe ?? (() => () => undefined),
    service?.getStatus ?? (() => 'offline' as SyncStatus),
    () => 'offline' as SyncStatus,
  );
  useEffect(() => service?.start(), [service]);
  return { service, status };
}
