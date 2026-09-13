import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'authentication_required' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('INVITE_FROM_EMAIL');
  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '');
  if (!supabaseUrl || !supabaseAnonKey || !resendApiKey || !fromEmail || !appUrl) {
    return json({ error: 'invite_service_not_configured' }, 503);
  }

  let body: { householdId?: unknown; inviteeEmail?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (typeof body.householdId !== 'string' || typeof body.inviteeEmail !== 'string') {
    return json({ error: 'household_id_and_invitee_email_required' }, 400);
  }

  const inviteeEmail = body.inviteeEmail.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inviteeEmail)) return json({ error: 'invite_email_invalid' }, 400);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: invite, error: inviteError } = await supabase.rpc('create_household_email_invite', {
    target_household_id: body.householdId,
    target_invitee_email: inviteeEmail,
  });
  if (inviteError || !invite?.[0]) return json({ error: inviteError?.message ?? 'invite_creation_failed' }, 400);

  const row = invite[0] as { invite_id: string; invite_token: string; expires_at: string };
  const inviteUrl = `${appUrl}/?invite=${encodeURIComponent(row.invite_token)}`;
  const safeUrl = escapeHtml(inviteUrl);
  let emailResponse: Response;
  try {
    emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [inviteeEmail],
        subject: 'You have been invited to a Freezer Memo household',
        text: `You have been invited to share a Freezer Memo household. Open this link to accept the invitation: ${inviteUrl}\n\nThis invitation expires on ${row.expires_at}.`,
        html: `<p>You have been invited to share a Freezer Memo household.</p><p><a href="${safeUrl}">Accept the household invitation</a></p><p>This invitation expires on ${escapeHtml(row.expires_at)}.</p>`,
      }),
    });
  } catch {
    await supabase.rpc('revoke_household_invite', { target_invite_id: row.invite_id });
    return json({ error: 'invite_email_failed' }, 502);
  }
  if (!emailResponse.ok) {
    await supabase.rpc('revoke_household_invite', { target_invite_id: row.invite_id });
    return json({ error: 'invite_email_failed' }, 502);
  }
  return json({ inviteId: row.invite_id, expiresAt: row.expires_at });
});
