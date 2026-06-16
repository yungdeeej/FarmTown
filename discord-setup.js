#!/usr/bin/env node
/**
 * FarmTown Discord server builder.
 *
 * Idempotent setup script for discord.js v14. Safe to re-run: it checks for
 * existing categories, channels and roles before creating anything, applies
 * permission overwrites deterministically, and posts/pins canned content only
 * when an identical pinned message is not already present.
 *
 * Builds the "Best Minimal Launch Version" from FARMTOWN_DISCORD_SERVER_SETUP.md.
 * Set PHASE_2 = true to additionally create the remaining full-structure
 * channels described in the spec's "Suggested Final Channel List".
 *
 * Required env:
 *   DISCORD_BOT_TOKEN  - bot token (bot must be in the guild with Administrator)
 *   GUILD_ID           - target guild id
 *
 * This script never touches Carl-bot, Ticket Tool or Wick configuration. It
 * only creates the open-a-ticket channel as a placeholder; the ticket bot is
 * configured manually.
 */

'use strict';

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');

const Flags = PermissionsBitField.Flags;

// ---------------------------------------------------------------------------
// Toggles
// ---------------------------------------------------------------------------

// false -> minimal launch structure only.
// true  -> also create the remaining full-structure channels/roles.
const PHASE_2 = false;

const REASON = 'FarmTown automated server setup';

// ---------------------------------------------------------------------------
// Canned content (from the spec). TBD placeholders left for URLs / contract.
// ---------------------------------------------------------------------------

