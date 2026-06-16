# FarmTown Discord Setup

Tooling to build and run the FarmTown launch community on Discord.

- **`discord-setup.js`** — idempotent [discord.js v14](https://discord.js.org/)
  script that builds the server (categories, channels, roles, permissions) and
  posts/pins all content as rich embeds. Safe to re-run; it converges to the
  desired state.
- **`engagement-bot.js`** — small persistent bot that powers the self-role
  buttons, auto-assigns the default member role on join, and welcomes new
  members.

## 1. Build the server (`discord-setup.js`)

```bash
npm install
export DISCORD_BOT_TOKEN="your-bot-token"
export GUILD_ID="your-guild-id"
npm run setup
```

The bot must already be in the server with the **Administrator** permission.

### Phases

`PHASE_2` at the top of `discord-setup.js`:

- `false` — the spec's **Best Minimal Launch Version**.
- `true`  — adds the remaining full-structure channels (updates, bug-fixes,
  farm-chat, memes, test-build, mobile-feedback, weed-crop, buys, whale-alerts,
  content-plan, bot-setup) and the optional future roles.

### Branding assets (logo + banner)

Set these so the script applies the server icon and embeds the banner. Either
edit `ASSETS` in `discord-setup.js` or pass env vars:

```bash
export LOGO_URL="https://.../farmtown-logo.png"     # square — server icon + thumbnails
export BANNER_URL="https://.../farmtown-banner.png" # wide  — welcome + announcement
npm run setup
```

Easiest way to get URLs: drop each image into any Discord channel, then
right-click → **Copy Link**. Re-running after setting them updates the existing
embeds in place (no duplicates). `FORCE_ICON = true` re-uploads the icon even if
one is already set.

### What it does

- Creates categories → channels → roles in spec order.
- **Read-only** info channels (view + history, no send) for announcements,
  rules, welcome, get-roles, official-links, how-to-play, known-issues, updates,
  bug-fixes, buys, whale-alerts.
- **TEAM ONLY** category hidden from `@everyone`, visible to staff roles.
- **Muted** role denied send via overwrites on every channel/category.
- Posts + pins all content as themed **embeds** (FAQ as Q&A fields, formats in
  code blocks, clickable channel mentions, branded footer). URLs/CA are `TBD`.
- Posts a **launch announcement** in `#announcements` and a **self-roles**
  button message in `#get-roles`.
- Sets the server icon, routes native join messages to `#general`, and clears
  any stale bot nickname so the current bot username shows.

## 2. Self-roles + auto-role

Two ways to power the `#get-roles` panel and auto-assign the Farmer role on
join, controlled by `SELF_ROLE_MODE` in `discord-setup.js`:

### Option A — Carl-bot (no hosting; `SELF_ROLE_MODE = 'carlbot'`)

The setup script posts the panel with emoji reactions already added. In the
[Carl-bot dashboard](https://carl.gg) for your server:

1. **Reaction Roles → Reaction Roles** → "Create with existing message", paste
   the `#get-roles` message link, and map each emoji to its role
   (🔔 Announcement Ping, 🆕 Update Ping, 🎉 Event Ping, 🧪 Playtester,
   📱 Mobile Tester).
2. **Autorole** → add **Farmer** so every new member gets it automatically.
3. *(optional)* **Greeting** → enable a welcome message.

No bot to host — Carl-bot is always on.

### Option B — custom bot (`SELF_ROLE_MODE = 'bot'`)

Use the included `engagement-bot.js` instead (button-based roles + auto-role +
welcome). It must be hosted continuously — see below.

## 3. Run the engagement bot (`engagement-bot.js`)

This is a **persistent** process — run it on any always-on host (a small VPS,
Railway, Fly.io, your game backend, etc.). It handles what a one-shot script
can't:

- **Self-role buttons** — toggles opt-in ping/interest roles (Announcement
  Ping, Update Ping, Event Ping, Playtester, Mobile Tester) when members click
  the buttons in `#get-roles`. Works with only the Guilds intent.
- **Auto-role on join** — assigns the **Farmer** default member role to new
  members (this is how Farmer becomes a true default role).
- **Welcome greeting** — posts a welcome embed mentioning the new member.

```bash
# Buttons only (no privileged intents needed):
npm run bot

# Buttons + auto-role + welcome (requires the privileged Server Members Intent,
# enabled in the Developer Portal → Bot → Privileged Gateway Intents):
WELCOME_AUTOROLE=1 npm run bot

# Smoke-test wiring and exit:
npm run bot:selftest
```

Env vars: `WELCOME_AUTOROLE` (`1` to enable join automation), `FARMER_ROLE`
(default `Farmer`), `WELCOME_CHANNEL` (default `💬・general`), `SELFTEST`.

### Hosting the bot 24/7

The bot must stay running for the buttons and join automation to work. Pick one:

**Docker / VPS (simplest):**

```bash
cp .env.example .env   # fill in DISCORD_BOT_TOKEN + GUILD_ID (and WELCOME_AUTOROLE=1 if wanted)
docker compose up -d   # restarts automatically; `docker compose logs -f` to watch
```

**Railway:** push the repo, create a project from it. `railway.json` builds the
`Dockerfile` and runs the bot. Add `DISCORD_BOT_TOKEN`, `GUILD_ID` (and
optionally `WELCOME_AUTOROLE=1`) as service variables.

**Fly.io:**

```bash
fly launch --no-deploy            # accept the included fly.toml
fly secrets set DISCORD_BOT_TOKEN=... GUILD_ID=...
fly secrets set WELCOME_AUTOROLE=1   # optional (needs Server Members Intent)
fly deploy
```

All three run `node engagement-bot.js` (also the `npm start` default) and
restart on failure. Enable the **Server Members Intent** in the Developer Portal
before setting `WELCOME_AUTOROLE=1`.

## Notes

- **Carl-bot / Ticket Tool / Wick are not touched** — configure those manually.
  The `open-a-ticket` channel is created as an empty placeholder.
- For the self-role buttons to work, the bot's role must sit **above** the
  self-assignable roles in Server Settings → Roles (it does by default, since
  the bot created them).
