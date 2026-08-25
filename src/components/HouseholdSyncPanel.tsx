import { useEffect, useEffectEvent, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { TFunction } from 'i18next';
import { getSyncMetadata, saveSyncMetadata } from '../lib/sync/outbox';
import { migrateLocalInventory } from '../lib/sync/repository';
import { runForegroundSync } from '../lib/sync/coordinator';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { SupabaseAdapterError, SupabaseAuthAdapter, SupabaseHouseholdAdapter, SupabaseInventoryAdapter } from '../lib/supabase/adapters';

const browserConnectivity = { isOnline: () => navigator.onLine, subscribe: (listener: (online: boolean) => void) => { const online = () => listener(true); const offline = () => listener(false); window.addEventListener('online', online); window.addEventListener('offline', offline); return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); }; } };

export function HouseholdSyncPanel({ t }: { t: TFunction }) {
  // Keep one browser client for the panel; recreating it on every render retriggers auth loading.
  const [client] = useState(createBrowserSupabaseClient);
  const [email, setEmail] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [createdInvite, setCreatedInvite] = useState<{ id: string; token: string; expiresAt: string } | null>(null);
  const [outstandingInvites, setOutstandingInvites] = useState<Array<{ id: string; expiresAt: string }>>([]);
  const [members, setMembers] = useState<Array<{ userId: string; role: 'owner' | 'member' }>>([]);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ key: string; error: boolean } | null>(null);
  const syncMetadata = useLiveQuery(getSyncMetadata, []);
  const [syncStatus, setSyncStatus] = useState<'offline' | 'syncing' | 'up_to_date' | 'retrying' | 'error'>('offline');
  useEffect(() => {
    if (!client) return;
    void Promise.all([new SupabaseAuthAdapter(client).getSession(), getSyncMetadata()]).then(async ([session, metadata]) => {
      setSessionEmail(session?.email ?? null);
      setSessionUserId(session?.userId ?? null);
      if (!session) {
        setHouseholdId(metadata.householdId);
        return;
      }
      const household = await new SupabaseHouseholdAdapter(client).discoverHousehold();
      if (household) {
        await saveSyncMetadata({ householdId: household.id, migrationState: metadata.migrationState, cursor: metadata.cursor });
        setHouseholdId(household.id);
        setOutstandingInvites(await new SupabaseHouseholdAdapter(client).listOutstandingInvites(household.id));
        setMembers(await new SupabaseHouseholdAdapter(client).listMembers(household.id));
      } else {
        setHouseholdId(null);
        setOutstandingInvites([]);
        setMembers([]);
      }
    }).catch((error) => showError(error));
  }, [client]);
  const syncNow = async () => {
    if (!client || !householdId) return;
    setSyncStatus('syncing');
    const result = await runForegroundSync(new SupabaseInventoryAdapter(client), browserConnectivity);
    setSyncStatus(result.status);
    if (result.status === 'error') setNotice({ key: result.reason === 'forbidden' ? 'account.errors.forbidden' : 'account.syncFailed', error: true });
  };
  const syncNowEvent = useEffectEvent(syncNow);
  useEffect(() => {
    if (!householdId || !client) return;
    const unsubscribe = browserConnectivity.subscribe((online) => { if (online) void syncNowEvent(); else setSyncStatus('offline'); });
    void syncNowEvent();
    const refresh = () => void syncNowEvent();
    window.addEventListener('focus', refresh);
    return () => { unsubscribe(); window.removeEventListener('focus', refresh); };
  }, [client, householdId]);
  const migrate = async () => {
    if (!householdId || !client) return;
    try {
      await migrateLocalInventory(householdId);
      const result = await runForegroundSync(new SupabaseInventoryAdapter(client), browserConnectivity);
      setSyncStatus(result.status);
      if (result.status === 'up_to_date') {
        await saveSyncMetadata({ migrationState: 'complete' });
        setNotice({ key: 'account.migrationComplete', error: false });
      } else if (result.status === 'error') {
        setNotice({ key: result.reason === 'forbidden' ? 'account.errors.forbidden' : 'account.syncFailed', error: true });
      }
    } catch (error) { showError(error); }
  };
  const showError = (error: unknown) => setNotice({ key: `account.errors.${error instanceof SupabaseAdapterError ? error.kind : 'generic'}`, error: true });
  const requestLink = async () => { if (!client || !email.trim()) return; try { await new SupabaseAuthAdapter(client).requestMagicLink(email.trim(), window.location.origin); setNotice({ key: 'account.magicLinkSent', error: false }); } catch (error) { showError(error); } };
  const signOut = async () => { if (!client) return; try { await new SupabaseAuthAdapter(client).signOut(); setSessionEmail(null); setSessionUserId(null); setHouseholdId(null); setMembers([]); await saveSyncMetadata({ householdId: null, migrationState: 'local' }); setNotice({ key: 'account.signedOut', error: false }); } catch (error) { showError(error); } };
  const createHousehold = async () => { if (!client || !householdName.trim()) return; try { const result = await new SupabaseHouseholdAdapter(client).createHousehold(householdName.trim()); await saveSyncMetadata({ householdId: result.id, migrationState: 'pending', cursor: null }); setHouseholdId(result.id); setMembers(sessionUserId ? [{ userId: sessionUserId, role: 'owner' }] : []); setHouseholdName(''); setNotice({ key: 'account.householdCreated', error: false }); } catch (error) { showError(error); } };
  const createInvite = async () => { if (!client || !householdId) return; try { const result = await new SupabaseHouseholdAdapter(client).createInvite(householdId); setCreatedInvite(result); setOutstandingInvites((invites) => [{ id: result.id, expiresAt: result.expiresAt }, ...invites]); setNotice({ key: 'account.inviteCreated', error: false }); } catch (error) { showError(error); } };
  const revokeInvite = async (inviteId: string) => { if (!client) return; try { await new SupabaseHouseholdAdapter(client).revokeInvite(inviteId); setCreatedInvite((invite) => invite?.id === inviteId ? null : invite); setOutstandingInvites((invites) => invites.filter((invite) => invite.id !== inviteId)); setNotice({ key: 'account.inviteRevoked', error: false }); } catch (error) { showError(error); } };
  const removeMember = async (userId: string) => { if (!client || !householdId) return; try { await new SupabaseHouseholdAdapter(client).removeMember(householdId, userId); setMembers((current) => current.filter((member) => member.userId !== userId)); setNotice({ key: 'account.memberRemoved', error: false }); } catch (error) { showError(error); } };
  const acceptInvite = async () => { if (!client || !inviteToken.trim()) return; try { const id = await new SupabaseHouseholdAdapter(client).acceptInvite(inviteToken.trim()); await saveSyncMetadata({ householdId: id, migrationState: 'pending', cursor: null }); setHouseholdId(id); setInviteToken(''); setNotice({ key: 'account.inviteAccepted', error: false }); } catch (error) { showError(error); } };
  const copyInvite = async () => {
    if (!createdInvite) return;
    try {
      await navigator.clipboard.writeText(createdInvite.token);
      setNotice({ key: 'account.inviteCopied', error: false });
    } catch {
      setNotice({ key: 'account.errors.clipboard', error: true });
    }
  };
  return <section className="settings-section household-section" aria-labelledby="settings-account-title">
    <div><p className="section-label" id="settings-account-title">{t('account.title')}</p><p className="panel-copy">{t('account.subtitle')}</p></div>
    {!client ? <p className="backup-notice error" role="alert">{t('account.errors.missingConfiguration')}</p> : null}
    {client && !sessionEmail ? <div className="household-form"><label>{t('account.email')}<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" /></label><button className="primary-button" type="button" onClick={() => void requestLink()}>{t('account.requestMagicLink')}</button></div> : null}
    {client && sessionEmail ? <><p className="panel-copy">{t('account.signedInAs', { email: sessionEmail })}</p>{!householdId ? <div className="household-form"><label>{t('account.householdName')}<input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} /></label><button className="primary-button" type="button" onClick={() => void createHousehold()}>{t('account.createHousehold')}</button></div> : <p className="backup-notice success" role="status">{t('account.householdReady')}</p>}<div className="household-form"><label>{t('account.inviteToken')}<input value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} /></label><button className="secondary-button" type="button" onClick={() => void acceptInvite()}>{t('account.acceptInvite')}</button></div>{householdId ? <div className="household-actions"><button className="secondary-button" type="button" onClick={() => void createInvite()}>{t('account.createInvite')}</button>{syncMetadata?.migrationState === 'pending' ? <button className="primary-button" type="button" onClick={() => void migrate()}>{t('account.migrateInventory')}</button> : null}{syncMetadata?.migrationState === 'complete' ? <p className="panel-copy" role="status">{t(`account.syncStatus.${syncStatus}`)}</p> : null}{createdInvite ? <><code className="invite-token">{createdInvite.token}</code><button className="secondary-button" type="button" onClick={() => void copyInvite()}>{t('account.copyInvite')}</button><button className="ghost-button" type="button" onClick={() => void revokeInvite(createdInvite.id)}>{t('account.revokeInvite')}</button></> : null}{outstandingInvites.filter((invite) => invite.id !== createdInvite?.id).map((invite) => <div key={invite.id}><span>{new Date(invite.expiresAt).toLocaleDateString()}</span><button className="ghost-button" type="button" onClick={() => void revokeInvite(invite.id)}>{t('account.revokeInvite')}</button></div>)}{members.some((member) => member.userId === sessionUserId && member.role === 'owner') ? <div className="household-members"><p className="section-label">{t('account.members')}</p>{members.filter((member) => member.role === 'member').map((member) => <div key={member.userId}><code>{member.userId}</code><button className="ghost-button" type="button" onClick={() => void removeMember(member.userId)}>{t('account.removeMember')}</button></div>)}</div> : null}</div> : null}<button className="ghost-button" type="button" onClick={() => void signOut()}>{t('account.signOut')}</button></> : null}
    {notice ? <p className={notice.error ? 'backup-notice error' : 'backup-notice success'} role={notice.error ? 'alert' : 'status'}>{t(notice.key)}</p> : null}
  </section>;
}
