# FarmTown Discord Setup

Idempotent [discord.js v14](https://discord.js.org/) script that builds out the
FarmTown launch server from `FARMTOWN_DISCORD_SERVER_SETUP.md`.

It creates categories, channels and roles, applies permission overwrites, and
posts + pins the canned launch content. It is **safe to re-run**: everything is
checked for existence before being created, overwrites are applied
deterministically, and content is only posted when an identical pinned message
isn't already present.

## What it builds

By default it builds the spec's **Best Minimal Launch Version**:

```
📌 INFORMATION   📣 announcements · 📋 rules · 👋 welcome · 🔗 official-links · 🎮 how-to-play
💬 COMMUNITY     💬 general · 🤝 friend-farms · 📸 screenshots-clips · 💡 suggestions
🧪 GAME TESTING  🐛 bug-reports · 🟢 known-issues
⭐ ECONOMY       ⭐ stars · 🏆 farmers-pool · 📊 token-chat · ⚠️ scam-alerts
🤖 SUPPORT       ❓ faq · 🎫 open-a-ticket
🔒 TEAM ONLY     team-chat · launch-room · bug-triage · mod-log
```

Set `PHASE_2 = true` at the top of `discord-setup.js` to also create the
remaining full-structure channels (updates, bug-fixes, farm-chat, memes,
test-build, mobile-feedback, weed-crop, buys, whale-alerts, content-plan,
bot-setup) and the optional future roles.

### Permissions applied

- **Read-only for `@everyone`** (view + read history, no send) on
  `announcements`, `rules`, `welcome`, `official-links`, `how-to-play`,
  `known-issues` (and `updates`, `bug-fixes`, `buys`, `whale-alerts` in Phase 2).
- **TEAM ONLY** category hidden from `@everyone`, visible to the staff roles
  (Founder, Admin, Moderator, Developer, Community Manager).
- **Muted** role: send-messages denied via overwrites on every category and
  channel.

### Pinned content

`rules`, `welcome`, `official-links` (+ safety reminder), `how-to-play`, `faq`,
the `friend-farms` format, the `bug-reports` format, the stars / farmers-pool /
token-chat / scam-alerts explanations, and the safety reminder in `general`,
`token-chat`, and `official-links`. URLs and the token contract address are left
as `TBD`/placeholder.

## Run

```bash
npm install
export DISCORD_BOT_TOKEN="your-bot-token"
export GUILD_ID="your-guild-id"
npm run setup
```

The bot must already be in the server with the **Administrator** permission.

## Notes

- **Carl-bot, Ticket Tool and Wick are not touched** — configure those manually.
  The `open-a-ticket` channel is created as an empty placeholder.
- Discord has no API to auto-assign a role to new joiners, so the **Farmer**
  role is created with baseline member permissions; set it as the default member
  role in **Server Settings → Onboarding → Default Channels & Roles**.
