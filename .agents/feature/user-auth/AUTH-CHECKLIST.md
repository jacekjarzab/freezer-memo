# Email + Password Authentication

## Goal

Replace repeated magic-link sign-in with an in-app email and password account flow. Use email only for initial account confirmation and password recovery, while allowing subsequent sign-in directly inside the installed PWA.

## Product Decisions

- [x] Normal sign-in uses email + password.
- [x] New accounts require email confirmation before the first sign-in.
- [x] Existing magic-link users can establish a password through recovery.
- [x] Supabase sessions remain persistent in the browser/PWA storage.
- [x] Password recovery continues to use a one-time email link.
- [x] Confirmation and recovery links use the production origin.
- [x] The UI explains that email links may open the system browser instead of the installed PWA.
- [x] Do not claim that a web PWA can reliably force external links into its installed instance.

## Implementation Checklist

### Auth Contract

- [x] Add password signup to the auth port and Supabase adapter.
- [x] Add email/password sign-in to the auth port and Supabase adapter.
- [x] Add password recovery email to the auth port and Supabase adapter.
- [x] Add password update after recovery to the auth port and Supabase adapter.
- [x] Subscribe to Supabase auth state changes so the UI updates after confirmation callbacks.
- [x] Classify common auth failures without exposing secrets.

### Account UI

- [x] Replace the magic-link-only form with sign-in and create-account modes.
- [x] Add email, password, and confirm-password validation.
- [x] Add loading and disabled states for all auth actions.
- [x] Show a confirmation-required state after signup when Supabase returns no session.
- [x] Alert when signup returns Supabase's existing-account response and direct the user to sign in or recover the password.
- [x] Add forgot-password and set-new-password states.
- [x] Preserve existing household creation, invite, migration, and sign-out behavior.
- [x] Add an explicit browser/PWA return instruction for confirmation and recovery links.

### PWA and Supabase Configuration

- [x] Keep the production origin in Supabase Site URL and Redirect URLs.
- [x] Keep localhost redirect URLs for development.
- [x] Confirm Email provider and email confirmation are enabled.
- [x] Configure production SMTP or verify the project email service limits.
- [ ] Verify confirmation and recovery callbacks in browser and installed PWA contexts.

### Localization and Documentation

- [x] Add English auth strings.
- [x] Add Polish auth strings.
- [x] Update shared-household feature documentation.
- [x] Update `.agents/backlog-checklist.md`.

### Verification

- [x] Test adapter behavior for signup, sign-in, recovery, and password update.
- [x] Test confirmed and unconfirmed signup responses.
- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [ ] Perform production smoke testing on browser and installed PWA.

## Known Platform Limitation

Email links opened from a mail app are handled by the operating system browser. A static web PWA cannot universally force those links to reopen the installed standalone PWA, especially on iOS. The account should therefore become confirmed in the browser, after which the user signs in inside the PWA with email and password.
