# FarmTown Discord Server Setup Plan

This document outlines the recommended Discord structure for the FarmTown launch community.

The goal is to keep the server simple, game-focused, safe for crypto users, and easy to moderate during launch.

Reference style: Kintara-style Discord layout with categories for information, community, economy, and support, adapted specifically for FarmTown gameplay.

---

## Server Goals

The FarmTown Discord should support:

- Official project announcements
- Safe token and contract information
- New player onboarding
- Farm sharing and friend visits
- Bug reporting
- Gameplay feedback
- Farmer's Pool discussion
- Stars and premium crop discussion
- Launch support
- Scam prevention
- Community growth

The Discord should not feel like only a token trading server. It should feel like a live farming game community with crypto features.

---

## Recommended Category Structure

```txt
📌 INFORMATION
💬 COMMUNITY
🧪 GAME TESTING
⭐ ECONOMY & TOKEN
🤖 SUPPORT
🔒 TEAM ONLY
```

---

## 📌 INFORMATION

These channels should be clean, official, and mostly read-only.

### `📣・announcements`

Purpose:

- Official announcements only
- Launch announcements
- Major game updates
- Token-related official announcements
- Important safety notices

Permissions:

- Admins can post
- Members can read
- Members should not chat here

Notes:

- This is one of the most important channels.
- Keep it clean and high signal.

---

### `📋・rules`

Purpose:

- Server rules
- Crypto safety rules
- No impersonation
- No scam links
- No fake support
- No fake contract addresses
- No financial advice

Suggested rule copy:

```txt
Welcome to FarmTown.

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
10. Breaking these rules can result in a timeout or ban.
```

Permissions:

- Admins can post
- Members can read

---

### `👋・welcome`

Purpose:

- New member landing page
- Short explanation of FarmTown
- Link to the game
- Link to how-to-play
- Link to official-links

Suggested welcome copy:

```txt
Welcome to FarmTown 🌾

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
Never share your seed phrase.
```

Permissions:

- Admins can post
- Members can read
- Optional: allow reactions only

---

### `📰・updates`

Purpose:

- Game updates
- Patch notes
- Balance changes
- New crop additions
- UI improvements
- Performance improvements

Example posts:

```txt
Update 0.3.1

- Improved Farm Menu readability
- Added new crop sprites
- Fixed tutorial dialogue layout
- Improved Farmer's Pool UI
```

Permissions:

- Admins/devs can post
- Members can read

---

### `🐞・bug-fixes`

Purpose:

- Small bug fix announcements
- Quick patch notes after deploys
- Known issue resolved posts

Example posts:

```txt
Bug Fix

- Fixed falling stars not being collectable
- Fixed players reconnecting too often
- Fixed crop hover timer display
```

Permissions:

- Admins/devs can post
- Members can read

---

### `🔗・official-links`

Purpose:

- The only trusted place for official links
- Game URL
- Landing page URL
- X/Twitter
- Token contract address
- Dex link when available
- Docs
- Support warnings

Suggested layout:

```txt
Official FarmTown Links

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
Never enter your seed phrase anywhere.
```

Permissions:

- Admins can post
- Members can read

Important:

- This channel is critical for scam prevention.
- Pin the token contract address here once final.
- Never let regular users post here.

---

### `🎮・how-to-play`

Purpose:

- Basic FarmTown guide
- Wallet login explanation
- Farming loop explanation
- Stars explanation
- Weed explanation
- Farmer's Pool explanation

Suggested guide:

```txt
How To Play FarmTown

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
FarmTown is in active development. Report bugs in 🐛・bug-reports.
```

Permissions:

- Admins can post
- Members can read

---

## 💬 COMMUNITY

These channels are for normal community activity.

### `💬・general`

Purpose:

- Main chat
- Casual talk
- Community discussion

Permissions:

- Members can chat
- Slowmode recommended during launch if needed

Recommended moderation:

- AutoMod enabled
- Block scam domains
- Block mass mentions

---

### `🌾・farm-chat`

Purpose:

- Farming strategy
- Crop discussion
- Progression discussion
- Game balance talk
- Tips for new players

Example topics:

- Best early crop
- How to expand land
- How to use Farmer's Pool
- How crop death windows work
- How Weed works

---

### `🤝・friend-farms`

Purpose:

- Players share farm links
- Players ask others to visit
- Friend farm discovery

Suggested pinned post:

```txt
Share your farm here.

Format:

Farm name:
Farm link:
What you want feedback on:

Example:
Farm name: Samosa Ranch
Farm link: https://play.YOURDOMAIN.com/?farm=your-farm-slug
Feedback: Tell me if my farm layout looks good.
```

---

### `📸・screenshots-clips`

Purpose:

- Farm screenshots
- Funny moments
- Crop flexing
- Before/after farm progress
- Social content

This channel can become useful for Twitter/X marketing.

---

### `💡・suggestions`

Purpose:

- Feature requests
- Balance suggestions
- UI feedback
- New crop ideas
- New social feature ideas

Recommended setup:

- Enable threads for each suggestion
- Or use a suggestions bot with voting

Suggested prompt:

```txt
When suggesting a feature, please include:

1. What should be added?
2. Why would it make FarmTown better?
3. Is it gameplay, UI, economy, or social?
4. Is it urgent or future polish?
```

---

### `😂・memes`

Purpose:

- Memes
- Jokes
- Lighter community content

Why separate:

- Keeps `general` readable
- Gives community a fun outlet

---

## 🧪 GAME TESTING

FarmTown is still actively being tested, so testing channels should be clear and structured.

### `🧪・test-build`

Purpose:

- Current test build link
- What testers should focus on
- Current testing instructions

Suggested pinned post:

```txt
Current FarmTown Test Build

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

Report bugs in 🐛・bug-reports.
```

---

### `🐛・bug-reports`

Purpose:

- Public bug reports
- User-submitted problems
- Screenshots and reproduction steps

Suggested bug report format:

```txt
Bug Report

What happened:

What did you expect:

Device/browser:

Wallet:

Screenshot/video:

Steps to reproduce:
1.
2.
3.
```

Recommended:

- Pin the bug format.
- Ask users not to post private wallet keys or seed phrases.
- If wallet/payment issue is private, move to ticket.

---

### `🟢・known-issues`

Purpose:

- Read-only list of known bugs
- Avoid duplicate reports
- Explain what is already being fixed

Example:

```txt
Known Issues

- Mobile UI polish is still ongoing.
- Some UI text may be cramped on small screens.
- If a farm does not load, refresh once and report it in 🐛・bug-reports.
```

Permissions:

- Admins/devs can post
- Members can read

---

### `📱・mobile-feedback`

Purpose:

- Mobile-specific UI feedback
- iPhone/Android screenshots
- Touch controls feedback

Why this matters:

- FarmTown has a lot of UI panels.
- Mobile layout issues can be easy to miss.
- Keeping this separate makes mobile polish easier.

Suggested prompt:

```txt
Mobile Feedback

Device:
Browser:
Screenshot:
What felt hard to use:
What should be bigger/smaller:
```

---

## ⭐ ECONOMY & TOKEN

These channels should be useful, but carefully moderated.

Important:

Do not let the Discord become the source of truth for contract addresses. The source of truth should be `🔗・official-links`.

---

### `⭐・stars`

Purpose:

- Stars premium currency discussion
- Buying Stars
- Stars balance issues
- Stars use cases
- Crop boosts

Suggested pinned explanation:

```txt
Stars are FarmTown's premium in-game currency.

Stars can be used for:

- Crop boosts
- Premium gameplay
- Weed seeds
- Future cosmetics/items

Stars are bought with the FarmTown token.
There are no token payouts from Stars.
There is no Stars-to-token withdrawal.
```

---

### `🌿・weed-crop`

Purpose:

- Weed premium crop discussion
- Balance feedback
- Strategy
- Stars cost feedback

Suggested pinned explanation:

```txt
Weed is FarmTown's premium crop.

Current design:

- Bought with Stars
- 30 Stars per Weed seed
- 5 hour grow time
- High Gold output
- Premium crop risk/reward
```

---

### `🏆・farmers-pool`

Purpose:

- Farmer's Pool discussion
- Reward pool explanations
- Sacrifice strategy
- Payout questions

Suggested pinned explanation:

```txt
Farmer's Pool lets players sacrifice farm progress to compete for a share of the reward pool.

Players can sacrifice:

- Gold
- Farm Points
- Levels

The more you sacrifice compared to everyone else, the larger your share of the pool.

Reward payouts are handled by the game backend.
```

---

### `📊・token-chat`

Purpose:

- Token discussion
- Price discussion
- Chart discussion
- General token community talk

Recommended:

- Add stronger moderation here than in other channels.
- No fake calls.
- No fake links.
- No impersonation.
- No financial advice.

