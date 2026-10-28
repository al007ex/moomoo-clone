# MooMoo.io Private Server

A local MooMoo.io server that runs the **current official client** (v1.9.4, bundle
`index-993d072d.js`, API version 1.31), speaking the real packet protocol and anti-tamper
system (including the new code seal and integrity probes), with a local stand-in for every
online service the client expects (accounts, friends, whispers and clan chat, servers,
clans, profiles, Discord linking, captcha, ads).

> Fan project for personal use. MooMoo.io, its client code, art and names belong to their
> owners (MooMoo.io / FRVR). The game's real server code isn't public: anything marked
> **reconstructed** below was designed for this server from what the client shows and
> may differ from how the live game behaves.
>
> Run it on your own computer only. Don't host it publicly or put `client-official/source/`
> in a public repository: those files are FRVR's, and the sign-in screen looks exactly like
> the real one.

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


### New in v1.9.4 **[client UI / local backend]**
Everything below arrived with v1.9.4 and works here. moomoo then re-deployed v1.9.4 as
`index-6642cae8.js`, which added **three new anti-tamper pieces** (all replicated here — see
*Anticheat*), then re-deployed it as `index-332036b9.js` (which added probe kinds `8` and `9`,
see *Anticheat*), and most recently as `index-993d072d.js` (the bundle served now) with no
anti-cheat or protocol change at all — only control-flow-flattening obfuscation on the frame
mask, a new "close the popup on spawn" UI call, and re-randomised string obfuscation. The
three pieces `index-6642cae8` introduced:
- the `T` telemetry frame carries two more fields — the client's current send sequence and
  a **frame ledger** (a rolling FNV-1a hash of every client→server body it has sent);
- two new tamper **flag bits** — `16` (WebSocket / `send` not native-named, or its
  constructor swapped) and `32` (own properties added to the socket object);
- a stricter "native function" check that also matches each guarded function's name.

- **Whispers and clan chat:** **Message** a friend from the Friends list, or talk to your
  clan in the clan card's **Chat** tab, with history, a word filter (*"unclean"*) and a rate
  limit. In game, type `/w <friend> <message>`, `/c <message>` or `/r <message>` (reply) in
  the chat box. Messages pop up at the side of the screen while you play, with a reply
  button (*Show Friend Messages In Game* / *Show Clan Messages In Game* in Settings > Social).
- **Invites and who's online:** *"come to my server"* invites, friends and clanmates in a
  game with the server they're on, and live player counts in the server picker. They all
  arrive over a page stream that stays open while the page is.
- **Anonymous mode** (Settings > Social, signed-in players): other players see you as
  `Anon#<sid>` with no clan tag or crown, and your profile only shows that name. *Show my
  own name to me* keeps your real name on your own screen. You can switch it once every 31
  seconds.
- **Look editor** (Settings > Social > *Edit look*): choose the hat, accessory, weapon, variant and colour
  your profile and share card show. You can only pick what you've earned (*"That isn't yours
  to show yet"*).
- **Shop editor** (Settings > Shop): drag hats and accessories into your own order, hide
  the ones you never buy, or show both in one list (*Combined Shop*).
- **Settings** are split into **Social**, **Shop** and **Keys** pop-ups, plus *Show CPS*
  (clicks per second next to FPS) and *Aim Follows Movement* on touch screens.
- **Crowns:** this week's top three players by kills wear a gold, silver or bronze crown next
  to their name in game and on the leaderboard (with the skull when they also lead kills).
- **News from other servers:** *"The Crab King has fallen on Local LC to alex"* and
  *"[CLAN] has taken the top on …"*.
