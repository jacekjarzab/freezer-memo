import { useEffect, useState } from 'react';
import type { TFunction } from 'i18next';
import { getSyncMetadata, saveSyncMetadata } from '../lib/sync/outbox';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { SupabaseAdapterError, SupabaseAuthAdapter, SupabaseHouseholdAdapter } from '../lib/supabase/adapters';

export function HouseholdSyncPanel({ t }: { t: TFunction }) {
  // Keep one browser client for the panel; recreating it on every render retriggers auth loading.
  const [client] = useState(createBrowserSupabaseClient);
  const [email, setEmail] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [createdInvite, setCreatedInvite] = useState<{ id: string; token: string } | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ key: string; error: boolean } | null>(null);
  useEffect(() => {
    if (!client) return;
    void Promise.all([new SupabaseAuthAdapter(client).getSession(), getSyncMetadata()]).then(([session, metadata]) => {
      setSessionEmail(session?.email ?? null); setHouseholdId(metadata.householdId);
    }).catch(() => setNotice({ key: 'account.errors.unavailable', error: true }));
  }, [client]);
  const showError = (error: unknown) => setNotice({ key: `account.errors.${error instanceof SupabaseAdapterError ? error.kind : 'generic'}`, error: true });
  const requestLink = async () => { if (!client || !email.trim()) return; try { await new SupabaseAuthAdapter(client).requestMagicLink(email.trim(), window.location.origin); setNotice({ key: 'account.magicLinkSent', error: false }); } catch (error) { showError(error); } };
  const signOut = async () => { if (!client) return; try { await new SupabaseAuthAdapter(client).signOut(); setSessionEmail(null); setHouseholdId(null); await saveSyncMetadata({ householdId: null, migrationState: 'local' }); setNotice({ key: 'account.signedOut', error: false }); } catch (error) { showError(error); } };
  const createHousehold = async () => { if (!client || !householdName.trim()) return; try { const result = await new SupabaseHouseholdAdapter(client).createHousehold(householdName.trim()); await saveSyncMetadata({ householdId: result.id, migrationState: 'pending', cursor: null }); setHouseholdId(result.id); setHouseholdName(''); setNotice({ key: 'account.householdCreated', error: false }); } catch (error) { showError(error); } };
  const createInvite = async () => { if (!client || !householdId) return; try { const result = await new SupabaseHouseholdAdapter(client).createInvite(householdId); setCreatedInvite(result); setNotice({ key: 'account.inviteCreated', error: false }); } catch (error) { showError(error); } };
  const revokeInvite = async () => { if (!client || !createdInvite) return; try { await new SupabaseHouseholdAdapter(client).revokeInvite(createdInvite.id); setCreatedInvite(null); setNotice({ key: 'account.inviteRevoked', error: false }); } catch (error) { showError(error); } };
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
    {client && sessionEmail ? <><p className="panel-copy">{t('account.signedInAs', { email: sessionEmail })}</p>{!householdId ? <div className="household-form"><label>{t('account.householdName')}<input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} /></label><button className="primary-button" type="button" onClick={() => void createHousehold()}>{t('account.createHousehold')}</button></div> : <p className="backup-notice success" role="status">{t('account.householdReady')}</p>}<div className="household-form"><label>{t('account.inviteToken')}<input value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} /></label><button className="secondary-button" type="button" onClick={() => void acceptInvite()}>{t('account.acceptInvite')}</button></div>{householdId ? <div className="household-actions"><button className="secondary-button" type="button" onClick={() => void createInvite()}>{t('account.createInvite')}</button>{createdInvite ? <><code className="invite-token">{createdInvite.token}</code><button className="secondary-button" type="button" onClick={() => void copyInvite()}>{t('account.copyInvite')}</button><button className="ghost-button" type="button" onClick={() => void revokeInvite()}>{t('account.revokeInvite')}</button></> : null}</div> : null}<button className="ghost-button" type="button" onClick={() => void signOut()}>{t('account.signOut')}</button></> : null}
    {notice ? <p className={notice.error ? 'backup-notice error' : 'backup-notice success'} role={notice.error ? 'alert' : 'status'}>{t(notice.key)}</p> : null}
  </section>;
}
