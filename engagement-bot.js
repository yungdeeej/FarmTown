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
 *
 * Buttons work with only the Guilds intent. Auto-role + welcome require the
 * privileged "Server Members Intent" — enable it in the Discord Developer
 * Portal (Bot -> Privileged Gateway Intents) and set WELCOME_AUTOROLE=1.
 *
 * Env:
 *   DISCORD_BOT_TOKEN   required
 *   GUILD_ID            required
 *   WELCOME_AUTOROLE    "1" to enable join auto-role + welcome (needs members intent)
 *   FARMER_ROLE         default member role name (default "Farmer")
 *   WELCOME_CHANNEL     channel name for greetings (default "💬・general")
 *   SELFTEST            "1" to log in, verify wiring, then exit (CI / smoke test)
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

const log = (tag, msg) => console.log(`[${tag}] ${msg}`);

if (!TOKEN) throw new Error('DISCORD_BOT_TOKEN is not set');
if (!GUILD_ID) throw new Error('GUILD_ID is not set');

const intents = [GatewayIntentBits.Guilds];
if (AUTOROLE) intents.push(GatewayIntentBits.GuildMembers); // privileged

const client = new Client({ intents });

client.once(Events.ClientReady, async (c) => {
  log('READY', `logged in as ${c.user.tag}`);
  log('INFO', `auto-role on join: ${AUTOROLE ? `enabled (${FARMER_ROLE})` : 'disabled'}`);

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

client.login(TOKEN).catch((err) => {
  if (/disallowed intents/i.test(err.message)) {
    console.error(
      '[FATAL] Disallowed intents. Enable the "Server Members Intent" in the Discord ' +
        'Developer Portal, or run without WELCOME_AUTOROLE=1.',
    );
  } else {
    console.error('[FATAL]', err);
  }
  process.exit(1);
});
