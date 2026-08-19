import type { FreezerItemRecord, OutboxOperationRecord } from '../db';

export interface AuthSession {
  userId: string;
  email: string | null;
}

export interface AuthPort {
  getSession(): Promise<AuthSession | null>;
  requestMagicLink(email: string, redirectUrl: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface PullResult {
  items: FreezerItemRecord[];
  nextCursor: string | null;
}

export interface PushResult {
  accepted: boolean;
  item: FreezerItemRecord | null;
  error?: 'forbidden' | 'conflict' | 'invalid' | 'unavailable';
}

export interface RemoteInventoryStore {
  pull(householdId: string, cursor: string | null): Promise<PullResult>;
  push(
    householdId: string,
    operation: OutboxOperationRecord,
  ): Promise<PushResult>;
}

export interface ConnectivityPort {
  isOnline(): boolean;
  subscribe(listener: (online: boolean) => void): () => void;
}

export type SyncStatus =
  | 'offline'
  | 'syncing'
  | 'up_to_date'
  | 'retrying'
  | 'error';
