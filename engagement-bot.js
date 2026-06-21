#!/usr/bin/env node
/**
 * FarmTown engagement bot (persistent companion to discord-setup.js).
 *
 * Runs continuously and handles the things a one-shot setup script can't:
 *
 *   1. Self-role buttons  — toggles opt-in ping/interest roles when members
 *      click the buttons on the #get-roles message (customId "selfrole:<id>").
 *   2. Auto-role on join  — assigns the default member role (Farmer) to new
 *      members, finally making Farmer a true "default member role".
 *   3. Welcome greeting    — posts a friendly welcome embed mentioning the new
 *      member in the welcome channel.
 *   4. Auto-responder      — when someone asks about play-to-earn / token /
 *      features / roadmap in a chat channel, posts a canned reply — but skips it
 *      if the same reply is already within the last N messages (no spam).
 *
 * Buttons work with only the Guilds intent. Auto-role + welcome require the
 * privileged "Server Members Intent". The auto-responder requires the privileged
 * "Message Content Intent". Enable these in the Discord Developer Portal
 * (Bot -> Privileged Gateway Intents) and set the matching env flags.
 *
 * Env:
 *   DISCORD_BOT_TOKEN     required
 *   GUILD_ID              required
 *   WELCOME_AUTOROLE      "1" to enable join auto-role + welcome (members intent)
 *   FARMER_ROLE           default member role name (default "Farmer")
 *   WELCOME_CHANNEL       channel name for greetings (default "💬・general")
 *   AUTORESPONDER         "1" to enable the P2E/token/features auto-reply
 *                         (needs Message Content Intent)
 *   AUTO_REPLY_CHANNELS   comma-separated channel names (default general/token-chat/farm-chat)
 *   AUTO_REPLY_WINDOW     don't repeat if posted within the last N messages (default 15)
 *   SELFTEST              "1" to log in, verify wiring, then exit (CI / smoke test)
 *
 * This bot never touches Carl-bot, Ticket Tool or Wick.
 */

'use strict';

const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  PermissionsBitField,
  MessageFlags,
} = require('discord.js');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const AUTOROLE = process.env.WELCOME_AUTOROLE === '1';
const FARMER_ROLE = process.env.FARMER_ROLE || 'Farmer';
const WELCOME_CHANNEL = (process.env.WELCOME_CHANNEL || '💬・general').toLowerCase();
const SELFTEST = process.env.SELFTEST === '1';

// Auto-responder config.
const AUTORESPONDER = process.env.AUTORESPONDER === '1';
const AUTO_REPLY_CHANNELS = (process.env.AUTO_REPLY_CHANNELS || '💬・general,📊・token-chat,🌾・farm-chat')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const AUTO_REPLY_WINDOW = Number(process.env.AUTO_REPLY_WINDOW || 15);
const AUTO_REPLY_TITLE = "🚜 What's Coming to FarmTown";
// Triggers: play-to-earn, token, roadmap, features, "what's coming/next", etc.
const AUTO_REPLY_TRIGGER =
  /\bp2e\b|play[\s-]?2[\s-]?earn|play[\s-]?to[\s-]?earn|road\s?map|tokenomics|what'?s\s+(coming|next)|when\s+(is\s+)?(the\s+)?(token|p2e|launch|utility|features?|airdrop|rewards?)|token\s+(utility|launch|use|do)|utility|airdrop|when\s+(moon|features?)|earn(ing)?\s+(real|money|crypto|sol|rewards|tokens?)/i;

const log = (tag, msg) => console.log(`[${tag}] ${msg}`);

// Impersonation guard config.
const IMPERSONATION_GUARD = process.env.IMPERSONATION_GUARD === '1';
const STAFF_ROLE_NAMES = ['Founder', 'Admin', 'Moderator', 'Developer', 'Community Manager'];
const MODLOG_CHANNEL = (process.env.MODLOG_CHANNEL || 'mod-log').toLowerCase();
// High-confidence impersonation terms (auto-timeout + alert).
const IMPERSONATION_HIGH = (process.env.IMPERSONATION_HIGH ||
  'official,farmtown,farm town,support team,team ★,mod team,admin team,dev team,diddy,sully,farmerdiddy,idontcheat')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
// Lower-confidence terms (alert only).
const IMPERSONATION_MED = (process.env.IMPERSONATION_MED ||
  'support,admin,moderator,developer,staff,team,announcement')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

if (!TOKEN) throw new Error('DISCORD_BOT_TOKEN is not set');
if (!GUILD_ID) throw new Error('GUILD_ID is not set');

const intents = [GatewayIntentBits.Guilds];
if (AUTOROLE || IMPERSONATION_GUARD) intents.push(GatewayIntentBits.GuildMembers); // privileged
if (AUTORESPONDER) intents.push(GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent); // MessageContent privileged

