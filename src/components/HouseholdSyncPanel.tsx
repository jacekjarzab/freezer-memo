import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { TFunction } from 'i18next';
import { getSyncMetadata, saveSyncMetadata } from '../lib/sync/outbox';
import { migrateLocalInventory } from '../lib/sync/repository';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { SupabaseAdapterError, SupabaseAuthAdapter, SupabaseHouseholdAdapter } from '../lib/supabase/adapters';
import type { AuthSession, SyncStatus } from '../lib/sync/ports';

type AuthMode = 'signIn' | 'signUp' | 'reset' | 'updatePassword';

export function HouseholdSyncPanel({ t, syncStatus, syncNow }: { t: TFunction; syncStatus: SyncStatus; syncNow: (allowMigration?: boolean) => Promise<{ status: SyncStatus; reason?: string }> }) {
  // Keep one browser client for the panel; recreating it on every render retriggers auth loading.
  const [client] = useState(createBrowserSupabaseClient);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [householdName, setHouseholdName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [createdInvite, setCreatedInvite] = useState<{ id: string; token: string; expiresAt: string } | null>(null);
  const [outstandingInvites, setOutstandingInvites] = useState<Array<{ id: string; expiresAt: string }>>([]);
  const [members, setMembers] = useState<Array<{ userId: string; role: 'owner' | 'member' }>>([]);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ key: string; error: boolean } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const syncMetadata = useLiveQuery(getSyncMetadata, []);

  useEffect(() => {
    if (!client) return;
    const auth = new SupabaseAuthAdapter(client);
    let active = true;
    const hydrateSession = async (session?: AuthSession | null) => {
      const currentSession = session === undefined ? await auth.getSession() : session;
      const metadata = await getSyncMetadata();
      if (!active) return;
      setSessionEmail(currentSession?.email ?? null);
      setSessionUserId(currentSession?.userId ?? null);
      if (!currentSession) {
        setHouseholdId(metadata.householdId);
        return;
      }
      const household = await new SupabaseHouseholdAdapter(client).discoverHousehold();
      if (!active) return;
      if (household) {
        // A new browser has no local migration record, so let the user explicitly
        // migrate its local cache before the coordinator starts pulling shared data.
        const migrationState = metadata.migrationState === 'local' ? 'pending' : metadata.migrationState;
        await saveSyncMetadata({ householdId: household.id, migrationState, cursor: metadata.cursor });
        setHouseholdId(household.id);
        setOutstandingInvites(await new SupabaseHouseholdAdapter(client).listOutstandingInvites(household.id));
        setMembers(await new SupabaseHouseholdAdapter(client).listMembers(household.id));
      } else {
        setHouseholdId(null);
        setOutstandingInvites([]);
        setMembers([]);
      }
    };
    void hydrateSession().catch((error) => showError(error));
    const unsubscribe = auth.onAuthStateChange((session) => {
      void hydrateSession(session).catch((error) => showError(error));
    });
    return () => { active = false; unsubscribe(); };
  }, [client]);

  const showError = (error: unknown) => {
    setPendingAction(null);
    setNotice({ key: `account.errors.${error instanceof SupabaseAdapterError ? error.kind : 'generic'}`, error: true });
  };
  const validatePassword = () => {
    if (password.length < 8) { setNotice({ key: 'account.errors.passwordTooShort', error: true }); return false; }
    if ((authMode === 'signUp' || authMode === 'updatePassword') && password !== confirmPassword) { setNotice({ key: 'account.errors.passwordMismatch', error: true }); return false; }
    return true;
  };
  const signIn = async () => {
    if (!client || !email.trim() || !password || pendingAction) return;
    setPendingAction('signIn');
    try { await new SupabaseAuthAdapter(client).signInWithPassword(email.trim(), password); setPassword(''); setPendingAction(null); setNotice({ key: 'account.signedIn', error: false }); } catch (error) { showError(error); }
  };
  const signUp = async () => {
    if (!client || !email.trim() || !validatePassword() || pendingAction) return;
    setPendingAction('signUp');
    try {
      const result = await new SupabaseAuthAdapter(client).signUp(email.trim(), password, window.location.origin);
      setPassword(''); setConfirmPassword(''); setPendingAction(null);
      setNotice({ key: result.requiresConfirmation ? 'account.confirmationRequired' : 'account.signedIn', error: false });
      if (result.requiresConfirmation) setAuthMode('signIn');
    } catch (error) { showError(error); }
  };
  const requestPasswordReset = async () => {
    if (!client || !email.trim() || pendingAction) return;
    setPendingAction('reset');
    try { await new SupabaseAuthAdapter(client).requestPasswordReset(email.trim(), window.location.origin); setPendingAction(null); setNotice({ key: 'account.passwordResetSent', error: false }); setAuthMode('signIn'); } catch (error) { showError(error); }
  };
  const updatePassword = async () => {
    if (!client || !validatePassword() || pendingAction) return;
    setPendingAction('updatePassword');
    try { await new SupabaseAuthAdapter(client).updatePassword(password); setPassword(''); setConfirmPassword(''); setPendingAction(null); setAuthMode('signIn'); setNotice({ key: 'account.passwordUpdated', error: false }); } catch (error) { showError(error); }
  };
  const signOut = async () => {
    if (!client || pendingAction) return;
    if (!window.confirm(t('account.signOutConfirm'))) return;
    setPendingAction('signOut');
    try {
      await new SupabaseAuthAdapter(client).signOut();
      setSessionEmail(null); setSessionUserId(null); setHouseholdId(null); setMembers([]);
      await saveSyncMetadata({ householdId: null, migrationState: 'local' });
      setPassword(''); setConfirmPassword(''); setPendingAction(null); setNotice({ key: 'account.signedOut', error: false });
    } catch (error) { showError(error); }
  };
  const migrate = async () => {
    if (!householdId || !client || pendingAction) return;
    if (!window.confirm(t('account.migrationConfirm'))) return;
    setPendingAction('migrate');
    try {
      await migrateLocalInventory(householdId);
      const result = await syncNow(true);
      if (result.status === 'up_to_date') {
        await saveSyncMetadata({ migrationState: 'complete' });
        setPendingAction(null); setNotice({ key: 'account.migrationComplete', error: false });
      } else if (result.status === 'error') {
        setPendingAction(null);
        setNotice({ key: result.reason === 'forbidden' ? 'account.errors.forbidden' : 'account.syncFailed', error: true });
      } else {
        setPendingAction(null); setNotice({ key: 'account.syncFailed', error: true });
      }
    } catch (error) { showError(error); }
  };
  const createHousehold = async () => {
    if (!client || !householdName.trim()) return;
    try {
      const result = await new SupabaseHouseholdAdapter(client).createHousehold(householdName.trim());
      await saveSyncMetadata({ householdId: result.id, migrationState: 'pending', cursor: null });
      setHouseholdId(result.id); setMembers(sessionUserId ? [{ userId: sessionUserId, role: 'owner' }] : []); setHouseholdName(''); setNotice({ key: 'account.householdCreated', error: false });
    } catch (error) { showError(error); }
  };
  const createInvite = async () => {
    if (!client || !householdId) return;
    try { const result = await new SupabaseHouseholdAdapter(client).createInvite(householdId); setCreatedInvite(result); setOutstandingInvites((invites) => [{ id: result.id, expiresAt: result.expiresAt }, ...invites]); setNotice({ key: 'account.inviteCreated', error: false }); } catch (error) { showError(error); }
  };
  const revokeInvite = async (inviteId: string) => {
    if (!client || pendingAction) return;
    if (!window.confirm(t('account.revokeConfirm'))) return;
    setPendingAction(`revoke:${inviteId}`);
    try { await new SupabaseHouseholdAdapter(client).revokeInvite(inviteId); setCreatedInvite((invite) => invite?.id === inviteId ? null : invite); setOutstandingInvites((invites) => invites.filter((invite) => invite.id !== inviteId)); setPendingAction(null); setNotice({ key: 'account.inviteRevoked', error: false }); } catch (error) { showError(error); }
  };
  const removeMember = async (userId: string) => {
    if (!client || !householdId || pendingAction) return;
    if (!window.confirm(t('account.removeMemberConfirm'))) return;
    setPendingAction(`remove:${userId}`);
    try { await new SupabaseHouseholdAdapter(client).removeMember(householdId, userId); setMembers((current) => current.filter((member) => member.userId !== userId)); setPendingAction(null); setNotice({ key: 'account.memberRemoved', error: false }); } catch (error) { showError(error); }
  };
  const acceptInvite = async () => {
    if (!client || !inviteToken.trim()) return;
    try { const id = await new SupabaseHouseholdAdapter(client).acceptInvite(inviteToken.trim()); await saveSyncMetadata({ householdId: id, migrationState: 'pending', cursor: null }); setHouseholdId(id); setInviteToken(''); setNotice({ key: 'account.inviteAccepted', error: false }); } catch (error) { showError(error); }
  };
  const copyInvite = async () => {
    if (!createdInvite) return;
    try { await navigator.clipboard.writeText(createdInvite.token); setNotice({ key: 'account.inviteCopied', error: false }); } catch { setNotice({ key: 'account.errors.clipboard', error: true }); }
  };

  const authForm = authMode === 'reset' ? (
    <div className="household-form">
      <p className="panel-copy">{t('account.resetPasswordDescription')}</p>
      <label>{t('account.email')}<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" /></label>
      <button className="primary-button" type="button" disabled={pendingAction !== null} onClick={() => void requestPasswordReset()}>{t('account.sendResetEmail')}</button>
      <button className="ghost-button" type="button" onClick={() => setAuthMode('signIn')}>{t('account.backToSignIn')}</button>
    </div>
  ) : (
    <div className="household-form">
      {authMode === 'signUp' ? <p className="panel-copy">{t('account.existingAccountHint')}</p> : null}
      <label>{t('account.email')}<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" /></label>
      <label>{t('account.password')}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={authMode === 'signUp' ? 'new-password' : 'current-password'} /></label>
      {authMode === 'signUp' ? <label>{t('account.confirmPassword')}<input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" /></label> : null}
      <button className="primary-button" type="button" disabled={pendingAction !== null} onClick={() => void (authMode === 'signUp' ? signUp() : signIn())}>{pendingAction ? t('account.working') : t(authMode === 'signUp' ? 'account.createAccount' : 'account.signIn')}</button>
      {authMode === 'signIn' ? <><button className="ghost-button" type="button" onClick={() => setAuthMode('signUp')}>{t('account.createAccount')}</button><button className="ghost-button" type="button" onClick={() => setAuthMode('reset')}>{t('account.forgotPassword')}</button></> : <button className="ghost-button" type="button" onClick={() => setAuthMode('signIn')}>{t('account.backToSignIn')}</button>}
    </div>
  );

  return <section className="settings-section household-section" aria-labelledby="settings-account-title">
    <div><p className="section-label" id="settings-account-title">{t('account.title')}</p><p className="panel-copy">{t('account.subtitle')}</p></div>
    {!client ? <details className="household-disabled"><summary>{t('account.sharingUnavailableTitle')}</summary><p className="panel-copy">{t('account.sharingUnavailableCopy')}</p></details> : null}
    {client && !sessionEmail ? <>{authForm}<p className="panel-copy">{t('account.emailLinkPlatformNote')}</p></> : null}
    {client && sessionEmail ? <>
      <p className="panel-copy">{t('account.signedInAs', { email: sessionEmail })}</p>
      <button className="ghost-button" type="button" disabled={pendingAction !== null} onClick={() => void signOut()}>{t('account.signOut')}</button>
      {authMode === 'updatePassword' ? <div className="household-form"><label>{t('account.newPassword')}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" /></label><label>{t('account.confirmPassword')}<input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" /></label><button className="primary-button" type="button" disabled={pendingAction !== null} onClick={() => void updatePassword()}>{t('account.updatePassword')}</button></div> : <button className="ghost-button" type="button" onClick={() => setAuthMode('updatePassword')}>{t('account.setPassword')}</button>}
      {!householdId ? <div className="household-form"><label>{t('account.householdName')}<input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} /></label><button className="primary-button" type="button" onClick={() => void createHousehold()}>{t('account.createHousehold')}</button></div> : <p className="backup-notice success" role="status">{t('account.householdReady')}</p>}
      <div className="household-form"><label>{t('account.inviteToken')}<input value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} /></label><button className="secondary-button" type="button" onClick={() => void acceptInvite()}>{t('account.acceptInvite')}</button></div>
      {householdId ? <div className="household-actions"><button className="secondary-button" type="button" onClick={() => void createInvite()}>{t('account.createInvite')}</button>{syncMetadata?.migrationState === 'pending' || syncMetadata?.migrationState === 'migrating' ? <button className="primary-button" type="button" disabled={pendingAction !== null} onClick={() => void migrate()}>{pendingAction === 'migrate' ? t('account.working') : t('account.migrateInventory')}</button> : null}{syncMetadata?.migrationState === 'complete' ? <p className="panel-copy" role="status">{t(`account.syncStatus.${syncStatus}`)}</p> : null}{createdInvite ? <><code className="invite-token">{createdInvite.token}</code><button className="secondary-button" type="button" onClick={() => void copyInvite()}>{t('account.copyInvite')}</button><button className="ghost-button" type="button" disabled={pendingAction !== null} onClick={() => void revokeInvite(createdInvite.id)}>{pendingAction === `revoke:${createdInvite.id}` ? t('account.working') : t('account.revokeInvite')}</button></> : null}{outstandingInvites.filter((invite) => invite.id !== createdInvite?.id).map((invite) => <div key={invite.id}><span>{t('account.invitationExpires', { date: new Date(invite.expiresAt).toLocaleDateString() })}</span><button className="ghost-button" type="button" disabled={pendingAction !== null} onClick={() => void revokeInvite(invite.id)}>{t('account.revokeInvite')}</button></div>)}{members.map((member) => <div key={member.userId}><span>{t('account.memberLabel', { id: member.userId.slice(0, 6) })} · {member.role}</span>{member.userId !== sessionUserId && member.role === 'member' ? <button className="ghost-button" type="button" disabled={pendingAction !== null} onClick={() => void removeMember(member.userId)}>{t('account.removeMember')}</button> : null}</div>)}</div> : null}
    </> : null}
    {notice ? <p className={notice.error ? 'backup-notice error' : 'backup-notice success'} role={notice.error ? 'alert' : 'status'}>{t(notice.key)}</p> : null}
  </section>;
}
