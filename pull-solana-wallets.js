#!/usr/bin/env node
/**
 * Pull every Solana wallet address posted in a channel.
 *
 * Scans all messages in the target channel, extracts valid Solana addresses
 * (base58 that decodes to a 32-byte public key), and skips normal chat and
 * non-Solana addresses (e.g. Ethereum 0x... addresses).
 *
 *   DISCORD_BOT_TOKEN=...  GUILD_ID=...  [WALLET_CHANNEL='🧪・beta-testers']
 *   node pull-solana-wallets.js
 *
 * Writes results to solana-wallets.csv (wallet,username,date) and prints them.
 */

'use strict';

const fs = require('fs');
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL = process.env.WALLET_CHANNEL || '🧪・beta-testers';

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Decode base58 -> byte length, or -1 if it contains a non-base58 char.
function base58ByteLength(str) {
  const bytes = [];
  for (const ch of str) {
    let carry = B58.indexOf(ch);
    if (carry < 0) return -1;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let k = 0; k < str.length && str[k] === '1'; k++) bytes.push(0);
  return bytes.length;
}

// A Solana public key is exactly 32 bytes.
function isSolanaAddress(s) {
  if (/^0x/i.test(s)) return false; // Ethereum etc.
  return base58ByteLength(s) === 32;
}

const CANDIDATE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async (c) => {
  const guild = await c.guilds.fetch(GUILD_ID);
  await guild.channels.fetch();
  const channel = guild.channels.cache.find(
    (x) => x.type === ChannelType.GuildText && x.name === CHANNEL,
  );
  if (!channel) {
    console.error(`Channel "${CHANNEL}" not found.`);
    await c.destroy();
    return;
  }

  // Fetch the full message history.
  let messages = [];
  let before;
  for (;;) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!batch.size) break;
    messages = messages.concat([...batch.values()]);
    before = batch.last().id;
    if (batch.size < 100) break;
  }

  const found = new Map(); // wallet -> { user, date }
  for (const m of messages) {
    if (!m.content || m.author.bot) continue;
    for (const cand of m.content.match(CANDIDATE) || []) {
      if (isSolanaAddress(cand) && !found.has(cand)) {
        found.set(cand, { user: m.author.username, date: m.createdAt.toISOString().slice(0, 10) });
      }
    }
  }

  console.log(`Scanned ${messages.length} messages in #${CHANNEL}.`);
  console.log(`Found ${found.size} unique Solana wallet(s).\n`);
  const rows = ['wallet,username,date'];
  for (const [wallet, info] of found) {
    console.log(`${wallet}  —  ${info.user} (${info.date})`);
    rows.push(`${wallet},${info.user},${info.date}`);
  }
  if (found.size) {
    fs.writeFileSync('solana-wallets.csv', rows.join('\n') + '\n');
    console.log('\nSaved -> solana-wallets.csv');
  }

  await c.destroy();
});

client.login(TOKEN);