const CONTENT = {
  rules: `Welcome to FarmTown.

Rules:

1. Be respectful.
2. No scams, fake links, fake airdrops, or impersonation.
3. Admins and moderators will never DM you first.
4. Never share your seed phrase or private keys.
5. Only trust links posted in 🔗・official-links.
6. No spam, raids, hate speech, or harassment.
7. No financial advice.
8. Keep bug reports and support requests in the correct channels.
9. Do not post wallet-draining links or suspicious downloads.
10. Breaking these rules can result in a timeout or ban.`,

  welcome: `Welcome to FarmTown 🌾

FarmTown is a browser-native multiplayer farming game where players grow crops, visit farms, earn Gold, collect Stars, and compete for Farmer's Pool rewards.

Start here:

1. Read 📋・rules
2. Check 🔗・official-links
3. Learn the basics in 🎮・how-to-play
4. Join the game and start your farm
5. Share your farm in 🤝・friend-farms

Important:
Only trust links in 🔗・official-links.
Admins will never DM you first.
Never share your seed phrase.`,

  officialLinks: `Official FarmTown Links

Game:
https://play.YOURDOMAIN.com

Website:
https://YOURDOMAIN.com

Twitter/X:
TBD

Token Contract Address:
TBD

Realtime Backend:
Not needed for users.

Warning:
Only trust links in this channel.
Admins will never DM you first.
Never enter your seed phrase anywhere.`,

  howToPlay: `How To Play FarmTown

1. Connect Phantom
2. Sign in with your wallet
3. Start your farm
4. Open the Farm Menu
5. Buy seeds from Store
6. Open Pouch and select a seed
7. Use Hoe to prepare soil
8. Plant crops
9. Wait for crops to grow
10. Harvest crops for Gold and XP
11. Use Gold to expand your farm
12. Visit friend farms
13. Collect Falling Stars when they appear
14. Use Stars for premium gameplay
15. Sacrifice resources in Farmer's Pool to compete for rewards

Reminder:
FarmTown is in active development. Report bugs in 🐛・bug-reports.`,

  friendFarms: `Share your farm here.

Format:

Farm name:
Farm link:
What you want feedback on:

Example:
Farm name: Samosa Ranch
Farm link: https://play.YOURDOMAIN.com/?farm=your-farm-slug
Feedback: Tell me if my farm layout looks good.`,

  suggestions: `When suggesting a feature, please include:

1. What should be added?
2. Why would it make FarmTown better?
3. Is it gameplay, UI, economy, or social?
4. Is it urgent or future polish?`,

  bugReport: `Bug Report

What happened:

What did you expect:

Device/browser:

Wallet:

Screenshot/video:

Steps to reproduce:
1.
2.
3.`,

  knownIssues: `Known Issues

- Mobile UI polish is still ongoing.
- Some UI text may be cramped on small screens.
- If a farm does not load, refresh once and report it in 🐛・bug-reports.`,

  testBuild: `Current FarmTown Test Build

Game:
https://play.YOURDOMAIN.com

Please test:

1. Wallet login
2. Starting your farm
3. Buying seeds
4. Planting and harvesting
5. Visiting friend farms
6. Falling Stars
7. Stars store
8. Weed
9. Farmer's Pool
10. Mobile layout

Report bugs in 🐛・bug-reports.`,

  mobileFeedback: `Mobile Feedback

Device:
Browser:
Screenshot:
What felt hard to use:
What should be bigger/smaller:`,

  stars: `Stars are FarmTown's premium in-game currency.

Stars can be used for:

- Crop boosts
- Premium gameplay
- Weed seeds
- Future cosmetics/items

Stars are bought with the FarmTown token.
There are no token payouts from Stars.
There is no Stars-to-token withdrawal.`,

  weed: `Weed is FarmTown's premium crop.

Current design:

- Bought with Stars
- 30 Stars per Weed seed
- 5 hour grow time
- High Gold output
- Premium crop risk/reward`,

  farmersPool: `Farmer's Pool lets players sacrifice farm progress to compete for a share of the reward pool.

Players can sacrifice:

- Gold
- Farm Points
- Levels

The more you sacrifice compared to everyone else, the larger your share of the pool.

Reward payouts are handled by the game backend.`,

  tokenWarning: `Token discussion is allowed here, but:

- No financial advice
- No fake links
- No fake contract addresses
- No impersonation
- Only trust the CA in 🔗・official-links`,

  scamAlerts: `Scam Alert Rules

Post here if you see:

- Fake FarmTown links
- Fake token contracts
- Fake support DMs
- Fake airdrops
- Wallet-draining links
- Impersonators

Do not click suspicious links.
Only trust 🔗・official-links.`,

  faq: `FAQ

Q: Do I need Phantom?
A: Yes. FarmTown uses wallet auth.

Q: Can I play without a wallet?
A: No, wallet auth is required for gameplay.

Q: Where is the real game link?
A: Check 🔗・official-links.

Q: Where is the real token CA?
A: Check 🔗・official-links.

Q: Can I withdraw Stars for tokens?
A: No. Stars are in-game premium currency only.

Q: Can I withdraw Gold for tokens?
A: No. There is no Gold-to-token withdrawal.

Q: How do I buy Stars?
A: Open the Stars panel in game and follow the Phantom payment flow.

Q: What is Weed?
A: Weed is a premium crop bought with Stars.

Q: What is Farmer's Pool?
A: A competitive reward pool where players sacrifice resources for a share of the pool.

Q: I found a bug. Where do I report it?
A: Use 🐛・bug-reports.`,

  safety: `Safety Reminder

Only trust links posted in 🔗・official-links.
Admins and moderators will never DM you first.
Never share your seed phrase.
Never connect your wallet to links sent in DMs.
There is no secret mint, no private airdrop, and no support wallet.`,
};

// Trim everything once so equality checks against re-fetched messages are stable.
for (const k of Object.keys(CONTENT)) CONTENT[k] = CONTENT[k].trim();

// ---------------------------------------------------------------------------
// Structure definition (full spec order; `phase` controls minimal vs full)
// ---------------------------------------------------------------------------
//
// Per channel flags:
//   readOnly : @everyone may view + read history but not send
//   posts    : array of CONTENT keys to post & pin (in order)
//
// The TEAM ONLY category is marked teamOnly: hidden from @everyone, visible
// to the staff roles. Its child channels inherit that via per-channel
// overwrites applied in the permissions pass.

const STAFF_ROLE_NAMES = ['Founder', 'Admin', 'Moderator', 'Developer', 'Community Manager'];