- **Updates and restarts:** *"Game updated - reloading in m:ss"* (or *"it reloads after this
  life"*), open pages reload on their own when a new bundle is out, a site-wide notice can
  sit under the menu, and servers about to restart drop out of the server picker.
- **Staff:** **Messages** on the staff panel (what someone said in whispers, clan and game
  chat), bans for a while instead of for good, and a rejoin lock after a kick (*"You were
  removed from the game - try again in …"*).
- **Animal looks:** players can be drawn as an animal (`morph`), dive like the Crab King
  (`dive`) or wear their clan as their tribe tag (`disguise`). The game itself doesn't use
  these for players yet; the console does.
- **Clan tribes:** a tribe named after your clan only takes clanmates. *solo* can't be used
  as a clan name.
- **Balance:** Crab Shell now reflects 37.5% of damage, takes 20% less and slows you 7%;
  emerald weapons need 30,000 XP and also poison. The animal list comes from the server now.

### New in v1.9.1 **[client UI / local backend]**
These arrived with the earlier October update (`index-04fd22e2.js`):

- **Friends:** add players by name, accept or decline requests, see who's online and on
  which server, **Join** them or send an **Invite** (a banner pops up for them). Signed-in
  players find it under **Friends** in the menu and in the in-game menu.
- **New account settings:** *Friend Notifications*, *Allow Friend Requests* and *Allow Clan
  Invitations*. With requests or invites turned off, the client says *"That player isn't
  taking friend requests"* / *"That player isn't taking clan invitations"*.
- **Report reasons:** after **Report**, the client asks *"What for?"* (Bot / Hack /
  Autoheal / Abuse). Staff see it on the profile panel: *"Reported by X for Bot"*.
- **Staff panel on guests:** staff who click a guest on the leaderboard get the guest's
  reports and anti-cheat flags, with **Kick**, **Ban**, **IP ban**, **Shadow** and **Clear**.
- **Copy link** on profiles and clans: `http://localhost:8080/player/<name>` and
  `/clan/<name>` open the game with that card (`?profile=` / `?clan=`).
- **Discord linking:** `discord <username>` in the console plays the part of the Discord
  bot's `/link` command and prints a link. Opening it while signed in asks *"Link your
  MooMoo.io account to the Discord account …?"*.
- **Clans:** owners can **Stop requests to join** (visitors see *"Not taking requests to
  join."*). Rude clan tags are refused.
- **Name rules:** *"That name would show as "Zo Moo" in game - pick another"* for characters
  the game strips, and *"That name isn't allowed - pick another"* for names its word filter
  blocks. Social handles get the same treatment (*"just the handle - letters, numbers,
  dots, underscores and hyphens"*).
- **Server failover:** when a server shuts down, open games show *"MB has closed - switched
  you to LC. Press play."* Signed-in players are moved to a members server unless they
  picked a server themselves.
- **Client-only extras:** *Show Grid* and *Camera Lock* settings, the skin colour is
  remembered, key bindings by item (*Wall*, *Spikes*, *Windmill*, *Age 7 Item*…) and for
  menus (*Shop*, *Tribes*, *Game Menu*), double-tapping an item in the action bar on a touch
  screen places it at once, iPads get the touch controls, and the shop is sorted by price.

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
- **Moderation:** **Ban** and **Shadow** buttons in the report menu, a staff panel on
  profiles and on guests (reports with reasons, anti-cheat flags, verdicts, Kick / Ban /
  IP ban / Shadow / Clear), shadowing players on the top boards

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

### Accounts, profiles, clans, friends **[client UI / local backend]**
- **Sign in** with the real email-code card (any code works), or "Use password instead"
  (any password). Your first name becomes **permanent**.
- **Members-only servers** in the server picker (shield icon, 80 players). Signed-in players
  get them by default.
- **Profiles:** lifetime combat stats, K/D, resources, animal and boss kills per species, best
  score, lives, playtime, recent day / week / month stats, socials, a **live** "this life"
  panel while the player is in game, and **Copy link**.
- **Clans:** persistent 3–4 letter clans with owner / officer / member ranks, invites, join
  requests (which owners can switch off), past members, clan stats and raid kills. Clan tags
  appear on the leaderboard (`[CLAN]`, `[tribe:CLAN]`, `[solo:CLAN]`).
- **Friends:** requests, online status with the server each friend is on, Join, Invite,
  "is now online" / "has joined …" notices, and the three account settings.
- **Top boards:** players and clans by kills this week, this month and all time, plus the menu
  spotlight ("Player of the week: …").

To show friends in a video, sign in with two different emails (for example in a normal and a
private window) and add each other by name, or run `befriend <name> <name>` in the console.

### Anti-cheat you can demo **[client + server]**
- **Userscript detection:** with Tampermonkey or Violentmonkey installed, a red banner appears:
  *"…that can modify the game was detected"*.
- **Shame!** hat: eat 8 times within 120 ms of being hit and you're shamed for 30 s
  (no eating). `shame me` forces it.
- **Debugger trap:** with DevTools open, the page keeps pausing (the client's anti-debug).
- **Tamper-proof traffic:** edited, replayed or forged packets get you disconnected
  ("Could not verify the connection").
- **Code seal:** edit the bundle in `dist/official/assets/` (or replace one of its guarded
  functions from DevTools) and the first packet closes the connection with *"Invalid
  Connection"*. The seal is mixed into the connection key.
- **Integrity probes:** the server asks the client to check for hooked functions, wrapped
  constructors and userscript globals. Matches show up in `flags <player>`.
- **Old client:** after `npm run start:new-build`, or when the page runs an older bundle than
  the server serves, the client shows *"Game updated - please reload"*.

### Dormant code found in the client **[hidden]**
- `DAY_INTERVAL` = 24 minutes: a day/night cycle constant whose rendering has been removed.
- `MAX_ATTACK`, `MAX_SPEED`, `MAX_TURN_SPEED`: animal tuning that's multiplied by 0 (inactive).
- **Crab** and **Crabling**: two diving crab mobs defined in the client's animal table
  (entries 13 and 14) that never appear in the game. The Crab King is the only crab.
- **Texture packs** (*"Texture pack (dev)"* in Settings): new in v1.9.1, but the client only
  loads the editor (`texture-pack-*.js`) on moomoo's dev servers, so it stays hidden here as
  it does on moomoo.io.
- A localhost developer mode (`?api=local`, `?cf=interactive`, `?atlas=`, a
  `moo_dev_frvr_token` sign-in shortcut, debug renderer globals). The build patches it out so
  the page behaves exactly like moomoo.io.

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
| `friends <account>` | an account's friends, requests, settings and Discord link |
| `befriend <account> <account>` | make two accounts friends straight away |
| `discord <discord username>` | stand-in for the Discord bot's `/link`: prints a link to open |
| `morph <p> <animal\|off>`, `dive <p> [s]`, `disguise <p> [on\|off]`, `anon <p> [on\|off]` | animal look, Crab King dive, clan as tribe tag, anonymous mode |
| `announce <text>` | chat notice |
| `restart <s\|cancel>` | "Server restarting in …" banner (over 60 s it reads minutes / hours) and the server list marks the server as restarting |
| `update [s]` | "Game updated - reloading in m:ss" (`0` = after this life); open pages reload |
| `notice <text> [minutes]`, `notice off` | site notice under the menu on every open page |
| `kick <p> [s]` | remove a player; they can't rejoin for `s` seconds (default 120) |
| `ban <p> [30m\|12h\|7d]`, `unban <name\|ip>` | ban IP + device + account, for good or for a while; `unban` also lifts a kick's lock |
| `role <name> <admin\|mod\|none>`, `flags <p>` | staff role; anti-cheat flags, strikes and probe rounds answered |

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

# Friends and Discord (two signed-in accounts, e.g. a normal and a private window)
befriend alex bob          # then open Friends: Join / Invite
discord moo_fan            # open the printed link while signed in
```

---

## How it works

```
browser (official client, patched)                 this server
------------------------------------------------   --------------------------------------
index.html  import map -> /p/<id>.js  ------------> protocol build (BUILD_ID, salt, mixKey)
                       -> /p/<seal>.js -----------> code seal (its file name is the seal)
shim.js     FRVR SDK, Turnstile, ads  ------------> /api/auth/*  (any code / password)
            FRVR social (friends)  ---------------> /api/social/*, /api/social/ws (presence, invites)
fetch(Pe + ...) servers, join, profiles, clans ---> /api/*       accounts, clans, chat, top, tickets
EventSource /api/page/stream ---------------------> notices, whispers, invites, counts, news
WebSocket ws://host/s/<server>?token=tk:..&b=..&u=.. -> gate -> io-init -> keyed frames -> Game
```

### Official client (`client-official/`, `tools/build-official-client.mjs`)
`client-official/source/` holds the files saved from moomoo.io, unmodified. Earlier versions
(`index-228e9652.js` v1.9.0, `index-04fd22e2.js` v1.9.1, `index-45e2f6ff.js` the first v1.9.4
build, `index-6642cae8.js` the v1.9.4 build that added the ledger / flags 16+32, and
`index-332036b9.js` the one that added probe kinds 8+9) are kept in `client-official/archive/`.
`npm run build` creates `dist/official/` by:

1. **Patching the bundle.** moomoo's minifier renames things on every build, so each patch is
   a pattern that captures the names. Each must match exactly once, so a newer build fails
   loudly instead of half-working:
   - `const Fe=!1` makes the client behave as on moomoo.io: anti-tamper on, `/join` tickets,
     no dev globals.
   - The localhost sign-in shortcut (`moo_dev_frvr_token`) is switched off.
   - The API base `Pe` points to `/api` on this server.
   - Servers in region `"local"` live on this host at `/s/<key>`.
   - Sockets use `ws://` when the page is served over `http://`.
   - Server pings use the page's protocol.
   - The FRVR social API points to this server.
   - **Copy link** builds links to this server instead of moomoo.io.
2. **Restoring the static page** from the saved snapshot. It removes the injected CookiePro
   banner, the Turnstile iframe, ads and browser-extension leftovers, empties the containers
   the game fills itself, resets the signed-in state a saved page can carry (disabled name box,
   account row, account settings), and adds the import map (`moomoo-protocol` and
   `moomoo-seal`), `shim.js` and the module script.

   It also strips what mods and userscripts running in your browser leave in a saved page:
   MooMoo.js (`mmj-*`: the config overlay and the game menu's "Mods" tab), script menus
   (`mmjes-*`) and userscript chat overlays. The build prints how many elements it removed.

   **Page parts:** the game stops loading when the page lacks an element it looks up. If a
   saved page is older than the bundle, the build adds the missing ones (settings pop-up,
   whisper card, chat pop-ups, CPS counter, update / site notices, leaderboard kinds…) and
   appends `client-official/page-parts.css` to `main.css`. Their markup follows how the
   bundle uses them, but it's a stand-in until the page is saved again. The current
   `page.html` and `main.css` were saved with v1.9.4 (`index-993d072d.js`), so nothing is added.
3. **Adding `shim.js`**, a local FRVR SDK (bootstrapper, tracker, ads, profile, **auth** with
   `getFRVRID` and `authenticatedFetch`, and **social**), an instant-pass Turnstile, and ad /
   consent no-ops. The social part copies the SDK: REST calls go to `/api/social`, and the
   live socket speaks the SDK's `{code, data}` messages (`ON_CONNECT`, `FRIEND_STATUS_UPDATED`,
   `RECEIVE_GAME_INVITE`, `UPDATE_STATUS`, `SEND_GAME_INVITE`) with game id `moomoo`.

`npm run build:no-anti-debug` also turns off the debugger trap. Use it if you need DevTools.

### Protocol (`server/src/protocol/`)
Everything here mirrors the client function named in brackets (names from
`index-993d072d.js`; they change on every build). API 1.31 changed the protocol: packet ids
go up to 127, a code seal is bound into the key, and the server now drives the telemetry. It
was verified against the new client's own transport code with 21,742 automated checks, and
end to end (gate, seal, probes, packets, chat, clans, moderation) with headless clients.

- **Build module** `/p/<id>.js` exports `BUILD_ID`, `BUILD_SALT` and `mixKey`, as moomoo.io's
  per-deploy module does. This server generates its own: a random id, salt and ARX key mixer.
  It's kept in `server/data/protocol-build.json`, and `npm run start:new-build` rolls it.
- **URL** `ws://host/s/<server>?token=tk:<ticket>&b=<BUILD_ID>&u=<bundle name>`; `u` must
  be the bundle this server serves (`index-993d072d`).
- **Handshake** (the only plain frame): `["io-init", [socketId, seed, keyHex, 1, 1, sealMode]]`
  - `key = mixKey(hex(keyHex), seed)`
  - **Seal** [Sd]: the page's import map has a second module, `moomoo-seal`, whose file name
    is 16 random bytes in hex. The client XORs them with SHA-256 of its own bundle
    (first 16 bytes), and with `165` as well if any of its 15 guarded functions (send,
    connect, input, telemetry…) no longer appears in the bundle source. In seal mode 2 (the
    default) the result is XORed into the first 16 bytes of the key, so a modified client
    can neither send a valid frame nor read the server's. In mode 1 it only reports a hash
    of it [Dx] in every `T`.
  - Packet tables [s0]: the first 22 client and 39 server packet names are shuffled with
    mulberry32 Fisher–Yates, seeded with `seed ^ imul(BUILD_SALT, 2654435761)` [gs]. Names
    added after that (`q`, `r`, `m`) get ids from a salted FNV-1a hash in the free range up
    to 127, with linear probing [i0]. The server table uses the salt `^ 2246822507`.
- **Client → server frame:** `tag(6) || mask(msgpack([id, args, seq]))`
  - `tag` = HMAC-SHA256(key, body)[0..6] [su/ru]
  - `mask` = xorshift32 keystream seeded with `c2sSeed ^ u32(tag)` [pl/du]
  - `seq` must be exactly the previous `seq` + 1
- **Server → client frame:** `mask(msgpack([id, args]))`, seeded with
  `s2cSeed ^ imul(n, 2654435761)` for the n-th frame [cu]
- **Close codes:**

  | Code | Client message |
  |---|---|
  | 4001 | Invalid Connection |
  | 4002 | Game updated - please reload |
  | 4003 | Sign in to play on this server |
  | 4004 | Please play at moomoo.io |

**Client → server packets (22):**

| Id | Meaning | Id | Meaning |
|---|---|---|---|
| `M` | spawn `{name, moofoll, skin, anon}` | `D` | aim direction |
| `9` | move direction (null = stop) | `e` | reset movement |
| `F` | mouse `[down, buildDir]` | `z` | select `[index, isWeapon]` |
| `H` | upgrade pick | `K` | `0` lock rotation, `1` auto-gather |
| `L` | create tribe | `N` | leave tribe |
| `b` | request to join | `P` | answer request `[sid, accept]` |
| `Q` | kick member | `c` | store `[1 buy \| 0 equip, id, isAccessory]` (id 0 unequips) |
| `6` | chat (≤30 characters) | `S` | map ping |
| `0` | ping | `T` | **telemetry** `[flags, untrustedEvents, probeResult, seal, salt, seq, ledger]`, only in answer to `q` |
| `R` | report `[sid]`, its reason `[sid, 0, 1 Bot \| 2 Hack \| 3 Autoheal \| 4 Abuse]`, or staff `[sid, 1 shadow \| 2 ban]` | `A` | admin command |
| `V` | profile and live stats `[sid]` (answered with `p` and `F`) | `I` | anonymous mode `[0 \| 1]` (once per 31 s) |

**Server → client packets (42):**

| Id | Meaning | Id | Meaning |
|---|---|---|---|
| `io-init` | handshake | `A` | `{teams, animals}` (the animal list now comes from the server) |
| `B` | disconnect reason (`kicked`, `server is full`, `Server is restarting - pick another`…) | `C` | your sid |
| `D` | player data (17 fields incl. aura, boss mode, clan, morph, dive, invisible, disguised) | `E` | player left |
| `a` | positions `[sid,x,y,dir·100]`, changed attributes `[sid,build,weapon,variant,team,leader,hat,tail,icon,z]` (icon 1 skull, 2–4 crowns, 5–7 crowns with skull), hidden sids | `G` | leaderboard (entries, roles, dead, 🦀, clan tags, tribes, crowns) |
| `H` | new objects | `I` | animals `[sid,type,x,y,dir·100,hp,name,state]` + hidden |
| `J` | animal attack animation | `K` | swing animation |
| `L` | object wiggle | `M` | turret shot |
| `N` | resource / stat value | `O` | health |
| `P` | you died | `Q` | object removed |
| `R` | objects removed | `S` | item count |
| `T` | XP / age | `U` | upgrade picks |
| `V` | item / weapon list | `X` | new projectile |
| `Y` | projectile ended | `Z` | restart countdown (over 60 = minutes / hours, `-1` cancels) |
| `g` | tribe created | `1` | tribe deleted |
| `2` | join request | `3` | your tribe |
| `4` | tribe members | `5` | store update |
| `6` | chat / server notice | `7` | minimap |
| `8` | damage text | `9` | map ping |
| `0` | pong | `W` | boss telegraph `[kind,x,y,r,ms,x2,y2]` |
| `F` | live stats (staff watching a guest also get the guest's session id) | `p` | profile `[sid, json]` |
| `q` | integrity probes `[salt, [[kind, path, hash]…]]` | `r` | "Game updated - reloading in m:ss" `[seconds]` |
| `m` | dive `[sid, state, ms]` | | |

When the server stops (Ctrl+C), it sends the `Z` countdown and then `B` *"Server is
restarting - pick another"*, which makes the client look for another server.

### Anti-cheat
**In the client** (official code, runs exactly as on moomoo.io):
- `window.WebSocket` is locked (not writable).
- F12, Ctrl+Shift+I/J/C and Ctrl+U are blocked.
- A `debugger` trap runs every second.
- Tampermonkey and Violentmonkey are probed via `chrome-extension://` images, plus a check for
  `GM_*` / `unsafeWindow`.
- WebSocket send, canvas, WebGL and `requestAnimationFrame` are checked for being native.
- Script-dispatched (untrusted) clicks are refused and counted.
- **New in API 1.31:** the client no longer sends `T` on a timer. The server sends
  **integrity probes** (`q`, at most 30 per round) and the client answers with `T`: its
  flags, untrusted-event count, a bitmask of the probes that matched, its seal and the
  round's salt. Probe kinds: `1` own property names of an object, `2` "name=value" of its
  plain properties, `3` localStorage keys, `4` elements as `tag#id`, `5` a constructor
  swapped for a wrapper, `6` symbol descriptions, `7` a function that isn't native code, and
  (added in `index-332036b9`) `8` elements as `tag.class` and `9` a `CustomEvent` the client
  dispatches — it matches if a listener resolves it (so the server can detect a script that
  hooks a named event). Kinds 1–4, 6 and 8 compare salted hashes with a fresh salt every
  round, so a script can't see what's being looked for; kind 9's event name travels in clear.
  This server asks 5 s after spawning and then every 60 s; the probe list (generic hooks and
  userscript globals, with room for your own) is in `anticheat/config.js`.
- Flags: `1` userscript manager, `2` socket hooked, `4` render hooked, `8` debugger paused,
  and (added in `index-6642cae8`) `16` socket-integrity (WebSocket / `send` not a native
  function with the right name, or its constructor swapped) and `32` socket object carrying
  own properties.
- **Frame ledger** (added in `index-6642cae8`): the client keeps a rolling FNV-1a hash of
  every `c2s` body it sends (started at the FNV offset) and reports it, with its send
  sequence number, as the last two fields of `T`. The server keeps the same hash of the
  frames it decodes, so a forged, replayed or dropped frame makes the two diverge
  (`ledger.mismatchAction` in `config.js`).

**On the server** (`server/src/anticheat/`, everything configurable in `config.js`):

| Check | Default action |
|---|---|
| Bad HMAC tag, replayed or out-of-order `seq`, unknown packet id, malformed frame | close 4001 |
| Wrong `?b=` build, or `?u=` isn't the bundle served now | close 4002 |
| Modified bundle or guarded function (seal, mode 2) | close 4001 on the first frame |
| Foreign `Origin` | close 4004 |
| Missing, reused or expired join ticket, or a ticket for a different server | close 4001 |
| Guest on a members server | close 4003 |
| No answer to a probe round within 45 s | kick |
| `T` without a probe round, or with the wrong salt | invalid (strike) |
| A probe matched (hooked function, wrapper, userscript global…) | per probe, default flag |
| Seal hash in `T` doesn't match (seal mode 1) | flag |
| `T` flag 2 (socket hooked) or 16 (socket integrity) | kick |
| `T` flags 1 / 4 / 8 / 32, or 20+ untrusted events | flag (logged, shown on the staff panel) |
| `T` frame ledger / seq doesn't match the server's view of the c2s stream | flag |
| After any kick | rejoin lock: 60 s (anti-cheat) / 2 min (staff) |
| Per-packet rate limits (tuned to real client send rates) and argument validation | drop the packet + strike (40 strikes = kick) |
| Shame! (auto-heal detection), straight from the original game logic | 30 s Shame! hat |
| Bans (IP + device + account, for good or timed), shadow-bans, reports with reasons | `server/data/bans.json`, `moderation.json`, `reports.jsonl` |

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
Names go through the client's own word filter (`server/src/moomoo/libs/nameFilter.js`: the
bad-words list it bundles plus the game's extra words), so a name like *Sidney* shows as
*unknown*, as it does on moomoo.io.

Two game servers run side by side: **LC** (public, 40 players) and **MB** (members only, 80).
They're configured at the top of `server/src/index.js`.

### Local backend (`server/src/api/`)
| Area | Endpoints |
|---|---|
| Auth | `/api/auth/*` (any code / password, signed JWTs) |
| Servers & join | `/servers` (with `restartAt`), `/join` (single-use tickets for the server asked for, device id; errors `captcha`, `banned {until}`, `locked {seconds}`; guests that just played may rejoin without the captcha after a restart) |
| Account | `/account` (incl. settings), `/account/prefs`, `/account/look` (look editor), `/name` (permanent names, game name filter), `/name-check`, `/account/socials` (handle rules) |
| Page stream | `/page/ticket`, `/page/stream` (server-sent events: `hello`, `bundle`, `notice`, `count`, `event`, `friend`, `clan-on`, `chat`, `invite`), `/page/friends` (`api/pageStream.js`) |
| Chat | `/chat/whisper`, `/chat/clan`, `/chat/history`, `/invite`, `/clan/online` (`api/chat.js`, kept in `server/data/chat.json`) |
| Friends | `/names-for`, `/friends/allow` (moomoo side), `/social/friends/*` and `/social/ws` (FRVR social stand-in, `api/social.js`) |
| Profiles & boards | `/profile`, `/top` |
| Clans | `/clan`, `/clan-check`, `/clan/*` (incl. `/clan/requests`, `/clan/uninvite`) |
| Discord | `/discord/link` |
| Staff | `/mod/player`, `/mod/verdict` (incl. timed bans), `/mod/kick`, `/mod/role`, `/mod/clan`, `/mod/messages` (what someone said) (accounts by name, guests by session id) |
| Share links | `/player/<name>`, `/clan/<name>` (outside `/api`) |
| Misc | `/client-log` |

Account ids use FRVR's 24-character format; older accounts are converted when the server
starts, and existing sign-ins keep working. Data lives in `server/data/` (git-ignored).

---

## Updating to a newer moomoo.io build
1. Save the page from moomoo.io as *Webpage, Complete*. You get the HTML and a `_files`
   folder with `index-*.js`, `vendor-*.js` and the live `main.css`.
2. Move the current files into `client-official/archive/<bundle name>/` and put the new ones
   in `client-official/source/` (rename the page to `page.html`).
3. Run `npm run build`. If a patch reports `matched 0 times`, the client changed there; update
   that pattern in `tools/build-official-client.mjs`.
4. If the new client changed packets, the build itself won't break, but the game may. Compare
   its packet lists with `server/src/protocol/constants.js`, and diff it against the archived
   bundle for new API calls.

The server picks up a rebuilt bundle by itself: the `?u=` check and the seal always use the
file in `dist/official/assets/`. `update` in the console then tells open pages to reload.

## Missing assets
The client requests these images, which this project doesn't have yet. Save them from
moomoo.io (`https://moomoo.io/<path>`) into `client/public/<path>`:

```
img/weapons/bow_1_d.png
img/icons/crown_gold.png        img/icons/crown_silver.png        img/icons/crown_bronze.png
img/icons/skull_crown_gold.png  img/icons/skull_crown_silver.png  img/icons/skull_crown_bronze.png
```
Until then the diamond bow and the weekly crowns are invisible (the game still works). A
saved page only contains the images that were on screen, so the crowns need someone in this
week's top three to be visible when you save. The touch joystick (`assets/index-d71d2980.js`)
isn't in the saved files either, so phones and tablets get no on-screen sticks. The icon font is also loaded from Google Fonts, because moomoo.io's own
copy (`css/fonts/material-icons.woff2`) isn't in the saved files.

## Settings and tips
| Variable / command | Effect |
|---|---|
| `PORT=8080`, `HOST=127.0.0.1` | where the server listens (`HOST=0.0.0.0` exposes it to your network) |
| `DATA_DIR=path` | keep accounts, bans and the protocol build somewhere other than `server/data/` (e.g. a second copy for testing) |
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
- Friends only exist between accounts on this server. Presence and invites go through this
  server instead of FRVR's.
- There's no Discord bot; the console's `discord` command hands out the link codes.
- Guests on a VPN or hosting network aren't blocked (moomoo.io says *"VPNs, proxies and
  server networks can't join as a guest"*).
- The staff page moved to a separate bundle on moomoo.io that isn't in the saved files; the
  in-game staff tools and the console cover the same ground.
- Ads, analytics and the real captcha are stubbed out.
- `client/` holds the old webpack clone client (old protocol). It's kept for reference only;
  build it with `npm run build:legacy`.

## Project layout
```
client-official/   official client sources (+ archive of earlier builds) + shim.js, page-parts.css
tools/             build-official-client.mjs, console.mjs
server/src/
  index.js         HTTP / WebSocket entry, servers, admin route, share links
  protocol/        constants, crypto, build module + seal generator, served bundle, session
  anticheat/       config + checks + moderation store
  api/             accounts store, REST routes, FRVR social (friends) stand-in, page stream, chat
  admin/           console commands
  network/         connection gate + packet handlers
  moomoo/          game (server.js) + ported modules + name filter
shared/            config, items, store (identical to the client's data)
dist/              build output (git-ignored)
server/data/       accounts, tokens, bans, protocol build (git-ignored)
```
