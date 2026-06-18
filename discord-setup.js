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

const fs = require('fs');
const path = require('path');

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  AutoModerationActionType,
} = require('discord.js');

const Flags = PermissionsBitField.Flags;

// ---------------------------------------------------------------------------
// Toggles
// ---------------------------------------------------------------------------

// false -> minimal launch structure only.
// true  -> also create the remaining full-structure channels/roles.
const PHASE_2 = true;

// Branding assets. Each may be a local file path (preferred — committed to the
// repo and attached to messages so it never expires) or a public URL. Left
// blank, image features are skipped.
//   logo   - square logo: server icon + embed thumbnails
//   banner - wide banner: welcome + launch announcement embeds
const ASSETS = {
  logo: process.env.LOGO_URL || 'assets/logo.png',
  banner: process.env.BANNER_URL || 'assets/banner.png',
};

// Re-upload the server icon even if the guild already has one (FORCE_ICON=1).
const FORCE_ICON = process.env.FORCE_ICON === '1';

// How the #get-roles panel works:
//   'carlbot' - emoji reactions, driven by Carl-bot's Reaction Roles (no hosting)
//   'bot'     - custom buttons, driven by engagement-bot.js (needs a host)
const SELF_ROLE_MODE = 'carlbot';

// Human-verification gate. When on, unverified members see only #verify and
// #rules; the VERIFIED_ROLE unlocks the rest. A verification bot (Wick captcha)
// grants VERIFIED_ROLE after a member passes. Farmer doubles as the access key.
const VERIFICATION_GATE = true;
const VERIFIED_ROLE = 'Farmer';

// Official FarmTown links used throughout the embeds. Update here, re-run, and
// the pinned messages update in place. Leave a value as 'TBD' until known.
const LINKS = {
  game: 'https://play.farmtown.online',
  website: 'https://farmtown.online',
  twitter: 'https://x.com/playfarmtown',
  contract: 'yMJPZbnhoHib3ib8n8PfiVcp9yauk1vnaGKLx7epump',
  dex: 'https://dexscreener.com/solana/frxrs52rlf45nywimjeoquh4g7crry7ny13fxn6t4dd',
};

const REASON = 'FarmTown automated server setup';

/**
 * Classify a branding asset value into how it should be used:
 *   { kind: 'file', path, name }  - local file, attached to messages
 *   { kind: 'url', url }          - remote URL, referenced directly
 *   { kind: 'none' }
 */