const client = new Client({ intents });

client.once(Events.ClientReady, async (c) => {
  log('READY', `logged in as ${c.user.tag}`);
  log('INFO', `auto-role on join: ${AUTOROLE ? `enabled (${FARMER_ROLE})` : 'disabled'}`);
  log('INFO', `auto-responder: ${AUTORESPONDER ? `enabled in [${AUTO_REPLY_CHANNELS.join(', ')}] (window ${AUTO_REPLY_WINDOW})` : 'disabled'}`);
  log('INFO', `impersonation guard: ${IMPERSONATION_GUARD ? 'enabled' : 'disabled'}`);

  if (SELFTEST) {
    try {
      const guild = await c.guilds.fetch(GUILD_ID);
      await guild.roles.fetch();
      const farmer = guild.roles.cache.find((r) => r.name === FARMER_ROLE);
      log('SELFTEST', `guild: ${guild.name}`);
      log('SELFTEST', `Farmer role: ${farmer ? farmer.id : 'NOT FOUND'}`);
      const me = await guild.members.fetchMe();
      const canManage = me.permissions.has(PermissionsBitField.Flags.ManageRoles);
      log('SELFTEST', `ManageRoles permission: ${canManage}`);
      if (farmer && me.roles.highest.comparePositionTo(farmer) <= 0) {
        log('SELFTEST', 'WARNING: bot role is not above Farmer — move it up to assign roles.');
      }
      log('SELFTEST', 'OK — wiring looks good. Exiting.');
    } catch (err) {
      log('SELFTEST', `FAILED: ${err.message}`);
      process.exitCode = 1;
    }
    await c.destroy();
  }
});

