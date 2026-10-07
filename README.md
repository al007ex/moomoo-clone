# MooMoo.io Private Server

A local MooMoo.io server that runs the **current official client** (v1.9.0, bundle
`index-228e9652.js`), speaking the real packet protocol and anti-tamper system, with a
local stand-in for every online service the client expects (accounts, servers, clans,
profiles, captcha, ads).

> Fan project for personal use. MooMoo.io, its client code, art and names belong to their
> owners (MooMoo.io / FRVR). The game's real server code isn't public: anything marked
> **reconstructed** below was designed for this server from what the client shows and
> may differ from how the live game behaves.

---

## Quick start

```bash
npm install
npm run build      # patches the official client into dist/official
npm start          # http://localhost:8080
```

Open <http://localhost:8080>. Press **Play as Guest**, or **Sign In** with any email and any
6-digit code.

Admin console (in a second terminal while the server runs):

```bash
npm run console              # interactive prompt
npm run console -- tp me falls
```

---

## Showcase: what to show in a video

Legend: **[client]** comes straight from the official client (data, visuals, UI).
**[reconstructed]** is server behaviour designed here because the real server code isn't
public. **[hidden]** is in the client but not normally reachable or visible.

### Raid boss: the Crab King **[client visuals / reconstructed fight]**
A 480,000 HP crab that fights alone in the **secret pool** west of the map. Its health bar appears at the top
of the screen while you're in the pool. It turns **blue** while the King is underwater,
when it can't be hurt.

| Move | What you see | Preview |
|---|---|---|
| Dive | sinks into a dark silhouette with bubbles, glides under the water, surfaces with a blue ring and a white splash | `boss crab attack dive` |
| Slam | orange danger circle around the King, then a heavy knockback | `boss crab attack slam` |
| Geysers | the whole pool fills with dotted bubble geysers that erupt together | `boss crab attack geysers` |
| Claw | red chevron lines race out toward players | `boss crab attack claw` |

- It attacks faster as its health drops (`boss crab hp 30` jumps to a late phase).
- On a kill, everyone who did at least 5% of the damage earns the **Crab Shell** hat. The
  🦀 *"Killed the Crab King"* badge appears next to their name on the leaderboard.
  The whole server gets a chat announcement, and clans get a "raid boss kill".
- It respawns 10 minutes later. `bossfight crab me god` starts a fresh fight on demand.

The effect visuals (colours, rings, chevrons, bubbles, the blue bar and the dive animation)
are drawn by the official client. The attack choice, timing and damage are reconstructed,
based on footage of the real fight.

### The secret area **[client map / reconstructed physics]**
West of the map edge at river level is a **gorge** leading to **The Falls**, a chain
of **pools** and a **waterfall**. The map (gorge walls, sand, water, waterfall) is drawn by the
client from its `secretPool` config. The server lets players walk there (the client's own
map-edge clamp would not) and treats the pools as deep water.

`tp me gorge`, `tp me falls`, `tp me pool`, `tp me waterfall`

### Other bosses **[client]**
| Boss | Where | Preview |
|---|---|---|
| **MOOSTAFA**: 18k HP, leaps, 1-minute respawn | desert | `bossfight moostafa me` |
| **MOOFIE**: giant fast wolf, charges players, 30 s respawn | snow | `bossfight moofie me` |
| **Treasure**: 20k HP chest worth 5,000 gold | grassland | `bossfight treasure me` |

### New mobs **[client]**
| Mob | Notes | Preview |
|---|---|---|
| Boar | hostile, charges, 900 HP | `spawn boar 3` |
| Yeti | hostile, leaps, 3,200 HP (lives in the snow) | `spawn yeti` |
| Sheep | passive, drops 150 food | `spawn sheep 5` |

*Sprites: boar, yeti and Crab King images aren't in this project yet (see [Missing assets](#missing-assets)).*

### Hidden staff features **[hidden / client UI]**
The client contains a full staff toolkit. Make your account an admin (`npm run console --
role <your name> admin`, then rejoin) and a **shield button** appears next to the store:

- **Powers:** God, **Aura** (glowing aura around the player), **Godlike**, **Boss** (you become a
  raid boss: everyone else sees a boss health bar for *you*), Invisible
- **Multipliers:** size, damage, speed and health
- **Spawn** any animal, **go to** The Falls / Centre / Snow, **go to mob** (Crab King, MOOSTAFA…),
  **go to / summon** players