function resolveAsset(value) {
  if (!value) return { kind: 'none' };
  if (/^https?:\/\//i.test(value)) return { kind: 'url', url: value };
  const abs = path.resolve(__dirname, value);
  if (fs.existsSync(abs)) return { kind: 'file', path: abs, name: path.basename(abs) };
  return { kind: 'none' };
}

// Embed image reference for an asset (attachment:// for files, the URL otherwise).
function assetEmbedRef(resolved) {
  if (resolved.kind === 'file') return `attachment://${resolved.name}`;
  if (resolved.kind === 'url') return resolved.url;
  return null;
}

// ---------------------------------------------------------------------------
// Canned content (from the spec) rendered as rich embeds.
// TBD placeholders left for URLs / contract address.
// ---------------------------------------------------------------------------
//
// Each entry is a builder `(ctx) => EmbedBuilder`, where ctx provides:
//   ctx.m(name)    -> clickable <#channel> mention if it exists, else the name
//   ctx.role(name) -> clickable <@&role> mention if it exists, else the name
//   ctx.icon       -> guild icon URL (or null)
//   ctx.logo       -> branding logo URL (or null)
//   ctx.banner     -> branding banner URL (or null)
//   ctx.guildName  -> guild name
//   ctx.selfRoles  -> array of { name, emoji, desc } self-assignable roles
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
      .setThumbnail(ctx.logo || null)
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
      .setThumbnail(ctx.logo || null)
      .setImage(ctx.banner || null)
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
      .setThumbnail(ctx.logo || null)
      .setDescription(
        'These are the **only** official FarmTown links. Anything posted elsewhere should not be trusted.',
      )
      .addFields(
        { name: '🎮 Game', value: LINKS.game, inline: true },
        { name: '🌐 Website', value: LINKS.website, inline: true },
        { name: '​', value: '​', inline: true },
        { name: '🐦 Twitter / X', value: LINKS.twitter, inline: true },
        { name: '📈 Chart (Dexscreener)', value: LINKS.dex, inline: true },
        { name: '​', value: '​', inline: true },
        { name: '📜 Token Contract', value: `\`${LINKS.contract}\``, inline: false },
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
            '```\nFarm name: Samosa Ranch\nFarm link: ' + LINKS.game + '/?farm=your-farm-slug\nFeedback: Tell me if my farm layout looks good.\n```',
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
        { name: '🎮 Game', value: LINKS.game },
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

  launchAnnouncement: (ctx) =>
    baseEmbed(ctx, COLORS.brandGreen)
      .setTitle('🌾 FarmTown is Live!')
      .setThumbnail(ctx.logo || null)
      .setImage(ctx.banner || null)
      .setDescription(
        'Start your farm, grow crops, visit friends, and compete for rewards. Welcome to the community! 🚜',
      )
      .addFields(
        { name: '🎮 Play Now', value: LINKS.game, inline: true },
        { name: '🌐 Website', value: LINKS.website, inline: true },
        {
          name: '✨ What you can do',
          value: [
            '• Grow crops and harvest for Gold',
            '• Visit friend farms',
            '• Collect Falling Stars',
            '• Plant premium Weed',
            '• Compete in Farmer’s Pool',
          ].join('\n'),
        },
        {
          name: '🛡️ Stay Safe',
          value: `Only trust links in ${ctx.m('🔗・official-links')} • Admins will **never** DM you first • Never share your seed phrase.`,
        },
      ),

  selfRoles: (ctx) => {
    const intro = ctx.reactionMode
      ? '**React** with an emoji below to get that role — react again to remove it. Opt in to the pings and updates you care about.'
      : 'Click a button below to **toggle** a role on or off. Opt in to the pings and updates you care about.';
    const e = baseEmbed(ctx, COLORS.blurple)
      .setTitle('🎭 Get Your Roles')
      .setThumbnail(ctx.logo || null)
      .setDescription(intro);
    // NOTE: embed field *names* do not render <@&id> mentions, so use the plain
    // role name in the header and put the (rendered) mention in the value.
    for (const r of ctx.selfRoles || []) {
      e.addFields({ name: `${r.emoji} ${r.name}`, value: `${ctx.role(r.name)} — ${r.desc}` });
    }
    return e;
  },

  verifyInfo: (ctx) =>
    baseEmbed(ctx, COLORS.green)
      .setTitle('✅ Verify to Enter FarmTown')
      .setThumbnail(ctx.logo || null)
      .setDescription(
        'To keep the community safe from bots and scammers, you need to verify before you can access the server.',
      )
      .addFields(
        {
          name: '🔓 How to verify',
          value:
            'React with ✅ below to verify. Once you do, the rest of the server unlocks for you automatically.',
        },
        {
          name: '🛡️ Reminder',
          value:
            'Admins will **never** DM you first or ask for your seed phrase. Only trust links here once you’re in.',
        },
      ),

  ticketInfo: (ctx) =>
    baseEmbed(ctx, COLORS.blurple)
      .setTitle('🎫 Support Tickets')
      .setThumbnail(ctx.logo || null)
      .setDescription(
        'Need private help? Use the **ticket panel below** to open a private channel with the team.',
      )
      .addFields(
        {
          name: '🧾 Use a ticket for',
          value: [
            '• Wallet login issues',
            '• Stars / payment issues',
            '• Farmer’s Pool issues',
            '• Sensitive or private bug reports',
            '• Partnership / media',
          ].join('\n'),
        },
        {
          name: '💡 For general questions',
          value: `Check ${ctx.m('❓・faq')} first, and report public bugs in ${ctx.m('🐛・bug-reports')}.`,
        },
        {
          name: '🛡️ Safety',
          value:
            'Staff will **never** ask for your seed phrase or private keys, or ask you to connect your wallet to a link. Real support only happens inside a ticket here.',
        },
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
      // verify: gate entry. Visible to everyone (incl. unverified); Carl-bot
      // grants Farmer when a member clicks the ✅ reaction (bound in Carl-bot).
      { name: '✅・verify', phase: 1, gateEntry: true, allowSend: ['Wick'], position: 0, posts: ['verifyInfo'], reactWith: ['✅'] },
      { name: '📣・announcements', phase: 1, readOnly: true, posts: ['launchAnnouncement'] },
      // rules: stays visible to unverified members so they can read before verifying.
      { name: '📋・rules', phase: 1, readOnly: true, gateVisible: true, posts: ['rules'] },
      { name: '👋・welcome', phase: 1, readOnly: true, posts: ['welcome'] },
      { name: '🎭・get-roles', phase: 1, readOnly: true, selfRoles: true },
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
      // open-a-ticket: read-only panel channel. Ticket Tool posts its panel here
      // (allowSend grants it permission); members only click the ticket button.
      { name: '🎫・open-a-ticket', phase: 1, readOnly: true, allowSend: ['Ticket Tool'], posts: ['ticketInfo'] },
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

// Baseline for @everyone and general members: plain-text chat + voice only.
const MEMBER_BASE_PERMS = [
  Flags.ViewChannel, Flags.SendMessages, Flags.ReadMessageHistory,
  Flags.Connect, Flags.Speak, Flags.UseVAD,
];

// Rich-posting perms restored to staff so they can still share links/media.
const STAFF_POST_PERMS = [
  Flags.EmbedLinks, Flags.AttachFiles, Flags.AddReactions,
  Flags.UseExternalEmojis, Flags.UseExternalStickers,
];

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
      ...STAFF_POST_PERMS,
    ],
  },
  {
    name: 'Moderator',
    phase: 1,
    color: 0x3498db,
    hoist: true,
    permissions: [
      Flags.ModerateMembers, Flags.ManageMessages, Flags.ManageThreads,
      Flags.KickMembers, Flags.BanMembers, Flags.ViewAuditLog,
      ...STAFF_POST_PERMS,
    ],
  },
  {
    name: 'Developer',
    phase: 1,
    color: 0x9b59b6,
    hoist: true,
    permissions: [Flags.ManageMessages, Flags.ManageThreads, ...STAFF_POST_PERMS],
  },
  {
    name: 'Community Manager',
    phase: 1,
    color: 0x1abc9c,
    hoist: true,
    permissions: [Flags.ManageMessages, Flags.ManageEvents, Flags.MentionEveryone, ...STAFF_POST_PERMS],
  },
  // Community
  {
    name: 'Farmer',
    phase: 1,
    color: 0x2ecc71,
    hoist: false,
    isDefaultMember: true,
    // Locked down: plain-text chat + voice only. No links/files/embeds/reactions
    // /threads/external emoji — scam-link protection. Staff keep the rich perms.
    permissions: [
      Flags.ViewChannel, Flags.SendMessages, Flags.ReadMessageHistory,
      Flags.Connect, Flags.Speak, Flags.UseVAD,
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
  // Self-assignable opt-in ping/interest roles (toggled via #get-roles buttons,
  // handled by engagement-bot.js). Mentionable so staff can ping opted-in users.
  { name: 'Announcement Ping', phase: 1, color: 0xe74c3c, hoist: false, mentionable: true, permissions: [], selfAssign: '🔔', desc: 'Get pinged for major announcements' },
  { name: 'Update Ping', phase: 1, color: 0x3498db, hoist: false, mentionable: true, permissions: [], selfAssign: '🆕', desc: 'Get pinged for game updates & patch notes' },
  { name: 'Event Ping', phase: 1, color: 0x9b59b6, hoist: false, mentionable: true, permissions: [], selfAssign: '🎉', desc: 'Get pinged for events & community nights' },
  { name: 'Playtester', phase: 1, color: 0x1abc9c, hoist: false, mentionable: true, permissions: [], selfAssign: '🧪', desc: 'Opt into test builds & playtests' },
  { name: 'Mobile Tester', phase: 1, color: 0xe67e22, hoist: false, mentionable: true, permissions: [], selfAssign: '📱', desc: 'Help test the mobile experience' },
];

// Derived list of self-assignable roles for the #get-roles message.
const SELF_ROLES = ROLES.filter((r) => r.selfAssign).map((r) => ({
  name: r.name,
  emoji: r.selfAssign,
  desc: r.desc,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(tag, msg) {
  console.log(`[${tag}] ${msg}`);
}

const counts = { created: 0, skipped: 0, perms: 0, pinned: 0, updated: 0, pinSkipped: 0, cleaned: 0 };

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
      // Pin specific channels (e.g. #verify) to the top of their category.
      if (typeof ch.position === 'number' && existing.position !== ch.position) {
        await withRetry(() => existing.setPosition(ch.position), `position ${ch.name}`);
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
      // Reconcile permissions so config stays the source of truth for our roles.
      const desired = new PermissionsBitField(role.permissions || []);
      if (existing.permissions.bitfield !== desired.bitfield) {
        await withRetry(
          () => existing.setPermissions(desired, 'Reconcile role permissions'),
          `update perms ${role.name}`,
        );
        log('UPDATE', `role permissions: ${role.name}`);
        counts.updated += 1;
      } else {
        log('SKIP', `role exists: ${role.name}`);
        counts.skipped += 1;
      }
    } else {
      existing = await withRetry(
        () =>
          guild.roles.create({
            name: role.name,
            colors: { primaryColor: role.color },
            hoist: !!role.hoist,
            mentionable: !!role.mentionable,
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
  const verified = VERIFICATION_GATE ? roleMap.get(VERIFIED_ROLE) : null;
  if (VERIFICATION_GATE && !verified) {
    log('WARN', `verification gate on but role "${VERIFIED_ROLE}" not found — gate skipped`);
  }
  const gateOn = VERIFICATION_GATE && !!verified;

  // Bot (managed) roles without Administrator would lose access when the gate
  // hides channels from @everyone — grant them view so they keep working.
  const gateBotRoles = gateOn
    ? [...guild.roles.cache.values()].filter(
        (r) => r.managed && !r.permissions.has(Flags.Administrator),
      )
    : [];

  // Roles that get view access to every non-team channel behind the gate:
  // the verified role, non-admin staff (so mods/admins/devs aren't locked out),
  // and non-admin bots. Admins (e.g. Founder) bypass via the Administrator perm.
  const nonAdminStaff = staffRoles.filter((r) => !r.permissions.has(Flags.Administrator));
  const gateViewRoles = gateOn
    ? [...new Map([verified, ...nonAdminStaff, ...gateBotRoles].map((r) => [r.id, r])).values()]
    : [];
  if (gateOn) {
    log('INFO', `gate view granted to: ${gateViewRoles.map((r) => r.name).join(', ')}`);
  }

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
    } else if (gateOn) {
      // Verification gate: hide the category from @everyone, show it to verified
      // members. Channels that must stay visible (verify/rules) re-allow @everyone
      // at the channel level below.
      await withRetry(
        () => parent.permissionOverwrites.edit(everyone, { ViewChannel: false }, { reason: REASON }),
        `gate hide category ${cat.name}`,
      );
      for (const role of gateViewRoles) {
        await withRetry(
          () =>
            parent.permissionOverwrites.edit(
              role,
              { ViewChannel: true, ReadMessageHistory: true },
              { reason: REASON },
            ),
          `gate allow ${role.name} @ ${cat.name}`,
        );
      }
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
    if (category.teamOnly) {
      // Hidden from @everyone, visible to staff (independent of the gate).
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
    } else {
      // Compute the @everyone overwrite from gate + read-only + gate-exception flags.
      const everyoneCanView = !gateOn || !!meta.gateEntry || !!meta.gateVisible;
      const ev = { ViewChannel: everyoneCanView, ReadMessageHistory: everyoneCanView };
      if (meta.readOnly || meta.gateEntry) {
        Object.assign(ev, {
          SendMessages: false,
          SendMessagesInThreads: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false,
          AddReactions: true,
        });
      }
      await withRetry(
        () => channel.permissionOverwrites.edit(everyone, ev, { reason: REASON }),
        `everyone overwrite ${meta.name}`,
      );
      // Verified members can view every non-team channel (send governed by base
      // perms; read-only channels keep the @everyone send-deny which also blocks
      // verified members since they get no send allow here).
      if (gateOn) {
        for (const role of gateViewRoles) {
          await withRetry(
            () =>
              channel.permissionOverwrites.edit(
                role,
                { ViewChannel: true, ReadMessageHistory: true },
                { reason: REASON },
              ),
            `gate allow ${role.name} @ ${meta.name}`,
          );
        }
      }
      if (meta.readOnly || meta.gateEntry) log('PERMS', `read-only: ${meta.name}`);
      counts.perms += 1;
    }

    // Grant specific (bot) roles send access in a read-only channel, e.g. so
    // Ticket Tool posts its panel and Wick can run the verify channel.
    if (meta.allowSend) {
      for (const roleName of meta.allowSend) {
        const role = guild.roles.cache.find((r) => r.name === roleName);
        if (!role) {
          log('INFO', `allowSend: role "${roleName}" not found — skipping for ${meta.name}`);
          continue;
        }
        await withRetry(
          () =>
            channel.permissionOverwrites.edit(
              role,
              {
                ViewChannel: true,
                SendMessages: true,
                EmbedLinks: true,
                AttachFiles: true,
                ReadMessageHistory: true,
                ManageMessages: true,
              },
              { reason: REASON },
            ),
          `allowSend ${roleName} @ ${meta.name}`,
        );
        log('PERMS', `allow send: ${roleName} in ${meta.name}`);
        counts.perms += 1;
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

// Resolve a clickable role mention by role name.
function makeRoleMention(roleMap) {
  return (name) => {
    const r = roleMap.get(name);
    return r ? `<@&${r.id}>` : `**${name}**`;
  };
}

/**
 * Normalized signature of just the embed fields we control, so we can detect
 * when a posted embed has drifted from the desired one (Discord adds proxy
 * URLs and other fields we must ignore).
 */
function embedSignature(data) {
  if (!data) return '';
  // Compare images by filename only: a desired "attachment://logo.png" must
  // match the resolved CDN URL ".../logo.png" Discord stores after upload.
  const imgKey = (url) => {
    if (!url) return '';
    if (url.startsWith('attachment://')) return url.slice('attachment://'.length);
    try {
      return path.basename(new URL(url).pathname);
    } catch {
      return url;
    }
  };
  return JSON.stringify({
    title: data.title || '',
    description: data.description || '',
    color: data.color ?? null,
    author: data.author?.name || '',
    footer: data.footer?.text || '',
    image: imgKey(data.image?.url),
    thumbnail: imgKey(data.thumbnail?.url),
    fields: (data.fields || []).map((f) => ({ name: f.name, value: f.value, inline: !!f.inline })),
  });
}

// Collect the local files an embed references via attachment:// so they can be
// uploaded with the message.
function collectAttachmentFiles(embedData, assetFiles) {
  const refs = new Set();
  for (const url of [embedData.image?.url, embedData.thumbnail?.url]) {
    if (url && url.startsWith('attachment://')) refs.add(url.slice('attachment://'.length));
  }
  return [...refs].map((name) => assetFiles[name]).filter(Boolean);
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

async function ensurePinned(channel, msg) {
  const pins = await withRetry(() => channel.messages.fetchPins(), `fetch pins ${channel.name}`);
  if (!pins.items.some(({ message: m }) => m.id === msg.id)) {
    await withRetry(() => msg.pin(REASON), `pin in ${channel.name}`);
  }
}

/**
 * Post/update + pin a bot message identified by its embed title. Converges to
 * the desired state: posts if missing, edits if the embed (or components) have
 * drifted, otherwise leaves it. Idempotent and safe to re-run. `components` is
 * optional (used for the self-roles button row).
 */
async function upsertMessage(channel, embed, components, assetFiles) {
  const me = channel.client.user.id;
  const title = embed.data.title;
  const files = collectAttachmentFiles(embed.data, assetFiles || {});
  const payload = { embeds: [embed], components: components || [], files };

  const recent = await withRetry(
    () => channel.messages.fetch({ limit: 50 }),
    `fetch recent ${channel.name}`,
  );
  await cleanupLegacyText(channel, recent, me);

  // Our content is always pinned, so check pins too — in busy channels (e.g.
  // #general with join messages) the message can scroll past the recent window.
  const pins = await withRetry(() => channel.messages.fetchPins(), `fetch pins ${channel.name}`);
  const byId = new Map();
  for (const { message: m } of pins.items) byId.set(m.id, m);
  for (const m of recent.values()) byId.set(m.id, m);

  const existing = [...byId.values()].find(
    (m) => m.author.id === me && m.embeds[0]?.title === title,
  );

  if (!existing) {
    const msg = await withRetry(() => channel.send(payload), `post in ${channel.name}`);
    await ensurePinned(channel, msg);
    log('POST', `posted + pinned "${title}" in #${channel.name}`);
    counts.pinned += 1;
    await sleep(500);
    return msg;
  }

  const sameEmbed =
    embedSignature(existing.embeds[0]?.data || existing.embeds[0]?.toJSON?.()) ===
    embedSignature(embed.data);
  const existingIds = (existing.components || [])
    .flatMap((row) => row.components.map((c) => c.customId))
    .join(',');
  const desiredIds = (components || [])
    .flatMap((row) => row.components.map((c) => c.data.custom_id))
    .join(',');

  if (sameEmbed && existingIds === desiredIds) {
    await ensurePinned(channel, existing);
    log('PIN-SKIP', `"${title}" already up to date in #${channel.name}`);
    counts.pinSkipped += 1;
    return existing;
  }

  // Replace attachments when editing so re-uploaded files don't duplicate.
  await withRetry(() => existing.edit({ ...payload, attachments: [] }), `edit in ${channel.name}`);
  await ensurePinned(channel, existing);
  log('UPDATE', `updated "${title}" in #${channel.name}`);
  counts.updated += 1;
  await sleep(500);
  return existing;
}

// Add the given emoji as reactions to a message if not already present
// (idempotent — lets members react immediately once Carl-bot binds the roles).
async function ensureReactions(message, emojis) {
  const present = new Set(message.reactions.cache.map((r) => r.emoji.name));
  for (const emoji of emojis) {
    if (present.has(emoji)) continue;
    await withRetry(() => message.react(emoji), `react ${emoji} in ${message.channel.name}`);
    await sleep(350);
  }
}

function buildSelfRoleButtons(roleMap) {
  const rows = [];
  let row = new ActionRowBuilder();
  for (const sr of SELF_ROLES) {
    const role = roleMap.get(sr.name);
    if (!role) continue;
    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`selfrole:${role.id}`)
        .setLabel(sr.name)
        .setEmoji(sr.emoji)
        .setStyle(ButtonStyle.Secondary),
    );
  }
  if (row.components.length) rows.push(row);
  return rows;
}

async function postContent(guild, builtChannels, roleMap) {
  const logo = resolveAsset(ASSETS.logo);
  const banner = resolveAsset(ASSETS.banner);

  // Local files to attach, keyed by attachment filename.
  const assetFiles = {};
  for (const a of [logo, banner]) {
    if (a.kind === 'file') assetFiles[a.name] = { attachment: a.path, name: a.name };
  }

  const reactionMode = SELF_ROLE_MODE === 'carlbot';
  const ctx = {
    m: makeMention(guild),
    role: makeRoleMention(roleMap),
    icon: guild.iconURL ? guild.iconURL({ size: 128 }) : null,
    logo: assetEmbedRef(logo),
    banner: assetEmbedRef(banner),
    guildName: guild.name,
    selfRoles: SELF_ROLES,
    reactionMode,
  };

  for (const { channel, meta } of builtChannels) {
    if (meta.selfRoles) {
      // Carl-bot mode: no buttons, pre-add the emoji so reactions are ready to bind.
      // Bot mode: attach the custom buttons handled by engagement-bot.js.
      const components = reactionMode ? [] : buildSelfRoleButtons(roleMap);
      const msg = await upsertMessage(channel, EMBEDS.selfRoles(ctx), components, assetFiles);
      if (reactionMode && msg) {
        await ensureReactions(msg, SELF_ROLES.map((r) => r.emoji));
        log('REACT', `ensured ${SELF_ROLES.length} role reactions on #${channel.name}`);
      }
      continue;
    }
    if (!meta.posts || !meta.posts.length) continue;
    for (const key of meta.posts) {
      const builder = EMBEDS[key];
      if (!builder) {
        log('WARN', `missing embed "${key}" for ${meta.name}`);
        continue;
      }
      const msg = await upsertMessage(channel, builder(ctx), undefined, assetFiles);
      // Pre-add reactions (e.g. ✅ on #verify) so they're ready to bind in Carl-bot.
      if (meta.reactWith && msg && key === meta.posts[0]) {
        await ensureReactions(msg, meta.reactWith);
        log('REACT', `ensured ${meta.reactWith.join(' ')} on #${channel.name}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Restrict the @everyone role to plain-text chat + voice, so no general member
// can post links, files, embeds, external emoji, etc. anywhere by default.
async function restrictEveryone(guild) {
  const desired = new PermissionsBitField(MEMBER_BASE_PERMS);
  if (guild.roles.everyone.permissions.bitfield === desired.bitfield) {
    log('SKIP', '@everyone already locked to text + voice');
    return;
  }
  await withRetry(
    () => guild.roles.everyone.setPermissions(desired, 'Lock down general member permissions'),
    'restrict @everyone',
  );
  log('PERMS', '@everyone restricted to text chat + voice only');
  counts.perms += 1;
}

// Create/refresh an AutoMod rule that blocks links in chat (the real fix for
// scam/drainer links — removing Embed Links only stops previews, not the text).
// Staff roles and the read-only info channels are exempt.
async function ensureAutoMod(guild, roleMap) {
  const NAME = 'FarmTown: Block links';
  const text = (n) => guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === n);

  const exemptRoles = STAFF_ROLE_NAMES.map((n) => roleMap.get(n)).filter(Boolean).map((r) => r.id);
  const exemptChannels = [
    '🔗・official-links', '📣・announcements', '👋・welcome', '🎮・how-to-play',
    '📋・rules', '📰・updates', '🐞・bug-fixes', '🎭・get-roles', '✅・verify',
  ].map(text).filter(Boolean).map((c) => c.id);

  const modlog = text('mod-log');
  const actions = [
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: { customMessage: "Links aren't allowed in chat. Official links are in #official-links." },
    },
  ];
  if (modlog) {
    actions.push({ type: AutoModerationActionType.SendAlertMessage, metadata: { channel: modlog.id } });
  }

  const options = {
    name: NAME,
    eventType: AutoModerationRuleEventType.MessageSend,
    triggerType: AutoModerationRuleTriggerType.Keyword,
    triggerMetadata: {
      // Wildcard keywords (case-insensitive) — block URLs, invites and domains.
      keywordFilter: [
        '*http*', '*www.*', '*discord.gg*', '*discord.com/invite*', '*t.me*',
        '*.com*', '*.net*', '*.org*', '*.io*', '*.xyz*', '*.app*', '*.fun*',
        '*.fi*', '*.finance*', '*.vip*', '*.gift*', '*.claim*', '*.live*',
        '*.click*', '*.top*', '*.online*', '*.sol*', '*.link*', '*.cc*', '*.gg*',
      ],
    },
    actions,
    enabled: true,
    exemptRoles,
    exemptChannels,
    reason: 'Scam/drainer link protection',
  };

  let existing;
  try {
    const rules = await withRetry(() => guild.autoModerationRules.fetch(), 'fetch automod');
    existing = rules.find((r) => r.name === NAME);
  } catch (err) {
    log('WARN', `could not read AutoMod rules: ${err.message}`);
  }

  try {
    if (existing) {
      await withRetry(() => existing.edit(options), 'update automod rule');
      log('UPDATE', `AutoMod link-block rule (exempt: ${exemptRoles.length} roles, ${exemptChannels.length} channels)`);
      counts.updated += 1;
    } else {
      await withRetry(() => guild.autoModerationRules.create(options), 'create automod rule');
      log('CREATE', `AutoMod link-block rule (exempt: ${exemptRoles.length} roles, ${exemptChannels.length} channels)`);
      counts.created += 1;
    }
  } catch (err) {
    log('WARN', `could not set AutoMod rule: ${err.message}`);
  }
}

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

  // 0) Branding + bot identity.
  await applyBranding(guild, client);

  // 1) Categories  2) Channels  3) Roles  (per spec order)
  const categoryMap = await ensureCategories(guild);
  const builtChannels = await ensureChannels(guild, categoryMap);
  const roleMap = await ensureRoles(guild);

  // 4) Permission overwrites (needs roles to exist)
  await applyPermissions(guild, categoryMap, builtChannels, roleMap);

  // 4b) Lock down general members to text + voice, and block links via AutoMod.
  await restrictEveryone(guild);
  await ensureAutoMod(guild, roleMap);

  // Refresh the channel cache so embeds can resolve mentions/icon for new channels.
  await withRetry(() => guild.channels.fetch(), 'refetch channels');

  // 5) Canned content (post/update + pin), including the self-roles button message.
  await postContent(guild, builtChannels, roleMap);

  // 6) Farmer = default member role.
  // Discord has no native API to auto-assign a role to new joiners. engagement-bot.js
  // handles that on guildMemberAdd; alternatively set it via Server Settings ->
  // Onboarding -> Default Channels & Roles.
  const farmer = roleMap.get('Farmer');
  if (farmer) {
    const note = VERIFICATION_GATE
      ? `Farmer role ready (${farmer.id}) and used as the verification key. ` +
        'Configure Wick to grant "Farmer" after a member passes verification — do NOT auto-assign it on join.'
      : `Farmer role ready (${farmer.id}). Auto-assign on join via Carl-bot autorole or engagement-bot.js.`;
    log('INFO', note);
  }

  log(
    'DONE',
    `created=${counts.created} skipped=${counts.skipped} permsApplied=${counts.perms} ` +
      `posted=${counts.pinned} updated=${counts.updated} upToDate=${counts.pinSkipped} ` +
      `legacyRemoved=${counts.cleaned}`,
  );
  log('INFO', 'Carl-bot, Ticket Tool and Wick were left untouched (configure manually).');

  await client.destroy();
}

/**
 * Set the server icon from the logo, route Discord's native join messages to
 * #general (engagement), and make sure the bot's updated name shows by clearing
 * any stale server nickname.
 */
async function applyBranding(guild, client) {
  // Server icon (accepts a local path or URL).
  const logo = resolveAsset(ASSETS.logo);
  if (logo.kind !== 'none' && (FORCE_ICON || !guild.icon)) {
    try {
      await withRetry(
        () => guild.setIcon(logo.kind === 'file' ? logo.path : logo.url, REASON),
        'set server icon',
      );
      log('BRAND', 'server icon set from logo');
    } catch (err) {
      log('WARN', `could not set server icon: ${err.message}`);
    }
  } else if (logo.kind === 'none') {
    log('INFO', 'no logo asset found — skipping server icon (set ASSETS.logo to enable).');
  }

  // Native join messages in #general for a livelier server.
  const general = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildText && c.name === '💬・general',
  );
  if (general && guild.systemChannelId !== general.id) {
    try {
      await withRetry(() => guild.setSystemChannel(general.id, REASON), 'set system channel');
      log('BRAND', 'join messages routed to #💬・general');
    } catch (err) {
      log('WARN', `could not set system channel: ${err.message}`);
    }
  }

  // Bot identity: ensure the updated username shows by clearing a stale nickname.
  try {
    const me = await guild.members.fetchMe();
    log('INFO', `bot identity: ${client.user.tag} (nickname: ${me.nickname || 'none'})`);
    if (me.nickname) {
      await withRetry(() => me.setNickname(null, 'Show updated bot username'), 'clear nickname');
      log('BRAND', `cleared stale nickname — now showing "${client.user.username}"`);
    }
  } catch (err) {
    log('WARN', `could not adjust bot nickname: ${err.message}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}

module.exports = { EMBEDS, STRUCTURE, ROLES, SELF_ROLES };
