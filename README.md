# TurnFlow v73 — Supabase connected build

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

## v63 blank-screen startup fix
v62 introduced normalized Key dirty tracking inside `saveKeys()`, but the legacy app calls
`saveKeys()` once during initial page startup before the later Supabase variables are initialized.
That caused a startup exception when `dirtyKeyIds.add(...)` was reached.

v63 gates all normalized Key tracking behind `normalizedReady`. The initial legacy startup save
uses the existing cloud bootstrap path; after authentication/normalization completes, Key edits use
the v62 record-level dirty tracking and persistence fixes.

No SQL changes required.

## v64 Keys stale-state/race fix
The symptom where the first Key Note change propagated but later changes reverted was caused by
the normalized save routine re-fetching and applying the server immediately after every async save.
If the user typed again while that save was in flight, the older server result could replace the
newer local text and reset the Key baseline.

v64:
- snapshots Project/Key/Lockbox data before each async save;
- never applies a post-save server reload over newer local edits;
- tracks a local edit generation across in-flight saves;
- only clears a Key's dirty flag if the live Key still exactly matches the version written;
- queues another save if a newer edit occurred during the previous save;
- requires a key_tags UPDATE to return the updated row, so a silent zero-row update is treated as an error;
- keeps realtime refreshes deferred while a local save is queued/in flight.
No SQL changes required.

## v65 Keys authoritative-data refactor
This is intentionally not another stale-state patch.

Audit finding:
- Projects effectively had one normalized current-state source (`projects`).
- Keys still had multiple competing live/recovery paths: `key_tags`, transaction-derived UI,
  localStorage cache, and `workspace_state` recovery reconciliation.
- The recovery reconciliation also ran on every normalized startup, so old workspace-state Key
  records could continue participating after migration.

Refactor:
- After normalized startup, current Key state comes only from normalized Supabase Key tables.
- `workspace_state` Keys/Lockboxes are migration/recovery input only and cannot replace live Keys.
- Removed recurring startup Key reconciliation from the old workspace snapshot.
- Added a dedicated `fetchSharedKeys -> mapSharedKeys -> refreshSharedKeys` path.
- Key realtime events refresh Keys only.
- Key polling refreshes the same authoritative Key tables.
- localStorage remains cache only after normalized startup.
- Transactions remain history; current checkout/missing state comes from `key_tags`.
- Lockbox current assignment comes from `lockboxes`; lockbox transactions remain history.
No SQL changes required.

## v66 one-writer Key refactor
The new observation was decisive: the first edit on a newly touched Key propagated, while later edits
to that same card did not. The Key row still had two write mechanisms: direct UI state fed the generic
normalized batch saver, while realtime/polling refreshed the same row.

v66 removes that ambiguity for physical Key Tags:
- Key Notes write directly to exactly one `key_tags` row on change/blur and verify the returned row.
- Key checkout, return, missing/found, tag/address edits, and new Key Tags use the same direct writer.
- The generic normalized batch saver no longer writes `key_tags`.
- Key transaction history is appended separately after the current-state row succeeds.
- localStorage is only a typing cache; it is not a database writer.
- Key realtime still reads only normalized Key tables.
This gives physical Keys one current-state reader and one current-state writer, matching the Projects
model much more closely. Lockbox actions remain on their existing normalized path for now.
No SQL changes required.

## v67 direct Lockbox actions
The LB button was still using the older generic `saveKeys()`/batch path even though physical Keys had
already moved to direct row writes in v66. LB checkout/return now use one direct `lockboxes` writer,
append `lockbox_transactions` history only after the current-state write succeeds, and refresh from
the authoritative normalized tables. Checkout uses a conditional `status = available` update so two
browsers cannot assign the same lockbox. LB missing/found also writes directly.
No SQL changes required.

## v68 Key Log importer
The preview worked, but the final commit still used the old generic `saveKeys()` path. v68 changes only
the importer: clean CSV rows insert directly into authoritative `key_tags`, confirmed by Supabase;
import history is separate; Keys reload from shared tables; completion reports actual imported,
skipped, and failed counts. No SQL changes required.

## v69 compact sticky Projects/Keys controls
- Global Search moved into the top navigation and now always says `Search`.
- Removed descriptive subtitles from Projects and Keys.
- Projects and Keys each use one compact row: page title, filters/sort, and Add action.
- Add action stays at the far right.
- The page control row is sticky beneath the global navigation so records scroll underneath both.
- Projects and Keys share the same layout pattern.
- No data, Supabase, Key, Lockbox, or import behavior changed.

## v70 Available Key Tags + assignment history + project guard
- Key Tags are permanent inventory and may have `property_id = NULL`.
- Unassigned cards display `AVAILABLE`.
- CSV rows with a Tag but no property now import as valid Available inventory.
- + Add Key Tag permits an empty property.
- Editing a Key Tag can release it to Available or assign/change its property.
- Property assignment/release/change is appended to permanent Key transaction history.
- Starting a Turn/Listing checks for a Key Tag. If none is assigned, the user must select an
  AVAILABLE tag before the project is created.
- Fixed the sticky Projects/Keys control row using the actual desktop/mobile shell heights.
No SQL migration is required: schema v1 already defines `key_tags.property_id` as nullable.

## v71 UI cleanup
Aligned Projects/Keys controls, removed dropdown arrows while retaining hover/click menus, and replaced the main Key/Lockbox/project-key browser prompts with TurnFlow-styled dialogs. No schema changes.

## v72 compact fixed control row
- Projects/Keys work controls reduced substantially in visual size.
- Second row changed from sticky to hard-fixed directly beneath the desktop header.
- Header and work-control surfaces are fully opaque; backdrop transparency is disabled.
- Board receives fixed-row clearance so records scroll underneath rather than shifting the controls.
- No data, Supabase, Key, Lockbox, project, or dialog behavior changed.

## v73 fixed-shell geometry correction
The v72 offset incorrectly treated screenshot pixels as CSS pixels. v73 fixes the full shell itself at the viewport top and pins the compact control row at the actual 186px desktop shell height. Both layers are fully opaque. No app/data logic changed.

## v75 polish
- Archive can no longer remain visually selected while Keys is active; entering Keys also clears the archived filter.
- Collapsed Key cards now match Project card height.
- Key Location values such as Office use normal font weight.
- Main search bar is simplified to a clean text-only Search field with no magnifying-glass graphic.
- No database/schema changes.

## v76 desktop width correction
- Increased desktop content ceiling to 1680px.
- Preserves responsive 28–64px side margins rather than stretching edge-to-edge.
- Header, navigation, fixed Projects/Keys controls, board headings, and cards share the same horizontal alignment.
- Mobile keeps compact 14px gutters.
- No data, Supabase, project, key, lockbox, sync, or workflow logic changed.