Suggested pinned warning:

```txt
Token discussion is allowed here, but:

- No financial advice
- No fake links
- No fake contract addresses
- No impersonation
- Only trust the CA in 🔗・official-links
```

---

### `🔥・buys`

Purpose:

- Buy alerts if a bot is added later
- Optional for launch

Recommendation:

- Create it now if you want the channel ready.
- Add a bot later.
- Keep it read-only for bot messages.

---

### `🐳・whale-alerts`

Purpose:

- Whale alerts if a bot is added later
- Optional for launch

Recommendation:

- Create it only if useful.
- Could be noisy early.

---

### `⚠️・scam-alerts`

Purpose:

- Report fake links
- Report fake admins
- Report fake token contracts
- Report scam DMs

Suggested pinned post:

```txt
Scam Alert Rules

Post here if you see:

- Fake FarmTown links
- Fake token contracts
- Fake support DMs
- Fake airdrops
- Wallet-draining links
- Impersonators

Do not click suspicious links.
Only trust 🔗・official-links.
```

---

## 🤖 SUPPORT

Support should be simple. Most public support can happen in FAQ and bug reports, but wallet/payment issues should go to tickets.

### `❓・faq`

Purpose:

- Common support answers
- Reduce repeated questions

Suggested FAQ topics:

```txt
FAQ

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
A: Use 🐛・bug-reports.
```

---

### `🎫・open-a-ticket`

Purpose:

- Private support
- Wallet/payment problems
- Account-specific issues
- Sensitive bug reports

Recommended bot:

- Ticket Tool
- TicketsBot
- Sapphire ticket system

Ticket categories:

- Wallet login issue
- Stars payment issue
- Farmer's Pool issue
- Bug report
- Partnership/media

Important:

- Staff should never ask for seed phrases.
- Staff should never ask users to connect wallet to random links.
- Staff should direct users only to official links.

---

### Optional: `🧾・payment-help`

Purpose:

- Public payment help
- Stars purchase questions

Recommendation:

- Only add this if payment questions become common.
- For launch, tickets may be better and safer.

---

## 🔒 TEAM ONLY

These channels should be private.

### `team-chat`

Internal team discussion.

### `launch-room`

Launch coordination.

Use this during launch night for:

- Deployment status
- Token launch timing
- Bugs
- Emergency decisions
- Social posting schedule

### `bug-triage`

Internal bug review.

Use this to decide:

- Critical
- High
- Medium
- Low
- Not a bug

### `mod-log`

Moderation log.

Use for:

- Bans
- Timeouts
- Scam reports
- Deleted links

### `content-plan`

Marketing and content planning.

Use for:

- Tweets
- Clips
- Screenshots
- Announcements
- Meme ideas

### `bot-setup`

Bot configuration notes and testing.

---

## Recommended Roles

### Staff Roles

```txt
Founder
Admin
Moderator
Developer
Community Manager
```

### Community Roles

```txt
Farmer
Early Farmer
Bug Hunter
Content Creator
Whale
Muted
```

### Optional Future Roles

```txt
Top Farmer
Farmer's Pool Winner
OG Farmer
Weed Farmer
Star Collector
```

---

## Role Permissions

### Founder

- Full permissions
- Owns final decisions

### Admin

- Manage channels
- Manage roles
- Manage messages
- Ban members
- Configure bots

### Moderator

- Timeout members
- Delete messages
- Manage threads
- Handle scam reports
- Handle tickets

### Developer

- Post in updates
- Post in bug-fixes
- Access bug-triage
- Access launch-room

### Community Manager

- Post announcements if approved
- Manage community channels
- Help with support
- Run events

### Farmer

- Default member role
- Can chat in public channels

### Early Farmer

- Early member role
- Cosmetic/status role

### Bug Hunter

- Given to helpful testers

### Muted

- Cannot send messages

---

## Recommended Bots

### Moderation Bot

Options:

- Carl-bot
- Dyno
- Sapphire

Use for:

- AutoMod
- Bad link filtering
- Anti-spam
- Reaction roles
- Logging

---

### Ticket Bot

Options:

- Ticket Tool
- TicketsBot
- Sapphire

Use for:

- Payment issues
- Wallet issues
- Private support
- Scam reports

---

### Security / Anti-Raid Bot

Options:

- Wick
- Beemo
- Security

Use for:

- Anti-raid
- Anti-scam
- Suspicious link blocking
- Mass mention blocking

---

### Optional Buy Bot

