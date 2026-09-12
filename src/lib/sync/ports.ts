import type { FreezerItemRecord, OutboxOperationRecord } from '../db';

export interface AuthSession {
  userId: string;
  email: string | null;
}

export interface SignUpResult {
  session: AuthSession | null;
  requiresConfirmation: boolean;
  accountExists: boolean;
}

export interface AuthPort {
  getSession(): Promise<AuthSession | null>;
  signUp(email: string, password: string, redirectUrl: string): Promise<SignUpResult>;
  signInWithPassword(email: string, password: string): Promise<AuthSession>;
  requestPasswordReset(email: string, redirectUrl: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  onAuthStateChange(listener: (session: AuthSession | null) => void): () => void;
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
