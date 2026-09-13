import { useEffect, useEffectEvent, useState, type ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { TFunction } from 'i18next';
import { getSyncMetadata, saveSyncMetadata } from '../lib/sync/outbox';
import { migrateLocalInventory } from '../lib/sync/repository';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { SupabaseAdapterError, SupabaseAuthAdapter, SupabaseHouseholdAdapter } from '../lib/supabase/adapters';
import type { AuthSession, SyncStatus } from '../lib/sync/ports';

type AuthMode = 'signIn' | 'signUp' | 'reset' | 'updatePassword';

function PasswordField({ label, value, onChange, autoComplete, visible, onToggle, toggleLabel }: { label: string; value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; autoComplete: string; visible: boolean; onToggle: () => void; toggleLabel: string }) {
  return <label>{label}<span className="password-field"><input value={value} onChange={onChange} type={visible ? 'text' : 'password'} autoComplete={autoComplete} /><button className="password-toggle" type="button" aria-label={toggleLabel} title={toggleLabel} aria-pressed={visible} onClick={onToggle}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={visible ? 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.5 10.5 0 0 0 3 12s3.2 6 9 6c1.6 0 3-.4 4.2-1M14.1 5.1A10.5 10.5 0 0 1 21 12s-.8 1.5-2.2 2.9' : 'M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Zm6.5 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z'} /></svg></button></span></label>;
}

export function HouseholdSyncPanel({ t, syncStatus, syncNow }: { t: TFunction; syncStatus: SyncStatus; syncNow: (allowMigration?: boolean) => Promise<{ status: SyncStatus; reason?: string }> }) {
  // Keep one browser client for the panel; recreating it on every render retriggers auth loading.
  const [client] = useState(createBrowserSupabaseClient);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [householdName, setHouseholdName] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [inviteToken, setInviteToken] = useState(() => new URLSearchParams(window.location.search).get('invite') ?? '');
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
      const redirectUrl = inviteToken ? `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(inviteToken)}` : window.location.origin;
      const result = await new SupabaseAuthAdapter(client).signUp(email.trim(), password, redirectUrl);
      setPassword(''); setConfirmPassword(''); setPendingAction(null);
      if (result.accountExists) {
        setNotice({ key: 'account.errors.accountExists', error: true });
        setAuthMode('reset');
      } else {
        setNotice({ key: result.requiresConfirmation ? 'account.confirmationRequired' : 'account.signedIn', error: false });
        if (result.requiresConfirmation) setAuthMode('signIn');
      }
    } catch (error) { showError(error); }
  };
  const requestPasswordReset = async () => {
    if (!client || !email.trim() || pendingAction) return;
    setPendingAction('reset');
    try { const redirectUrl = inviteToken ? `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(inviteToken)}` : window.location.origin; await new SupabaseAuthAdapter(client).requestPasswordReset(email.trim(), redirectUrl); setPendingAction(null); setNotice({ key: 'account.passwordResetSent', error: false }); setAuthMode('signIn'); } catch (error) { showError(error); }
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
  const sendEmailInvite = async () => {
    if (!client || !householdId || !inviteeEmail.trim() || pendingAction) return;
    setPendingAction('sendInvite');
    try {
      const result = await new SupabaseHouseholdAdapter(client).sendEmailInvite(householdId, inviteeEmail.trim());
      setOutstandingInvites((invites) => [{ id: result.id, expiresAt: result.expiresAt }, ...invites]);
      setInviteeEmail(''); setPendingAction(null); setNotice({ key: 'account.emailInviteSent', error: false });
    } catch (error) { showError(error); }
  };
  const revokeInvite = async (inviteId: string) => {
    if (!client || pendingAction) return;
    if (!window.confirm(t('account.revokeConfirm'))) return;
    setPendingAction(`revoke:${inviteId}`);
    try { await new SupabaseHouseholdAdapter(client).revokeInvite(inviteId); setOutstandingInvites((invites) => invites.filter((invite) => invite.id !== inviteId)); setPendingAction(null); setNotice({ key: 'account.inviteRevoked', error: false }); } catch (error) { showError(error); }
  };
  const removeMember = async (userId: string) => {
    if (!client || !householdId || pendingAction) return;
    if (!window.confirm(t('account.removeMemberConfirm'))) return;
    setPendingAction(`remove:${userId}`);
    try { await new SupabaseHouseholdAdapter(client).removeMember(householdId, userId); setMembers((current) => current.filter((member) => member.userId !== userId)); setPendingAction(null); setNotice({ key: 'account.memberRemoved', error: false }); } catch (error) { showError(error); }
  };
  const acceptInvite = async () => {
    if (!client || !inviteToken.trim()) return;
    try { const id = await new SupabaseHouseholdAdapter(client).acceptInvite(inviteToken.trim()); await saveSyncMetadata({ householdId: id, migrationState: 'pending', cursor: null }); setHouseholdId(id); setInviteToken(''); window.history.replaceState({}, '', window.location.pathname); setNotice({ key: 'account.inviteAccepted', error: false }); } catch (error) { showError(error); }
  };
  const acceptInviteEffect = useEffectEvent(() => { void acceptInvite(); });
  useEffect(() => {
    if (sessionEmail && inviteToken && !householdId && !pendingAction) acceptInviteEffect();
  }, [sessionEmail, inviteToken, householdId, pendingAction]);

  const currentMember = members.find((member) => member.userId === sessionUserId);

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
      <PasswordField label={t('account.password')} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === 'signUp' ? 'new-password' : 'current-password'} visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} toggleLabel={t(showPassword ? 'account.hidePassword' : 'account.showPassword')} />
      {authMode === 'signUp' ? <PasswordField label={t('account.confirmPassword')} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((visible) => !visible)} toggleLabel={t(showConfirmPassword ? 'account.hideConfirmPassword' : 'account.showConfirmPassword')} /> : null}
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
      <div className="account-actions"><button className="ghost-button" type="button" disabled={pendingAction !== null} onClick={() => void signOut()}>{t('account.signOut')}</button>{authMode === 'updatePassword' ? <button className="ghost-button" type="button" onClick={() => setAuthMode('signIn')}>{t('account.backToSignIn')}</button> : <button className="ghost-button" type="button" onClick={() => setAuthMode('updatePassword')}>{t('account.setPassword')}</button>}</div>
      {authMode === 'updatePassword' ? <div className="household-form"><PasswordField label={t('account.newPassword')} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} toggleLabel={t(showPassword ? 'account.hidePassword' : 'account.showPassword')} /><PasswordField label={t('account.confirmPassword')} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((visible) => !visible)} toggleLabel={t(showConfirmPassword ? 'account.hideConfirmPassword' : 'account.showConfirmPassword')} /><button className="primary-button" type="button" disabled={pendingAction !== null} onClick={() => void updatePassword()}>{t('account.updatePassword')}</button></div> : null}
      {!householdId ? <div className="household-form"><label>{t('account.householdName')}<input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} /></label><button className="primary-button" type="button" onClick={() => void createHousehold()}>{t('account.createHousehold')}</button></div> : <p className="backup-notice success" role="status">{t('account.householdReady')}{syncMetadata?.migrationState === 'complete' ? <><br /><strong>{t(`account.syncStatus.${syncStatus}`)}</strong></> : null}</p>}
      {householdId ? <div className="household-actions">{currentMember?.role === 'owner' ? <div className="household-form"><label>{t('account.inviteeEmail')}<input value={inviteeEmail} onChange={(event) => setInviteeEmail(event.target.value)} type="email" autoComplete="email" /></label><button className="primary-button" type="button" disabled={pendingAction !== null} onClick={() => void sendEmailInvite()}>{pendingAction === 'sendInvite' ? t('account.working') : t('account.sendEmailInvite')}</button></div> : null}{syncMetadata?.migrationState === 'pending' || syncMetadata?.migrationState === 'migrating' ? <button className="primary-button" type="button" disabled={pendingAction !== null} onClick={() => void migrate()}>{pendingAction === 'migrate' ? t('account.working') : t('account.migrateInventory')}</button> : null}{outstandingInvites.map((invite) => <div key={invite.id}><span>{t('account.invitationExpires', { date: new Date(invite.expiresAt).toLocaleDateString() })}</span><button className="ghost-button" type="button" disabled={pendingAction !== null} onClick={() => void revokeInvite(invite.id)}>{t('account.revokeInvite')}</button></div>)}{members.map((member) => <div className="member-row" key={member.userId}><span className="member-summary"><span>{member.userId.slice(0, 6)}{member.userId === sessionUserId ? ` ${t('account.currentUser')}` : ''}</span><span>{member.role}</span></span>{currentMember?.role === 'owner' && member.userId !== sessionUserId && member.role === 'member' ? <button className="ghost-button member-remove" type="button" disabled={pendingAction !== null} onClick={() => void removeMember(member.userId)}>{t('account.removeMember')}</button> : null}</div>)}</div> : null}
    </> : null}
    {notice ? <p className={notice.error ? 'backup-notice error' : 'backup-notice success'} role={notice.error ? 'alert' : 'status'}>{t(notice.key)}</p> : null}
  </section>;
}
