# TurnFlow v62 — Supabase connected build

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

## v56 fix
Remote/shared data updates no longer clear each browser's local open-card state. An open Project or Key card stays open while another browser updates shared data. If the underlying record genuinely disappears from the shared state, its open state is cleared. No SQL changes required.

## v57 synchronization/UI-state fix
The delivered v56 still contained the old `openId=null; keyOpenId=null` reset inside `applyCloudState`; this is now removed and verified in the final file.

Each browser tab now has a unique client ID. Supabase echoes from the same tab are ignored, while updates from another browser (even using the same employee account) are applied. Remote updates preserve the receiving browser's open Project/Key card unless that record genuinely no longer exists.

No SQL changes required.

## v58 remote-render fix
The supplied screen recording showed the receiving browser collapsing its card exactly when `Updated from shared workspace` appeared. v58 now reads the actually rendered open Project/Key card from the DOM before applying shared data and explicitly restores that browser-local UI state before rerendering. No SQL changes required.

## v59 production-safety hardening
- Supabase is authoritative whenever a workspace_state row already exists.
- Existing localStorage can no longer automatically bootstrap/overwrite an existing shared workspace after a deployment or reload.
- localStorage remains only a local cache/recovery copy.
- The local-to-cloud bootstrap path runs only when the organization has NO workspace_state row at all.
- Saves use optimistic concurrency against the database row's `updated_at`. If another browser has saved a newer version first, TurnFlow pulls the newer server state instead of overwriting it with a stale full-workspace snapshot.
- Shared snapshots carry a monotonic `serverVersion`.
- Existing realtime/open-card behavior from v58 is retained.
- No SQL changes required.

Important: this protects deployment/reload from reverting shared data and prevents a stale whole-workspace save from overwriting a newer whole-workspace save. The next architectural migration should move individual Projects/Keys/transactions into the normalized Supabase tables so simultaneous edits can merge at record/field level instead of resolving at whole-workspace level.

## v60 normalized shared-data migration
TurnFlow now migrates the existing workspace snapshot into the normalized Supabase tables created by schema v1, then uses those tables as the live source of truth:

- properties
- projects
- key_tags
- lockboxes
- key_transactions
- lockbox_transactions

The migration runs only when those normalized tables are empty for the organization. Existing v59 `workspace_state` is retained as a recovery snapshot and is not deleted.

After migration, normal edits no longer save the entire office workspace. TurnFlow compares individual records and writes only changed/new Project or Key records, while lockbox/key movements append transaction history. A change to one Project therefore does not rewrite unrelated Projects or Keys.

No additional SQL migration is required because schema v1 already created these tables, RLS policies, indexes, update triggers, and realtime publication.

Keep v59 ZIP as the pre-normalization recovery checkpoint.

## v61 realtime + Key Notes fix
- Restores realtime updates on the normalized Supabase tables. INSERT/UPDATE/DELETE events from properties, projects, key_tags, lockboxes, key_transactions, and lockbox_transactions trigger a debounced authoritative refresh.
- Keeps a 10-second polling fallback in case a realtime event is missed.
- Fixes the v60 refresh comparison bug that refreshed internal baselines before deciding whether the UI needed to rerender.
- Key Notes now persist on input, change, and blur.
- Most importantly, edits made while a previous asynchronous normalized save is still running are queued for a second save pass instead of being dropped. This was capable of reverting the last characters/last Key Note change on refresh.
- Key row ID matching is string-safe after UUID migration.
- No SQL changes required.

## v62 Keys normalized-sharing repair
- Keys now explicitly mark their individual key_tag record dirty whenever a Key action or Key Note changes.
- Key Notes force an immediate normalized save when the user leaves the Notes field, so reload/navigation cannot outrun the debounce.
- Realtime refreshes defer while a local Key record is dirty, preventing incoming refreshes from replacing an unsaved Key edit.
- Startup now reconciles missing Key Tags from the retained v59 workspace recovery snapshot. This specifically repairs a possible partial v60 migration where Projects were created before Key Tags and later startups skipped the all-empty migration condition.
- Existing key tags are matched by tag number and are not duplicated.
- No SQL changes required.