- **Give** any weapon in any variant (including **emerald**), items, and 1k of each resource
- **Delete tribe**, the staff **minimap** (shows everyone), joining full servers
- **Moderation:** **Ban** and **Shadow** buttons in the report menu, staff panel on profiles
  (reports, anti-cheat flags, verdicts), shadowing players on the top boards

Same from the console: `godlike me`, `aura me`, `bossmode me`, `invisible me`, `size me 3`.

### New gear **[client data / reconstructed effects]**
- **Hats:** Scout Hat (faster, more damage taken), Frost Helm (normal speed in snow, less damage),
  **Crab Shell** (Crab King drop: reflects damage, less damage taken). `hat me crab shell equip`
- **Emerald weapons:** the 5th variant above ruby, **members only**, with **15% lifesteal**.
  `weapon me katana emerald`
- **Accessory effects:** every accessory now has a real effect. The client only ships the
  descriptions, so the numbers are reconstructed: Tree / Stone / Cookie Cape (+1 resource per
  hit), Cow Cape (1.5× from cows), Snowball / Winter Cape (less or no snow slowdown), Skull Cape
  (3× gold for killing the kill leader), Dash Cape (+5% speed), Dragon Cape (+5% damage after a
  hit), Super Cape (after a kill: +5% damage, +15% speed), Troll Cape (2× gold for spike kills),
  Thorns (heals a little on hit), Blockades (−25% projectile damage), Devils Tail (bleed).
  `accessory me dragon cape equip`

### Accounts, profiles, clans **[client UI / local backend]**
- **Sign in** with the real email-code card (any code works), or "Use password instead"
  (any password). Your first name becomes **permanent**.
- **Members-only servers** in the server picker (shield icon, 80 players). Signed-in players
  get them by default.
- **Profiles:** lifetime combat stats, K/D, resources, animal and boss kills per species, best
  score, lives, playtime, recent day / week / month stats, socials, and a **live** "this life"
  panel while the player is in game.
- **Clans:** persistent 3–4 letter clans with owner / officer / member ranks, invites, join
  requests, past members, clan stats and raid kills. Clan tags appear on the leaderboard
  (`[CLAN]`, `[tribe:CLAN]`, `[solo:CLAN]`).
- **Top boards:** players and clans by kills this week, this month and all time, plus the menu
  spotlight ("Player of the week: …").

### Anti-cheat you can demo **[client + server]**
- **Userscript detection:** with Tampermonkey or Violentmonkey installed, a red banner appears:
  *"…that can modify the game was detected"*.
- **Shame!** hat: eat 8 times within 120 ms of being hit and you're shamed for 30 s
  (no eating). `shame me` forces it.
