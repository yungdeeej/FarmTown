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
  EmbedBuilder,
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
// Canned content (from the spec) rendered as rich embeds.
// TBD placeholders left for URLs / contract address.
// ---------------------------------------------------------------------------
//
// Each entry is a builder `(ctx) => EmbedBuilder`, where ctx provides:
//   ctx.m(name)   -> clickable <#channel> mention if it exists, else the name
//   ctx.icon      -> guild icon URL (or null)
//   ctx.guildName -> guild name
//
// Idempotency uses the embed title, so every title must be unique within the
// channel it is posted to.

const COLORS = {
  green: 0x57f287,
  brandGreen: 0x3ba55d,
  blurple: 0x5865f2,
  blue: 0x3498db,
  gold: 0xfee75c,
  amber: 0xf1c40f,
  orange: 0xe67e22,
  red: 0xed4245,
  teal: 0x16a085,
};

const FOOTER = 'FarmTown 🌾';

function baseEmbed(ctx, color) {
  const e = new EmbedBuilder().setColor(color).setFooter({ text: FOOTER });
  if (ctx.icon) e.setAuthor({ name: ctx.guildName || 'FarmTown', iconURL: ctx.icon });
  return e;
}

const EMBEDS = {
  rules: (ctx) =>
    baseEmbed(ctx, COLORS.red)
      .setTitle('📋 Server Rules')
      .setDescription(
        `Welcome to **FarmTown** 🌾\nPlease follow these rules to keep the community safe, fun, and scam-free.`,
      )
      .addFields({
        name: '​',
        value: [
          '**1.** Be respectful.',
          '**2.** No scams, fake links, fake airdrops, or impersonation.',
          '**3.** Admins and moderators will **never** DM you first.',
          '**4.** Never share your seed phrase or private keys.',
          `**5.** Only trust links posted in ${ctx.m('🔗・official-links')}.`,
          '**6.** No spam, raids, hate speech, or harassment.',
          '**7.** No financial advice.',
          '**8.** Keep bug reports and support requests in the correct channels.',
          '**9.** Do not post wallet-draining links or suspicious downloads.',
          '**10.** Breaking these rules can result in a timeout or ban.',
        ].join('\n'),
      }),

  welcome: (ctx) =>
    baseEmbed(ctx, COLORS.green)
      .setTitle('👋 Welcome to FarmTown')
      .setDescription(
        'FarmTown is a **browser-native multiplayer farming game** where you grow crops, visit farms, earn Gold, collect Stars, and compete for Farmer’s Pool rewards. 🌾',
      )
      .addFields(
        {
          name: '🚀 Start Here',
          value: [
            `**1.** Read ${ctx.m('📋・rules')}`,
            `**2.** Check ${ctx.m('🔗・official-links')}`,
            `**3.** Learn the basics in ${ctx.m('🎮・how-to-play')}`,
            '**4.** Join the game and start your farm',
            `**5.** Share your farm in ${ctx.m('🤝・friend-farms')}`,
          ].join('\n'),
        },
        {
          name: '🛡️ Stay Safe',
          value: [
            `• Only trust links in ${ctx.m('🔗・official-links')}`,
            '• Admins will **never** DM you first',
            '• **Never** share your seed phrase',
          ].join('\n'),
        },
      ),

  officialLinks: (ctx) =>
    baseEmbed(ctx, COLORS.blurple)
      .setTitle('🔗 Official FarmTown Links')
      .setDescription(
        'These are the **only** official FarmTown links. Anything posted elsewhere should not be trusted.',
      )
      .addFields(
        { name: '🎮 Game', value: 'https://play.YOURDOMAIN.com', inline: true },
        { name: '🌐 Website', value: 'https://YOURDOMAIN.com', inline: true },
        { name: '​', value: '​', inline: true },
        { name: '🐦 Twitter / X', value: '`TBD`', inline: true },
        { name: '📜 Token Contract', value: '`TBD`', inline: true },
        { name: '​', value: '​', inline: true },
        {
          name: '⚠️ Warning',
          value:
            'Only trust links in this channel.\nAdmins will **never** DM you first.\nNever enter your seed phrase anywhere.',
        },
      ),

  howToPlay: (ctx) =>
    baseEmbed(ctx, COLORS.blue)
      .setTitle('🎮 How to Play FarmTown')
      .setDescription('A quick start guide to your first harvest.')
      .addFields(
        {
          name: '🌱 Getting Started',
          value: [
            '**1.** Connect Phantom',
            '**2.** Sign in with your wallet',
            '**3.** Start your farm',
            '**4.** Open the Farm Menu',
            '**5.** Buy seeds from the Store',
          ].join('\n'),
          inline: true,
        },
        {
          name: '🚜 Farming Loop',
          value: [
            '**6.** Open Pouch and select a seed',
            '**7.** Use the Hoe to prepare soil',
            '**8.** Plant crops',
            '**9.** Wait for crops to grow',
            '**10.** Harvest for Gold and XP',
          ].join('\n'),
          inline: true,
        },
        {
          name: '⭐ Going Further',
          value: [
            '**11.** Use Gold to expand your farm',
            '**12.** Visit friend farms',
            '**13.** Collect Falling Stars',
            '**14.** Use Stars for premium gameplay',
            '**15.** Compete in Farmer’s Pool',
          ].join('\n'),
          inline: true,
        },
        {
          name: '​',
          value: `FarmTown is in active development — report bugs in ${ctx.m('🐛・bug-reports')}.`,
        },
      ),

  friendFarms: (ctx) =>
    baseEmbed(ctx, COLORS.green)
      .setTitle('🤝 Share Your Farm')
      .setDescription('Post your farm so others can visit and give feedback!')
      .addFields(
        {
          name: '📋 Format',
          value: '```\nFarm name:\nFarm link:\nWhat you want feedback on:\n```',
        },
        {
          name: '✨ Example',
          value:
            '```\nFarm name: Samosa Ranch\nFarm link: https://play.YOURDOMAIN.com/?farm=your-farm-slug\nFeedback: Tell me if my farm layout looks good.\n```',
        },
      ),

  suggestions: (ctx) =>
    baseEmbed(ctx, COLORS.gold)
      .setTitle('💡 Suggesting a Feature')
      .setDescription('Have an idea to make FarmTown better? Please include:')
      .addFields(
        { name: '1️⃣ What should be added?', value: 'Describe the feature.' },
        { name: '2️⃣ Why would it make FarmTown better?', value: 'The problem it solves.' },
        { name: '3️⃣ Category', value: 'Gameplay, UI, economy, or social?' },
        { name: '4️⃣ Priority', value: 'Is it urgent or future polish?' },
      ),

  bugReport: (ctx) =>
    baseEmbed(ctx, COLORS.orange)
      .setTitle('🐛 Bug Report Format')
      .setDescription('Found a bug? Copy this template and fill it out:')
      .addFields({
        name: '📋 Template',
        value:
          '```\nWhat happened:\n\nWhat did you expect:\n\nDevice/browser:\n\nWallet:\n\nScreenshot/video:\n\nSteps to reproduce:\n1.\n2.\n3.\n```',
      })
      .setFooter({
        text: 'Never post your seed phrase or private keys • For wallet/payment issues, open a ticket',
      }),

  knownIssues: (ctx) =>
    baseEmbed(ctx, COLORS.amber)
      .setTitle('🟢 Known Issues')
      .setDescription(
        [
          '• Mobile UI polish is still ongoing.',
          '• Some UI text may be cramped on small screens.',
          `• If a farm does not load, refresh once and report it in ${ctx.m('🐛・bug-reports')}.`,
        ].join('\n'),
      ),

  testBuild: (ctx) =>
    baseEmbed(ctx, COLORS.blue)
      .setTitle('🧪 Current Test Build')
      .addFields(
        { name: '🎮 Game', value: 'https://play.YOURDOMAIN.com' },
        {
          name: '✅ Please test',
          value: [
            '**1.** Wallet login',
            '**2.** Starting your farm',
            '**3.** Buying seeds',
            '**4.** Planting and harvesting',
            '**5.** Visiting friend farms',
          ].join('\n'),
          inline: true,
        },
        {
          name: '​',
          value: [
            '**6.** Falling Stars',
            '**7.** Stars store',
            '**8.** Weed',
            '**9.** Farmer’s Pool',
            '**10.** Mobile layout',
          ].join('\n'),
          inline: true,
        },
        { name: '​', value: `Report bugs in ${ctx.m('🐛・bug-reports')}.` },
      ),

  mobileFeedback: (ctx) =>
    baseEmbed(ctx, COLORS.teal)
      .setTitle('📱 Mobile Feedback')
      .setDescription('Help us polish the mobile experience.')
      .addFields({
        name: '📋 Template',
        value:
          '```\nDevice:\nBrowser:\nScreenshot:\nWhat felt hard to use:\nWhat should be bigger/smaller:\n```',
      }),

  stars: (ctx) =>
    baseEmbed(ctx, COLORS.gold)
      .setTitle('⭐ Stars — Premium Currency')
      .setDescription("Stars are FarmTown's premium in-game currency.")
      .addFields(
        {
          name: '✨ Used for',
          value: '• Crop boosts\n• Premium gameplay\n• Weed seeds\n• Future cosmetics / items',
        },
        {
          name: '⚠️ Important',
          value:
            'Stars are bought with the FarmTown token.\nThere are **no** token payouts from Stars.\nThere is **no** Stars-to-token withdrawal.',
        },
      ),

  weed: (ctx) =>
    baseEmbed(ctx, COLORS.teal)
      .setTitle('🌿 Weed — Premium Crop')
      .setDescription("Weed is FarmTown's premium crop.")
      .addFields(
        { name: '💰 Cost', value: '30 Stars per Weed seed', inline: true },
        { name: '⏱️ Grow time', value: '5 hours', inline: true },
        { name: '📈 Output', value: 'High Gold output', inline: true },
        { name: '🎲 Profile', value: 'Bought with Stars — premium crop risk/reward.' },
      ),

  farmersPool: (ctx) =>
    baseEmbed(ctx, COLORS.amber)
      .setTitle("🏆 Farmer's Pool")
      .setDescription(
        'Sacrifice farm progress to compete for a share of the reward pool. The more you sacrifice compared to everyone else, the larger your share.',
      )
      .addFields(
        { name: '🔥 You can sacrifice', value: '• Gold\n• Farm Points\n• Levels' },
        { name: '💸 Payouts', value: 'Reward payouts are handled by the game backend.' },
      ),

  tokenWarning: (ctx) =>
    baseEmbed(ctx, COLORS.red)
      .setTitle('📊 Token Chat Rules')
      .setDescription('Token discussion is allowed here, but:')
      .addFields({
        name: '​',
        value: [
          '• No financial advice',
          '• No fake links',
          '• No fake contract addresses',
          '• No impersonation',
          `• Only trust the CA in ${ctx.m('🔗・official-links')}`,
        ].join('\n'),
      }),

  scamAlerts: (ctx) =>
    baseEmbed(ctx, COLORS.red)
      .setTitle('⚠️ Scam Alert Rules')
      .setDescription('Report here if you see:')
      .addFields({
        name: '​',
        value: [
          '• Fake FarmTown links',
          '• Fake token contracts',
          '• Fake support DMs',
          '• Fake airdrops',
          '• Wallet-draining links',
          '• Impersonators',
        ].join('\n'),
      })
      .setFooter({ text: 'Do not click suspicious links • Only trust official-links' }),

  faq: (ctx) =>
    baseEmbed(ctx, COLORS.blurple)
      .setTitle('❓ Frequently Asked Questions')
      .addFields(
        { name: 'Do I need Phantom?', value: 'Yes. FarmTown uses wallet auth.' },
        { name: 'Can I play without a wallet?', value: 'No, wallet auth is required for gameplay.' },
        { name: 'Where is the real game link?', value: `Check ${ctx.m('🔗・official-links')}.` },
        { name: 'Where is the real token CA?', value: `Check ${ctx.m('🔗・official-links')}.` },
        { name: 'Can I withdraw Stars for tokens?', value: 'No. Stars are in-game premium currency only.' },
        { name: 'Can I withdraw Gold for tokens?', value: 'No. There is no Gold-to-token withdrawal.' },
        {
          name: 'How do I buy Stars?',
          value: 'Open the Stars panel in game and follow the Phantom payment flow.',
        },
        { name: 'What is Weed?', value: 'Weed is a premium crop bought with Stars.' },
        {
          name: "What is Farmer's Pool?",
          value: 'A competitive reward pool where players sacrifice resources for a share of the pool.',
        },
        { name: 'I found a bug. Where do I report it?', value: `Use ${ctx.m('🐛・bug-reports')}.` },
      ),

  safety: (ctx) =>
    baseEmbed(ctx, COLORS.red)
      .setTitle('🛡️ Safety Reminder')
      .setDescription(
        [
          `• Only trust links posted in ${ctx.m('🔗・official-links')}`,
          '• Admins and moderators will **never** DM you first',
          '• Never share your seed phrase',
          '• Never connect your wallet to links sent in DMs',
          '• There is no secret mint, no private airdrop, and no support wallet',
        ].join('\n'),
      ),
};