Use later for:

- Token buy alerts
- Whale alerts

Do not rush this if token launch is already stressful.

---

## Channels To Avoid For Now

Avoid adding these at launch unless there is a clear need:

```txt
trades
marketplace
otc
alpha-calls
price-predictions
giveaways
airdrops
staking
nft-market
```

Reason:

- They create moderation risk.
- They attract scammers.
- They shift focus away from the game.
- FarmTown does not need them for the first Discord launch.

If trading discussion is needed, keep it inside `📊・token-chat`.

---

## Launch Server Checklist

Before inviting the public:

```txt
[ ] Create Discord server
[ ] Add categories
[ ] Add public channels
[ ] Add private team channels
[ ] Add roles
[ ] Lock announcement/rules/official-links channels
[ ] Add moderation bot
[ ] Add ticket bot
[ ] Add anti-scam protection
[ ] Add official game link
[ ] Add official website link
[ ] Add token CA when final
[ ] Pin rules
[ ] Pin official links
[ ] Pin bug report format
[ ] Pin how-to-play guide
[ ] Test public member permissions
[ ] Test ticket creation
[ ] Test announcement permissions
[ ] Test scam link blocking
[ ] Make sure admins have 2FA enabled
```

---

## Recommended Launch Announcement Template

```txt
FarmTown is live 🌾

Start your farm:
https://play.YOURDOMAIN.com

Website:
https://YOURDOMAIN.com

FarmTown is a browser-native multiplayer farming game where you can:

- Grow crops
- Visit friend farms
- Collect Stars
- Plant premium Weed
- Compete in Farmer's Pool
- Build your farm over time

Important:
Only trust links in 🔗・official-links.
Admins will never DM you first.
Never share your seed phrase.
```

---

## Recommended Pinned Safety Message

Pin this in `general`, `token-chat`, and `official-links`:

```txt
Safety Reminder

Only trust links posted in 🔗・official-links.
Admins and moderators will never DM you first.
Never share your seed phrase.
Never connect your wallet to links sent in DMs.
There is no secret mint, no private airdrop, and no support wallet.
```

---

## Suggested Final Channel List

```txt
📌 INFORMATION
  📣・announcements
  📋・rules
  👋・welcome
  📰・updates
  🐞・bug-fixes
  🔗・official-links
  🎮・how-to-play

💬 COMMUNITY
  💬・general
  🌾・farm-chat
  🤝・friend-farms
  📸・screenshots-clips
  💡・suggestions
  😂・memes

🧪 GAME TESTING
  🧪・test-build
  🐛・bug-reports
  🟢・known-issues
  📱・mobile-feedback

⭐ ECONOMY & TOKEN
  ⭐・stars
  🌿・weed-crop
  🏆・farmers-pool
  📊・token-chat
  🔥・buys
  🐳・whale-alerts
  ⚠️・scam-alerts

🤖 SUPPORT
  ❓・faq
  🎫・open-a-ticket

🔒 TEAM ONLY
  team-chat
  launch-room
  bug-triage
  mod-log
  content-plan
  bot-setup
```

---

## Best Minimal Launch Version

If time is tight, launch with this smaller version first:

```txt
📌 INFORMATION
  📣・announcements
  📋・rules
  👋・welcome
  🔗・official-links
  🎮・how-to-play

💬 COMMUNITY
  💬・general
  🤝・friend-farms
  📸・screenshots-clips
  💡・suggestions

🧪 GAME TESTING
  🐛・bug-reports
  🟢・known-issues

⭐ ECONOMY & TOKEN
  ⭐・stars
  🏆・farmers-pool
  📊・token-chat
  ⚠️・scam-alerts

🤖 SUPPORT
  ❓・faq
  🎫・open-a-ticket

🔒 TEAM ONLY
  team-chat
  launch-room
  bug-triage
  mod-log
```

This is probably the best version for launch night.

It is clean, understandable, and less overwhelming.

---

## Final Recommendation

For FarmTown launch, use the smaller launch version first.

After the community grows, add:

- `😂・memes`
- `🌾・farm-chat`
- `📱・mobile-feedback`
- `🔥・buys`
- `🐳・whale-alerts`

The most important launch channels are:

- `🔗・official-links`
- `📋・rules`
- `🎮・how-to-play`
- `🐛・bug-reports`
- `🎫・open-a-ticket`
- `⚠️・scam-alerts`

These protect users, reduce confusion, and make the community easier to manage during launch.