- **Debugger trap:** with DevTools open, the page keeps pausing (the client's anti-debug).
- **Tamper-proof traffic:** edited, replayed or forged packets get you disconnected
  ("Could not verify the connection").
- **Old client:** after `npm run start:new-build`, open pages show *"Game updated - please reload"*.

### Dormant code found in the client **[hidden]**
- `DAY_INTERVAL` = 24 minutes: a day/night cycle constant whose rendering has been removed.
- `MAX_ATTACK`, `MAX_SPEED`, `MAX_TURN_SPEED`: animal tuning that's multiplied by 0 (inactive).
- **Crab** and **Crabling**: two diving crab mobs defined in the client's animal table
  (entries 13 and 14) that never appear in the game. The Crab King is the only crab.
- A **friends** system (FRVR social: friend requests, online presence, invites). It needs FRVR's
  servers, so it's off here.
- A localhost developer mode (`?api=local`, `?cf=interactive`, debug renderer globals). The
  patch disables it so the page behaves exactly like moomoo.io.

---

## Admin console

The console runs inside the server and is reached through `npm run console`. It only accepts
requests from this computer that carry the token in `server/data/admin.token`.

```text
moomoo> me alex                       # tell it who "me" is
moomoo> tp me falls
moomoo> spawn yeti 3 near me
moomoo> bossfight crab me god
moomoo> boss crab attack geysers
```

Players can be named by name, prefix, `#sid` or `me`. Places: `centre river snow desert gorge
falls pool lair waterfall nw ne sw se moostafa moofie treasure` (`places` lists coordinates).

| Command | What it does |
|---|---|
| `players`, `where <p>`, `status` | who is online, positions, biomes, servers |
| `tp <p> <place \| x y \| player \| mob <animal>>` | teleport |
| `bring <p> [to <p>]` | pull a player to you |
| `spawn <animal> [n] [near <p> \| at <place\|x y>]` | spawn animals (they don't respawn) |
| `animals [list]`, `clear <animal\|spawned\|all> [server]` | list or remove animals |
| `boss <crab\|moostafa\|moofie\|treasure> status\|spawn\|tp <p>\|hp <1-100>` | boss control |
| `boss crab attack <slam\|geysers\|claw\|dive>` | force a Crab King move |
| `bossfight <boss> [p] [god]` | fresh boss + teleport into the arena |
| `bossmode <p> [on\|off]` | turn a player into a raid boss |
| `god`, `godlike`, `aura`, `invisible <p> [on\|off]` | powers |
| `size`, `speed`, `damage`, `maxhealth <p> <x>` | multipliers |
| `heal <p>`, `kill <p>`, `shame <p> [s]` | health |
| `give <p> <wood\|food\|stone\|gold> <n>`, `age <p> <n>` | resources and ages (with upgrade picks) |
| `weapon <p> <name> [gold\|diamond\|ruby\|emerald]`, `item <p> <name>` | gear |
| `hat <p> <name> [equip]`, `accessory <p> <name> [equip]` | cosmetics (incl. Crab Shell) |
| `announce <text>`, `restart <s>` | chat notice, "Server restarting in m:ss" banner (stays until players rejoin) |
| `kick`, `ban`, `unban`, `role <name> <admin\|mod\|none>`, `flags <p>` | moderation |

### Scene scripts for a video
```text
# Crab King raid
bossfight crab me god
boss crab attack dive
boss crab attack geysers
boss crab attack claw
boss crab hp 25            # final phase: faster attacks
god me off

# Tour of the secret area
tp me gorge
tp me falls
tp me waterfall

# Mob parade
tp me centre
spawn boar 2
spawn yeti
spawn sheep 4

# Become the raid boss
bossmode me on
announce A wild boss appeared!
```

---

## How it works

```
browser (official client, patched)                 this server
------------------------------------------------   --------------------------------------
index.html  import map -> /p/<id>.js  ------------> protocol build (BUILD_ID, salt, mixKey)
shim.js     FRVR SDK, Turnstile, ads  ------------> /api/auth/*  (any code / password)
fetch(Ee + ...) server list, join, profiles ------> /api/*       accounts, clans, top, tickets
WebSocket ws://host/s/<server>?token=tk:..&b=.. --> gate -> io-init -> keyed frames -> Game
```

### Official client (`client-official/`, `tools/build-official-client.mjs`)
`client-official/source/` holds the files saved from moomoo.io, unmodified. `npm run build`
creates `dist/official/` by:

1. **Patching the bundle** with exact string replacements. Each must match exactly once, so a
   newer moomoo build fails loudly instead of half-working:
   - `const Ne=!1` makes the client behave as on moomoo.io: anti-tamper on, `/join` tickets,
     no dev globals.
   - The API base `Ee` points to `/api` on this server.
   - Servers in region `"local"` live on this host at `/s/<key>`.
   - Sockets use `ws://` when the page is served over `http://`.
   - Server pings use the page's protocol.
   - The FRVR social API points to this server.
2. **Restoring the static page** from the saved snapshot. It removes the injected CookiePro
   banner, the Turnstile iframe, ads and browser-extension leftovers, empties the containers
   the game fills itself, and adds the import map, `shim.js` and the module script.
3. **Adding `shim.js`**, a local FRVR SDK (bootstrapper, tracker, ads, profile, **auth**), an
   instant-pass Turnstile, and ad / consent no-ops.

`npm run build:no-anti-debug` also turns off the debugger trap. Use it if you need DevTools.

### Protocol (`server/src/protocol/`)
Everything here mirrors the client function named in brackets. It was verified against the
client's own code with 14,900 automated checks.

- **Build module** `/p/<id>.js` exports `BUILD_ID`, `BUILD_SALT` and `mixKey`, as moomoo.io's
  per-deploy module does. This server generates its own: a random id, salt and ARX key mixer.
  It's kept in `server/data/protocol-build.json`, and `npm run start:new-build` rolls it.
- **URL** `ws://host/s/<server>?token=tk:<ticket>&b=<BUILD_ID>`
- **Handshake** (the only plain frame): `["io-init", [socketId, seed, keyHex, 1, 1]]`
  - `key = mixKey(hex(keyHex), seed)`
  - packet tables are a mulberry32 Fisher–Yates shuffle of the packet names, seeded with
    `seed ^ imul(BUILD_SALT, 2654435761)` [Ql/Vl/wf]
- **Client → server frame:** `tag(6) || mask(msgpack([id, args, seq]))`
  - `tag` = HMAC-SHA256(key, body)[0..6] [vf/Wf]
  - `mask` = xorshift32 keystream seeded with `c2sSeed ^ u32(tag)` [Kl/Cf]
  - `seq` must be exactly the previous `seq` + 1
- **Server → client frame:** `mask(msgpack([id, args]))`, seeded with
  `s2cSeed ^ imul(n, 2654435761)` for the n-th frame [Ef]
- **Close codes:**

  | Code | Client message |
  |---|---|
  | 4001 | Invalid Connection |
  | 4002 | Game updated - please reload |
  | 4003 | Sign in to play on this server |
  | 4004 | Please play at moomoo.io |

**Client → server packets (21):**

| Id | Meaning | Id | Meaning |
|---|---|---|---|
| `M` | spawn `{name, moofoll, skin}` | `D` | aim direction |
| `9` | move direction (null = stop) | `e` | reset movement |
| `F` | mouse `[down, buildDir]` | `z` | select `[index, isWeapon]` |
| `H` | upgrade pick | `K` | `0` lock rotation, `1` auto-gather |
| `L` | create tribe | `N` | leave tribe |
| `b` | request to join | `P` | answer request `[sid, accept]` |
| `Q` | kick member | `c` | store `[0 buy \| 1 equip, id, isAccessory]` |
| `6` | chat (≤30 characters) | `S` | map ping |
| `0` | ping | `T` | **telemetry** `[flags, untrustedEvents]` |
| `R` | report `[sid]`, or staff `[sid, 1 shadow \| 2 ban]` | `A` | admin command |
| `V` | watch live stats `[sid]` | | |

**Server → client packets (38):**

| Id | Meaning | Id | Meaning |
|---|---|---|---|
| `io-init` | handshake | `A` | `{teams}` |
| `B` | disconnect reason | `C` | your sid |
| `D` | player data (13 fields incl. aura, boss mode, clan) | `E` | player left |
| `a` | positions `[sid,x,y,dir·100]`, changed attributes `[sid,build,weapon,variant,team,leader,hat,tail,icon,z]`, hidden sids | `G` | leaderboard (entries, roles, dead, 🦀, clan tags, tribes) |
| `H` | new objects | `I` | animals `[sid,type,x,y,dir·100,hp,name,state]` + hidden |
| `J` | animal attack animation | `K` | swing animation |
| `L` | object wiggle | `M` | turret shot |
| `N` | resource / stat value | `O` | health |
| `P` | you died | `Q` | object removed |
| `R` | objects removed | `S` | item count |
| `T` | XP / age | `U` | upgrade picks |
| `V` | item / weapon list | `X` | new projectile |
| `Y` | projectile ended | `Z` | restart countdown |
| `g` | tribe created | `1` | tribe deleted |
| `2` | join request | `3` | your tribe |
| `4` | tribe members | `5` | store update |
| `6` | chat / server notice | `7` | minimap |
| `8` | damage text | `9` | map ping |
| `0` | pong | `W` | boss telegraph `[kind,x,y,r,ms,x2,y2]` |
| `F` | live stats | | |

### Anti-cheat
**In the client** (official code, runs exactly as on moomoo.io):
- `window.WebSocket` is locked (not writable).
- F12, Ctrl+Shift+I/J/C and Ctrl+U are blocked.
- A `debugger` trap runs every second.
- Tampermonkey and Violentmonkey are probed via `chrome-extension://` images, plus a check for
  `GM_*` / `unsafeWindow`.
- WebSocket send, canvas, WebGL and `requestAnimationFrame` are checked for being native.
- Script-dispatched (untrusted) clicks are refused and counted.
- The results go to the server in packet **`T`** (5 s after joining, then every 60 s).
  Flags: `1` userscript manager, `2` socket hooked, `4` render hooked, `8` debugger paused.

**On the server** (`server/src/anticheat/`, everything configurable in `config.js`):

| Check | Default action |
|---|---|
| Bad HMAC tag, replayed or out-of-order `seq`, unknown packet id, malformed frame | close 4001 |
| Wrong `?b=` build | close 4002 |
| Foreign `Origin` | close 4004 |
| Missing, reused or expired join ticket | close 4001 |
| Guest on a members server | close 4003 |
| Telemetry `T` missing for 50 s, or stopped for 105 s | kick |
| `T` flag 2 (socket hooked) | kick |
| `T` flags 1 / 4 / 8, or 20+ untrusted events | flag (logged, shown on the staff panel) |
| Per-packet rate limits (tuned to real client send rates) and argument validation | drop the packet + strike (40 strikes = kick) |
| Shame! (auto-heal detection), straight from the original game logic | 30 s Shame! hat |
| Bans (IP + account), shadow-bans, reports | `server/data/bans.json`, `moderation.json`, `reports.jsonl` |

### Game logic (`server/src/moomoo/`)
The Player, animal, object and projectile classes are ported **function for function** from
the client bundle, where moomoo.io ships them as shared code. Server-only parts are marked
`SERVER:`:
- spawning and world generation
- windmill payouts
- the Turret Gear
- secret-area walking
- the Crab King (diving, telegraphed attacks)
- accessory effects
- emerald members-only lifesteal
- stats

Config, items, hats, accessories and animal types are **identical to the client's data**:
`shared/config.js`, `shared/config/*.js`, `server/src/moomoo/modules/aiManager.js`.

Two game servers run side by side: **LC** (public, 40 players) and **MB** (members only, 80).
They're configured at the top of `server/src/index.js`.

### Local backend (`server/src/api/`)
| Area | Endpoints |
|---|---|
| Auth | `/api/auth/*` (any code / password, signed JWTs) |
| Servers & join | `/servers`, `/join` (single-use tickets) |
| Account | `/account`, `/name` (permanent names), `/name-check` |
| Profiles & boards | `/profile`, `/top` |
| Clans | `/clan`, `/clan-check`, `/clan/*` |
| Staff | `/mod/*` |
| Misc | `/account/socials`, `/client-log` |

Data lives in `server/data/` (git-ignored).

---

## Updating to a newer moomoo.io build
1. Save the new page from moomoo.io (the HTML plus `index-*.js`, `vendor-*.js` and `main.css`).
2. Replace the files in `client-official/source/` (rename the page to `page.html`).
3. Run `npm run build`. If a patch reports `matched 0 times`, the client changed there; update
   that pattern in `tools/build-official-client.mjs`.
4. If the new client changed packets, the build itself won't break, but the game may. Compare
   its `Fl` / `ql` packet lists with `server/src/protocol/constants.js`.

## Missing assets
The client requests these images, which this project doesn't have yet. Save them from
moomoo.io (`https://moomoo.io/<path>`) into `client/public/<path>`:

```
img/animals/boar_1.png   img/animals/yeti_1.png   img/animals/crab_1.png
img/hats/hat_59.png      img/hats/hat_60.png      img/hats/hat_61.png
img/weapons/bow_1_d.png
```
Until then those mobs and hats are invisible (the game still works).

## Settings and tips
| Variable / command | Effect |
|---|---|
| `PORT=8080`, `HOST=127.0.0.1` | where the server listens (`HOST=0.0.0.0` exposes it to your network) |
| `OWNER_EMAIL=you@example.com` | makes that account an admin at startup |
| `DEBUG_PACKETS=1` | logs every decoded client packet |
| `npm run start:new-build` | rolls a new protocol build (simulates a moomoo.io deploy) |
| `npm run build:no-anti-debug` | client without the debugger trap |
| `IS_SANDBOX=1` | sandbox rules (free building, higher limits) |

## Differences from the real game
- The real server code isn't public. Treat boss attack patterns, accessory numbers, animal
  spawn counts and locations, and the secret-area water as reconstructions.
- `mixKey` and `BUILD_SALT` are this server's own: the real ones are secret per-deploy values,
  so the official servers' traffic can't be read with this.
- Friends (FRVR social), ads, analytics and the real captcha are stubbed out.
- `client/` holds the old webpack clone client (old protocol). It's kept for reference only;
  build it with `npm run build:legacy`.

## Project layout
```
client-official/   official client sources + shim.js
tools/             build-official-client.mjs, console.mjs
server/src/
  index.js         HTTP / WebSocket entry, servers, admin route
  protocol/        constants, crypto, build module generator, session
  anticheat/       config + checks + moderation store
  api/             accounts store + REST routes
  admin/           console commands
  network/         connection gate + packet handlers
  moomoo/          game (server.js) + ported modules
shared/            config, items, store (identical to the client's data)
dist/              build output (git-ignored)
server/data/       accounts, tokens, bans, protocol build (git-ignored)
```
