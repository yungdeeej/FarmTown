# FarmTown Discord — maintainer notes

## Hard rules / preferences (do NOT violate)

- **NEVER deny or turn off the "Add Reactions" permission for `@everyone`** on any
  channel. It breaks reactions / reaction-roles and causes bugs. Always keep
  `AddReactions: true` for `@everyone` (including read-only and reaction-role
  channels). Members clicking reactions is required.

## Project layout
- `discord-setup.js` — idempotent server builder (categories, channels, roles,
  permissions, pinned embeds, AutoMod, invites, languages, role-gated channels).
  Safe to re-run.
- `engagement-bot.js` — persistent bot: self-role buttons, auto-role on join,
  welcome, auto-responder (P2E / pool), impersonation guard.
- `linkme/` — self-hosted link-in-bio page.
- Run setup with `DISCORD_BOT_TOKEN` + `GUILD_ID` env vars: `npm run setup`.

## Conventions
- Role-gated channels use `roleOnly: '<RoleName>'` (or `langRole`) in STRUCTURE —
  hidden from everyone incl. verified Farmers; only that role (+ staff) see it.
- Reaction roles are driven by Carl-bot (the maintainer binds emoji→role in the
  Carl-bot dashboard). `SELF_ROLE_MODE = 'carlbot'`.
