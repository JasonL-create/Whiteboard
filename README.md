# TurnFlow v51 — Supabase connected build

This build keeps the v50 interface and adds:
- Supabase email/password authentication
- Shared Northwoods workspace
- Persistent shared Projects, Keys, Lockbox Inventory, Archive and Configure state
- Realtime updates between signed-in browsers
- Workspace join code for additional office users
- LocalStorage remains as an offline/local fallback during this migration stage

## REQUIRED before deploying v51
Run `turnflow-supabase-migration-v2.sql` in the same Supabase project's SQL Editor.

## First user
1. Deploy v51.
2. Create/sign into your TurnFlow account.
3. Click **Create Northwoods Workspace**.
4. The current browser's v50 data becomes the initial shared workspace if the database is empty.

## Additional users
1. They create/sign into their own TurnFlow account.
2. They enter the workspace code from the organization.
3. They then see the same shared TurnFlow data.

This is a migration bridge. The existing v50 card model is intentionally preserved while shared storage/authentication are proven. The normalized tables created in schema v1 remain the long-term data model for templates, reporting and granular audit history.