// ---------------------------------------------------------------------------
// Structure definition (full spec order; `phase` controls minimal vs full)
// ---------------------------------------------------------------------------
//
// Per channel flags:
//   readOnly : @everyone may view + read history but not send
//   posts    : array of EMBEDS keys to post & pin (in order)
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

const counts = { created: 0, skipped: 0, perms: 0, pinned: 0, pinSkipped: 0, cleaned: 0 };

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
            colors: { primaryColor: role.color },
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

// Resolve a clickable channel mention from a spec name (e.g. "🔗・official-links").
function makeMention(guild) {
  return (name) => {
    const target = name.toLowerCase();
    const c = guild.channels.cache.find(
      (ch) => ch.type === ChannelType.GuildText && ch.name === target,
    );
    return c ? `<#${c.id}>` : `\`${name}\``;
  };
}

/**
 * Delete the bot's old plain-text posts in a managed channel (one-time
 * migration to embeds). Only removes messages authored by this bot that carry
 * no embed — those can only be our earlier text posts.
 */
async function cleanupLegacyText(channel, recent, me) {
  for (const m of recent.values()) {
    if (m.author.id === me && m.embeds.length === 0 && m.content.trim().length) {
      await withRetry(() => m.delete(), `delete legacy text in ${channel.name}`);
      log('CLEANUP', `removed old plain-text post in #${channel.name}`);
      counts.cleaned += 1;
      await sleep(250);
    }
  }
}

