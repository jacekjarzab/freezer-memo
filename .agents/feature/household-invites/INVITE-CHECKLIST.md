# Automatic Household Email Invites

## Goal

Let a household owner invite a person by email. The recipient receives a secure, expiring link, signs in or creates an account, and the app accepts the invitation for that email.

## Security Decisions

- [x] The invite is bound to the normalized recipient email.
- [x] Invite tokens are generated and hashed by a security-definer RPC.
- [x] Email delivery runs in a Supabase Edge Function, never in browser code.
- [x] Service/email provider secrets stay in Edge Function secrets.
- [x] Invite acceptance verifies the authenticated email matches the invite.
- [x] Remove the obsolete manual token input, accept button, and token-generation button from the household UI.

## Implementation Checklist

### Database

- [x] Add nullable recipient email to household invites.
- [x] Add an owner-only RPC for recipient-bound invite creation.
- [x] Enforce recipient email matching during acceptance.
- [x] Preserve expiry, revocation, one-household, and membership checks.
- [x] Show member-removal controls only to the current household owner.

### Email Delivery

- [x] Add the `send-household-invite` Edge Function.
- [x] Authenticate the caller before creating the invite.
- [x] Send a plain-text and HTML email with the expiring invite link.
- [x] Configure `RESEND_API_KEY`, `INVITE_FROM_EMAIL`, and `APP_URL` secrets.
- [x] Deploy the function with JWT verification enabled.

### PWA Flow

- [x] Add owner email input and automatic-send action.
- [x] Preserve invite token through signup and email confirmation redirects.
- [x] Pre-fill invite acceptance from an invite URL.
- [x] Auto-accept after the recipient is authenticated.
- [x] Explain that email links may open the system browser instead of the installed PWA.
- [x] Accept invite links automatically after authentication without exposing the token input.

### Verification

- [x] Test RPC authorization, expiry, revocation, email matching, and duplicate membership.
- [x] Test Edge Function validation and provider failures.
- [x] Test signup/login/confirmation with an invite URL.
- [x] Test browser and installed-PWA handoff.
- [x] Run `npm test`, `npm run lint`, and `npm run build`.
- [x] Apply the migration and deploy the Edge Function in Supabase.