// --- Self-role buttons -----------------------------------------------------

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('selfrole:')) return;

  const roleId = interaction.customId.slice('selfrole:'.length);
  const role = interaction.guild?.roles.cache.get(roleId);
  if (!role) {
    return interaction.reply({ content: 'That role no longer exists.', flags: MessageFlags.Ephemeral });
  }

  const me = interaction.guild.members.me;
  if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
      me.roles.highest.comparePositionTo(role) <= 0) {
    return interaction.reply({
      content: `I can't manage **${role.name}**. Ask an admin to move my role above it.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    const member = interaction.member;
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId, 'Self-role toggle off');
      await interaction.reply({ content: `Removed **${role.name}**.`, flags: MessageFlags.Ephemeral });
    } else {
      await member.roles.add(roleId, 'Self-role toggle on');
      await interaction.reply({ content: `Added **${role.name}**! 🎉`, flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    log('ERROR', `self-role toggle failed: ${err.message}`);
    if (!interaction.replied) {
      await interaction.reply({ content: 'Something went wrong — try again.', flags: MessageFlags.Ephemeral });
    }
  }
});

// --- Auto-role + welcome on join ------------------------------------------

client.on(Events.GuildMemberAdd, async (member) => {
  if (!AUTOROLE || member.user.bot) return;

  // Default member role.
  const farmer = member.guild.roles.cache.find((r) => r.name === FARMER_ROLE);
  if (farmer) {
    try {
      await member.roles.add(farmer, 'Default member role on join');
      log('JOIN', `assigned ${FARMER_ROLE} to ${member.user.tag}`);
    } catch (err) {
      log('ERROR', `could not assign ${FARMER_ROLE}: ${err.message}`);
    }
  }

  // Welcome greeting.
  const channel = member.guild.channels.cache.find(
    (c) => c.isTextBased?.() && c.name === WELCOME_CHANNEL,
  );
  if (channel) {
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🌾 A new farmer has arrived!')
      .setDescription(
        `Welcome ${member}, glad to have you in **${member.guild.name}**!\n` +
          'Grab your roles, read the pins, and start your farm. 🚜',
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: 'FarmTown 🌾' });
    try {
      await channel.send({ content: `${member}`, embeds: [embed] });
    } catch (err) {
      log('ERROR', `could not send welcome: ${err.message}`);
    }
  }
});

// --- Auto-responder: P2E / token / features / roadmap questions ------------

function buildAutoReplyEmbed(guild) {
  const ch = (name) => {
    const c = guild.channels.cache.find((x) => x.name === name.toLowerCase());
    return c ? `<#${c.id}>` : `#${name}`;
  };
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(AUTO_REPLY_TITLE)
    .setDescription(
      'Great question! 🌱 Right now the team is **heads-down making sure the foundation is top-tier** — ' +
        'so that when we build out features, everything runs smoothly.\n\n' +
        '**Play-to-earn, token utility, and new features** are all part of the vision — but we’re building ' +
        'on solid ground first. A stable, great game comes before everything else.\n\n' +
        `📌 Trust only ${ch('🔗・official-links')} and ${ch('📣・announcements')} for real updates.\n` +
        `❓ Check ${ch('❓・faq')} for common questions.\n\n` +
        'Good farms take time to grow — thanks for being early. 🚜',
    )
    .setFooter({ text: 'FarmTown 🌾' });
}

client.on(Events.MessageCreate, async (msg) => {
  if (!AUTORESPONDER) return;
  if (msg.author.bot || !msg.guild || !msg.content) return;
  if (!AUTO_REPLY_CHANNELS.includes((msg.channel.name || '').toLowerCase())) return;
  if (!AUTO_REPLY_TRIGGER.test(msg.content)) return;

  try {
    // Don't repeat if our reply is already within the last N messages.
    const recent = await msg.channel.messages.fetch({ limit: AUTO_REPLY_WINDOW });
    const alreadySaid = recent.some(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title === AUTO_REPLY_TITLE,
    );
    if (alreadySaid) {
      log('AUTOREPLY', `skipped in #${msg.channel.name} — already within last ${AUTO_REPLY_WINDOW} messages`);
      return;
    }
    await msg.channel.send({ embeds: [buildAutoReplyEmbed(msg.guild)] });
    log('AUTOREPLY', `replied in #${msg.channel.name} (triggered by ${msg.author.tag})`);
  } catch (err) {
    log('ERROR', `auto-responder: ${err.message}`);
  }
});

// --- Impersonation guard: catch members posing as staff -------------------

function checkImpersonation(member) {
  // Never flag real staff.
  const hasStaffRole = member.roles.cache.some((r) => STAFF_ROLE_NAMES.includes(r.name));
  if (hasStaffRole) return null;

  const blob = [member.user.username, member.user.globalName || '', member.nickname || '', member.displayName]
    .join(' | ')
    .toLowerCase();

  const high = IMPERSONATION_HIGH.find((k) => blob.includes(k));
  if (high) return { confidence: 'high', term: high, blob };
  const med = IMPERSONATION_MED.find((k) => blob.includes(k));
  if (med) return { confidence: 'med', term: med, blob };
  return null;
}

async function handlePossibleImpersonator(member, hit) {
  const guild = member.guild;
  const modlog = guild.channels.cache.find((c) => c.isTextBased?.() && c.name === MODLOG_CHANNEL);

  // High confidence: timeout 7 days so they can't post while staff review.
  let actioned = 'flagged (alert only)';
  if (hit.confidence === 'high') {
    try {
      await member.timeout(7 * 24 * 60 * 60 * 1000, `Impersonation guard: matched "${hit.term}"`);
      actioned = 'timed out 7d (review + ban)';
    } catch (err) {
      actioned = `could not timeout (${err.message}) — staff please ban`;
    }
  }

  log('IMPERSONATION', `${member.user.tag} display:"${member.displayName}" matched "${hit.term}" [${hit.confidence}] -> ${actioned}`);

  if (modlog) {
    const embed = new EmbedBuilder()
      .setColor(hit.confidence === 'high' ? 0xed4245 : 0xf1c40f)
      .setTitle('🕵️ Possible staff impersonator')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member} (\`@${member.user.username}\`)`, inline: false },
        { name: 'Display name', value: `\`${member.displayName}\``, inline: true },
        { name: 'Matched', value: `\`${hit.term}\` (${hit.confidence})`, inline: true },
        { name: 'Account age', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Action', value: actioned, inline: false },
      )
      .setFooter({ text: 'FarmTown 🛡️ • verify and ban if it is an impersonator' });
    try { await modlog.send({ embeds: [embed] }); } catch (e) { /* ignore */ }
  }
}

if (IMPERSONATION_GUARD) {
  client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;
    const hit = checkImpersonation(member);
    if (hit) await handlePossibleImpersonator(member, hit).catch((e) => log('ERROR', `guard: ${e.message}`));
  });
  // Catch members who change their name AFTER joining.
  client.on(Events.GuildMemberUpdate, async (oldM, newM) => {
    if (newM.user.bot) return;
    if (oldM.displayName === newM.displayName && oldM.nickname === newM.nickname) return;
    const hit = checkImpersonation(newM);
    if (hit) await handlePossibleImpersonator(newM, hit).catch((e) => log('ERROR', `guard: ${e.message}`));
  });
}

client.login(TOKEN).catch((err) => {
  if (/disallowed intents/i.test(err.message)) {
    console.error(
      '[FATAL] Disallowed intents. Enable the required Privileged Gateway Intents in the ' +
        'Discord Developer Portal: "Server Members Intent" for WELCOME_AUTOROLE, and ' +
        '"Message Content Intent" for AUTORESPONDER. Or run without those flags.',
    );
  } else {
    console.error('[FATAL]', err);
  }
  process.exit(1);
});