/**
 * Post and pin an embed in `channel` unless a bot message with the same embed
 * title is already present (pinned or in recent history). Idempotent. Also
 * migrates away any legacy plain-text posts.
 */
async function postAndPin(channel, embed) {
  const me = channel.client.user.id;
  const title = embed.data.title;

  const pinned = await withRetry(() => channel.messages.fetchPins(), `fetch pins ${channel.name}`);
  const alreadyPinned = pinned.items.some(
    ({ message: m }) => m.author.id === me && m.embeds[0]?.title === title,
  );

  const recent = await withRetry(
    () => channel.messages.fetch({ limit: 50 }),
    `fetch recent ${channel.name}`,
  );

  // One-time migration: drop old plain-text versions of our content.
  await cleanupLegacyText(channel, recent, me);

  if (alreadyPinned) {
    log('PIN-SKIP', `"${title}" already pinned in #${channel.name}`);
    counts.pinSkipped += 1;
    return;
  }

  // Reuse an identical (but unpinned) embed if we posted one before.
  let msg = recent.find((m) => m.author.id === me && m.embeds[0]?.title === title);
  if (!msg) {
    msg = await withRetry(() => channel.send({ embeds: [embed] }), `post in ${channel.name}`);
    log('POST', `posted "${title}" in #${channel.name}`);
  } else {
    log('POST-SKIP', `"${title}" already present in #${channel.name}`);
  }

  await withRetry(() => msg.pin(REASON), `pin in ${channel.name}`);
  log('PIN', `pinned "${title}" in #${channel.name}`);
  counts.pinned += 1;
  await sleep(500);
}

async function postContent(guild, builtChannels) {
  const ctx = {
    m: makeMention(guild),
    icon: guild.iconURL ? guild.iconURL({ size: 128 }) : null,
    guildName: guild.name,
  };
  for (const { channel, meta } of builtChannels) {
    if (!meta.posts || !meta.posts.length) continue;
    for (const key of meta.posts) {
      const builder = EMBEDS[key];
      if (!builder) {
        log('WARN', `missing embed "${key}" for ${meta.name}`);
        continue;
      }
      await postAndPin(channel, builder(ctx));
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
  await postContent(guild, builtChannels);

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
      `pinned=${counts.pinned} pinSkipped=${counts.pinSkipped} legacyRemoved=${counts.cleaned}`,
  );
  log('INFO', 'Carl-bot, Ticket Tool and Wick were left untouched (configure manually).');

  await client.destroy();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}

module.exports = { EMBEDS, STRUCTURE, ROLES };
