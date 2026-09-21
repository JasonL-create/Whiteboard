# TurnFlow v55 — Supabase connected build

This build keeps the v50 interface and adds:
- Supabase email/password authentication
- Shared Northwoods workspace
- Persistent shared Projects, Keys, Lockbox Inventory, Archive and Configure state
- Realtime updates between signed-in browsers
- Workspace join code for additional office users
- LocalStorage remains as an offline/local fallback during this migration stage

## REQUIRED before deploying v52
Run `turnflow-supabase-migration-v2.sql` in the same Supabase project's SQL Editor.

## First user
1. Deploy v52.
2. Create/sign into your TurnFlow account.
3. Click **Create Northwoods Workspace**.
4. The current browser's v50 data becomes the initial shared workspace if the database is empty.

## Additional users
1. They create/sign into their own TurnFlow account.
2. They enter the workspace code from the organization.
3. They then see the same shared TurnFlow data.

This is a migration bridge. The existing v50 card model is intentionally preserved while shared storage/authentication are proven. The normalized tables created in schema v1 remain the long-term data model for templates, reporting and granular audit history.

## v52 fix
Fixes the browser startup error `Cannot access 'cloudReady' before initialization` that prevented the authentication handlers from loading. No additional Supabase SQL migration is required after v2.

## v53 fix
Fixes project cards not opening after the v51/v52 string-safe ID migration. Existing numeric local project IDs and future string/UUID IDs now compare consistently. No Supabase SQL changes required.

## v54 fixes
- Removes the brief login-screen flash for returning authenticated sessions.
- Strengthens Supabase realtime handling by subscribing to workspace-state INSERT/UPDATE events and filtering the organization client-side.
- Adds a 2-second shared-state fallback check while the page is visible, so another open browser receives changes even if a websocket subscription is delayed or blocked.
- No additional Supabase SQL migration is required.

## v55 fixes
- Fixes live sync when two browser windows are signed into the SAME TurnFlow account. v54 incorrectly ignored realtime events whose `updated_by` matched the current user, which also ignored changes from that user's other browser.
- Poll fallback now compares Supabase row `updated_at` instead of a client-generated snapshot timestamp.
- Authentication uses an explicit booting state so neither the login screen nor app is painted until Supabase has resolved the stored session.
- No SQL changes required.