const STRUCTURE = [
  {
    name: '📌 INFORMATION',
    channels: [
      { name: '📣・announcements', phase: 1, readOnly: true },
      { name: '📋・rules', phase: 1, readOnly: true, posts: ['rules'] },
      { name: '👋・welcome', phase: 1, readOnly: true, posts: ['welcome'] },
      { name: '📰・updates', phase: 2, readOnly: true },
      { name: '🐞・bug-fixes', phase: 2, readOnly: true },
      { name: '🔗・official-links', phase: 1, readOnly: true, posts: ['officialLinks', 'safety'] },
      { name: '🎮・how-to-play', phase: 1, readOnly: true, posts: ['howToPlay'] },
    ],
  },
  {
    name: '💬 COMMUNITY',
    channels: [
      { name: '💬・general', phase: 1, posts: ['safety'] },
      { name: '🌾・farm-chat', phase: 2 },
      { name: '🤝・friend-farms', phase: 1, posts: ['friendFarms'] },
      { name: '📸・screenshots-clips', phase: 1 },
      { name: '💡・suggestions', phase: 1, posts: ['suggestions'] },
      { name: '😂・memes', phase: 2 },
    ],
  },
  {
    name: '🧪 GAME TESTING',
    channels: [
      { name: '🧪・test-build', phase: 2, posts: ['testBuild'] },
      { name: '🐛・bug-reports', phase: 1, posts: ['bugReport'] },
      { name: '🟢・known-issues', phase: 1, readOnly: true, posts: ['knownIssues'] },
      { name: '📱・mobile-feedback', phase: 2, posts: ['mobileFeedback'] },
    ],
  },
  {
    name: '⭐ ECONOMY & TOKEN',
    channels: [
      { name: '⭐・stars', phase: 1, posts: ['stars'] },
      { name: '🌿・weed-crop', phase: 2, posts: ['weed'] },
      { name: '🏆・farmers-pool', phase: 1, posts: ['farmersPool'] },
      { name: '📊・token-chat', phase: 1, posts: ['tokenWarning', 'safety'] },
      { name: '🔥・buys', phase: 2, readOnly: true },
      { name: '🐳・whale-alerts', phase: 2, readOnly: true },
      { name: '⚠️・scam-alerts', phase: 1, posts: ['scamAlerts'] },
    ],
  },
  {
    name: '🤖 SUPPORT',
    channels: [
      { name: '❓・faq', phase: 1, posts: ['faq'] },
      // open-a-ticket: placeholder only. Ticket Tool is configured manually.
      { name: '🎫・open-a-ticket', phase: 1 },
    ],
  },
  {
    name: '🔒 TEAM ONLY',
    teamOnly: true,
    channels: [
      { name: 'team-chat', phase: 1 },
      { name: 'launch-room', phase: 1 },
      { name: 'bug-triage', phase: 1 },
      { name: 'mod-log', phase: 1 },
      { name: 'content-plan', phase: 2 },
      { name: 'bot-setup', phase: 2 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Role definitions. `permissions` are guild-level permission flags.
// Optional Future roles only created under PHASE_2.
// ---------------------------------------------------------------------------

const ROLES = [
  // Staff
  { name: 'Founder', phase: 1, color: 0xe74c3c, hoist: true, permissions: [Flags.Administrator] },
  {
    name: 'Admin',
    phase: 1,
    color: 0xe67e22,
    hoist: true,
    permissions: [
      Flags.ManageChannels, Flags.ManageRoles, Flags.ManageMessages,
      Flags.BanMembers, Flags.KickMembers, Flags.ManageGuild,
      Flags.ModerateMembers, Flags.ManageThreads, Flags.ViewAuditLog,
    ],
  },
  {
    name: 'Moderator',
    phase: 1,
    color: 0x3498db,
    hoist: true,
    permissions: [
      Flags.ModerateMembers, Flags.ManageMessages, Flags.ManageThreads,
      Flags.KickMembers, Flags.ViewAuditLog,
    ],
  },
  {
    name: 'Developer',
    phase: 1,
    color: 0x9b59b6,
    hoist: true,
    permissions: [Flags.ManageMessages, Flags.ManageThreads],
  },
  {
    name: 'Community Manager',
    phase: 1,
    color: 0x1abc9c,
    hoist: true,
    permissions: [Flags.ManageMessages, Flags.ManageEvents, Flags.MentionEveryone],
  },
  // Community
  {
    name: 'Farmer',
    phase: 1,
    color: 0x2ecc71,
    hoist: false,
    isDefaultMember: true,
    permissions: [
      Flags.ViewChannel, Flags.SendMessages, Flags.SendMessagesInThreads,
      Flags.ReadMessageHistory, Flags.AddReactions, Flags.AttachFiles,
      Flags.EmbedLinks, Flags.UseExternalEmojis, Flags.Connect, Flags.Speak,
      Flags.CreatePublicThreads,
    ],
  },
  { name: 'Early Farmer', phase: 1, color: 0x27ae60, hoist: false, permissions: [] },
  { name: 'Bug Hunter', phase: 1, color: 0xf1c40f, hoist: false, permissions: [] },
  { name: 'Content Creator', phase: 1, color: 0xe84393, hoist: false, permissions: [] },
  { name: 'Whale', phase: 1, color: 0x00cec9, hoist: false, permissions: [] },
  // Muted: no granted perms; muting is enforced via channel overwrites.
  { name: 'Muted', phase: 1, color: 0x95a5a6, hoist: false, permissions: [] },
  // Optional Future roles (PHASE_2)
  { name: 'Top Farmer', phase: 2, color: 0xf39c12, hoist: false, permissions: [] },
  { name: "Farmer's Pool Winner", phase: 2, color: 0xd35400, hoist: false, permissions: [] },
  { name: 'OG Farmer', phase: 2, color: 0x8e44ad, hoist: false, permissions: [] },
  { name: 'Weed Farmer', phase: 2, color: 0x16a085, hoist: false, permissions: [] },
  { name: 'Star Collector', phase: 2, color: 0xfdcb6e, hoist: false, permissions: [] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(tag, msg) {
  console.log(`[${tag}] ${msg}`);
}

const counts = { created: 0, skipped: 0, perms: 0, pinned: 0, pinSkipped: 0 };

/**
 * Run a discord.js operation with backoff on rate limits / transient errors.
 * discord.js queues 429s internally, but this adds explicit, logged backoff
 * for safety and handles transient 5xx responses.
 */
async function withRetry(fn, label, maxAttempts = 6) {
  let attempt = 0;
  let delay = 2000;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      const status = err?.status ?? err?.httpStatus;
      const isRateLimit = status === 429 || err?.code === 'RateLimited' || /rate ?limit/i.test(err?.name || '');
      const isTransient = status >= 500 || ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'].includes(err?.code);

      if ((isRateLimit || isTransient) && attempt < maxAttempts) {
        let wait = delay;
        if (isRateLimit && typeof err?.retryAfter === 'number') wait = Math.ceil(err.retryAfter * 1000) + 250;
        log('RETRY', `${label} -> ${err.message} (attempt ${attempt}/${maxAttempts}, waiting ${wait}ms)`);
        await sleep(wait);
        delay = Math.min(delay * 2, 32000);
        continue;
      }
      throw err;
    }
  }
}

// Discord lowercases ASCII in channel names; compare normalized.
const normChannel = (name) => name.toLowerCase();

function findCategory(guild, name) {
  return guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === name,
  );
}

function findTextChannel(guild, name, parentId) {
  const target = normChannel(name);
  return guild.channels.cache.find(
    (c) =>
      (c.type === ChannelType.GuildText) &&
      c.parentId === parentId &&
      c.name === target,
  );
}

function findRole(guild, name) {
  return guild.roles.cache.find((r) => r.name === name);
}

// ---------------------------------------------------------------------------
// Build steps
// ---------------------------------------------------------------------------

function activeChannels(category) {
  return category.channels.filter((ch) => ch.phase === 1 || PHASE_2);
}

async function ensureCategories(guild) {
  const result = new Map(); // category spec name -> channel
  for (const cat of STRUCTURE) {
    if (!activeChannels(cat).length) continue;
    let existing = findCategory(guild, cat.name);
    if (existing) {
      log('SKIP', `category exists: ${cat.name}`);
      counts.skipped += 1;
    } else {
      existing = await withRetry(
        () => guild.channels.create({ name: cat.name, type: ChannelType.GuildCategory, reason: REASON }),
        `create category ${cat.name}`,
      );
      log('CREATE', `category: ${cat.name}`);
      counts.created += 1;
      await sleep(500);
    }
    result.set(cat.name, existing);
  }
  return result;
}

async function ensureChannels(guild, categoryMap) {
  // Returns array of { channel, meta } for the permissions/content passes.
  const built = [];
  for (const cat of STRUCTURE) {
    const parent = categoryMap.get(cat.name);
    if (!parent) continue;
    for (const ch of activeChannels(cat)) {
      let existing = findTextChannel(guild, ch.name, parent.id);
      if (existing) {
        log('SKIP', `channel exists: ${ch.name}`);
        counts.skipped += 1;
      } else {
        existing = await withRetry(
          () =>
            guild.channels.create({
              name: ch.name,
              type: ChannelType.GuildText,
              parent: parent.id,
              reason: REASON,
            }),
          `create channel ${ch.name}`,
        );
        log('CREATE', `channel: ${ch.name}`);
        counts.created += 1;
        await sleep(500);
      }
      built.push({ channel: existing, meta: ch, category: cat });
    }
  }
  return built;
}

async function ensureRoles(guild) {
  const roleMap = new Map();
  for (const role of ROLES) {
    if (role.phase === 2 && !PHASE_2) continue;
    let existing = findRole(guild, role.name);
    if (existing) {
      log('SKIP', `role exists: ${role.name}`);
      counts.skipped += 1;
    } else {
      existing = await withRetry(
        () =>
          guild.roles.create({
            name: role.name,
            color: role.color,
            hoist: !!role.hoist,
            mentionable: false,
            permissions: new PermissionsBitField(role.permissions || []),
            reason: REASON,
          }),
        `create role ${role.name}`,
      );
      log('CREATE', `role: ${role.name}`);
      counts.created += 1;
      await sleep(500);
    }
    roleMap.set(role.name, existing);
  }
  return roleMap;
}

async function applyPermissions(guild, categoryMap, builtChannels, roleMap) {
  const everyone = guild.roles.everyone;
  const muted = roleMap.get('Muted');
  const staffRoles = STAFF_ROLE_NAMES.map((n) => roleMap.get(n)).filter(Boolean);

  const denySend = {
    SendMessages: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
    AddReactions: false,
  };

  // --- Categories ---
  for (const cat of STRUCTURE) {
    const parent = categoryMap.get(cat.name);
    if (!parent) continue;

    if (cat.teamOnly) {
      await withRetry(
        () => parent.permissionOverwrites.edit(everyone, { ViewChannel: false }, { reason: REASON }),
        `team-only hide ${cat.name}`,
      );
      for (const role of staffRoles) {
        await withRetry(
          () =>
            parent.permissionOverwrites.edit(
              role,
              { ViewChannel: true, SendMessages: true, ReadMessageHistory: true },
              { reason: REASON },
            ),
          `team-only allow ${role.name} @ ${cat.name}`,
        );
      }
      log('PERMS', `team-only category locked: ${cat.name}`);
      counts.perms += 1;
    }

    if (muted) {
      await withRetry(
        () => parent.permissionOverwrites.edit(muted, denySend, { reason: REASON }),
        `mute overwrite category ${cat.name}`,
      );
    }
    await sleep(250);
  }

  // --- Channels ---
  for (const { channel, meta, category } of builtChannels) {
    if (meta.readOnly) {
      await withRetry(
        () =>
          channel.permissionOverwrites.edit(
            everyone,
            {
              ViewChannel: true,
              ReadMessageHistory: true,
              AddReactions: true,
              SendMessages: false,
              SendMessagesInThreads: false,
              CreatePublicThreads: false,
              CreatePrivateThreads: false,
            },
            { reason: REASON },
          ),
        `read-only overwrite ${meta.name}`,
      );
      log('PERMS', `read-only: ${meta.name}`);
      counts.perms += 1;
    }

    if (category.teamOnly) {
      // Ensure the child channel is also locked even if it isn't synced.
      await withRetry(
        () => channel.permissionOverwrites.edit(everyone, { ViewChannel: false }, { reason: REASON }),
        `team-only hide channel ${meta.name}`,
      );
      for (const role of staffRoles) {
        await withRetry(
          () =>
            channel.permissionOverwrites.edit(
              role,
              { ViewChannel: true, SendMessages: true, ReadMessageHistory: true },
              { reason: REASON },
            ),
          `team-only allow ${role.name} @ ${meta.name}`,
        );
      }
    }

    if (muted) {
      await withRetry(
        () => channel.permissionOverwrites.edit(muted, denySend, { reason: REASON }),
        `mute overwrite ${meta.name}`,
      );
    }
    await sleep(250);
  }
}

/**
 * Post and pin `content` in `channel` unless an identical message from this
 * bot is already present (pinned or in recent history). Idempotent.
 */
async function postAndPin(channel, content) {
  const me = channel.client.user.id;

  const pinned = await withRetry(() => channel.messages.fetchPinned(), `fetch pins ${channel.name}`);
  const alreadyPinned = pinned.find((m) => m.author.id === me && m.content.trim() === content);
  if (alreadyPinned) {
    log('PIN-SKIP', `already pinned in #${channel.name}`);
    counts.pinSkipped += 1;
    return;
  }

  // Reuse an existing identical (but unpinned) message if we posted one before.
  const recent = await withRetry(
    () => channel.messages.fetch({ limit: 50 }),
    `fetch recent ${channel.name}`,
  );
  let msg = recent.find((m) => m.author.id === me && m.content.trim() === content);

  if (!msg) {
    msg = await withRetry(() => channel.send(content), `post in ${channel.name}`);
    log('POST', `posted in #${channel.name}`);
  } else {
    log('POST-SKIP', `message already present in #${channel.name}`);
  }

  await withRetry(() => msg.pin(REASON), `pin in ${channel.name}`);
  log('PIN', `pinned in #${channel.name}`);
  counts.pinned += 1;
  await sleep(500);
}

async function postContent(builtChannels) {
  for (const { channel, meta } of builtChannels) {
    if (!meta.posts || !meta.posts.length) continue;
    for (const key of meta.posts) {
      const content = CONTENT[key];
      if (!content) {
        log('WARN', `missing content key "${key}" for ${meta.name}`);
        continue;
      }
      await postAndPin(channel, content);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.GUILD_ID;

  if (!token) throw new Error('DISCORD_BOT_TOKEN is not set');
  if (!guildId) throw new Error('GUILD_ID is not set');

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  await client.login(token);
  log('INFO', `logged in as ${client.user.tag}`);
  log('INFO', `PHASE_2 = ${PHASE_2}`);

  const guild = await withRetry(() => client.guilds.fetch(guildId), 'fetch guild');
  // Hydrate caches so the find* helpers see everything that already exists.
  await withRetry(() => guild.channels.fetch(), 'fetch channels');
  await withRetry(() => guild.roles.fetch(), 'fetch roles');
  log('INFO', `target guild: ${guild.name} (${guild.id})`);

  // 1) Categories  2) Channels  3) Roles  (per spec order)
  const categoryMap = await ensureCategories(guild);
  const builtChannels = await ensureChannels(guild, categoryMap);
  const roleMap = await ensureRoles(guild);

  // 4) Permission overwrites (needs roles to exist)
  await applyPermissions(guild, categoryMap, builtChannels, roleMap);

  // 5) Canned content (post + pin)
  await postContent(builtChannels);

  // 6) Farmer = default member role.
  // Discord has no API to auto-assign a role to new joiners; that is configured
  // via Server Settings -> Onboarding ("Default Channels & Roles") or an
  // autorole bot. We ensure the Farmer role exists with baseline member
  // permissions; finish the wiring in the dashboard.
  const farmer = roleMap.get('Farmer');
  if (farmer) {
    log(
      'INFO',
      `Farmer role ready (${farmer.id}). Set it as the default member role via ` +
        'Server Settings -> Onboarding -> Default Channels & Roles (no API exists to auto-assign joiners).',
    );
  }

  log(
    'DONE',
    `created=${counts.created} skipped=${counts.skipped} permsApplied=${counts.perms} ` +
      `pinned=${counts.pinned} pinSkipped=${counts.pinSkipped}`,
  );
  log('INFO', 'Carl-bot, Ticket Tool and Wick were left untouched (configure manually).');

  await client.destroy();
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
