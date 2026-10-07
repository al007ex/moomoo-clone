// ACCOUNT STORE
// Local stand-in for moomoo.io's account backend (FRVR auth + api.moomoo.io):
// accounts, permanent names, roles, persistent clans, lifetime / period stats,
// join tickets. Everything is kept in server/data/accounts.json.

import fs from "node:fs";
import path from "node:path";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

const CLAN_MAX_MEMBERS = 80;               // [Kh]
const NAME_RE = /^[\w:()\/? -]{1,15}$/;
const CLAN_RE = /^[A-Za-z0-9]{3,4}$/;

// AI index -> stats key used by the client's profile card ([qh] / [Fh]).
export const ANIMAL_KEYS = ["cow", "pig", "bull", "bully", "wolf", "duck", "moostafa", "treasure", "moofie", "boar", "yeti", "crab_king", "sheep", "crab", "crab"];
export const BOSS_KEYS = ["crab_king", "moostafa", "moofie"];

const PERIOD_SPANS = {
    day: () => new Date().toISOString().slice(0, 10),
    week: () => {
        const d = new Date();
        const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
        return monday.toISOString().slice(0, 10);
    },
    month: () => new Date().toISOString().slice(0, 7)
};

const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const fromB64url = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function emptyStats() {
    return {
        kills: 0, deaths: 0, damage: 0, healing: 0, wood: 0, food: 0, stone: 0, gold: 0,
        animalDamage: 0, animalKills: {}, bestScore: 0, maxKills: 0, lives: 0, playtime: 0,
        periods: {}
    };
}

export class AccountStore {

    constructor(dataDir) {
        this.file = path.join(dataDir, "accounts.json");
        fs.mkdirSync(dataDir, { recursive: true });
        const secretFile = path.join(dataDir, "secret.key");
        if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, randomBytes(32).toString("hex"));
        this.secret = Buffer.from(fs.readFileSync(secretFile, "utf8").trim(), "hex");
        this.data = { accounts: {}, emails: {}, names: {}, clans: {} };
        try {
            Object.assign(this.data, JSON.parse(fs.readFileSync(this.file, "utf8")));
        } catch {}
        this.tickets = new Map();
        this.loginFlows = new Map();
        this.saveTimer = null;
    }

    save() {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
        }, 250);
    }

    // AUTH TOKENS (JWT, HS256) - mimics FRVR access tokens: payload.extra.{verified, identifier}
    issueToken(account) {
        const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
        const now = Math.floor(Date.now() / 1000);
        const payload = b64url(JSON.stringify({
            sub: account.id,
            iat: now,
            exp: now + 60 * 60 * 24 * 30,
            extra: { verified: true, identifier: account.email }
        }));
        const sig = b64url(createHmac("sha256", this.secret).update(header + "." + payload).digest());
        return `${header}.${payload}.${sig}`;
    }

    verifyToken(token) {
        if (typeof token !== "string") return null;
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const expected = createHmac("sha256", this.secret).update(parts[0] + "." + parts[1]).digest();
        const given = fromB64url(parts[2]);
        if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
        try {
            const payload = JSON.parse(fromB64url(parts[1]).toString("utf8"));
            if (payload.exp && payload.exp * 1000 < Date.now()) return null;
            return this.data.accounts[payload.sub] || null;
        } catch {
            return null;
        }
    }

    // SIGN IN (no verification: any code / password is accepted)
    accountForEmail(email) {
        const key = String(email || "").trim().toLowerCase();
        if (!key || key.length > 120) return null;
        let id = this.data.emails[key];
        if (!id) {
            id = randomBytes(8).toString("hex");
            this.data.accounts[id] = {
                id, email: key, name: null, role: null, clan: null, createdAt: Date.now(),
                stats: emptyStats(), socials: {}, verdict: null
            };
            this.data.emails[key] = id;
            this.save();
        }
        return this.data.accounts[id];
    }

    startLogin(email) {
        const account = this.accountForEmail(email);
        if (!account) return null;
        const flow = randomBytes(12).toString("hex");
        this.loginFlows.set(flow, { accountId: account.id, at: Date.now() });
        return flow;
    }

    finishLogin(flow) {
        const entry = this.loginFlows.get(flow);
        if (!entry) return null;
        this.loginFlows.delete(flow);
        return this.data.accounts[entry.accountId] || null;
    }

    // NAMES
    nameOwner(name) {
        const id = this.data.names[String(name || "").trim().toLowerCase()];
        return id ? this.data.accounts[id] : null;
    }

    claimName(account, rawName) {
        const name = String(rawName || "").slice(0, 15).replace(/[^\w:\(\)\/? -]+/gmi, " ").trim();
        if (!name || !NAME_RE.test(name)) return { status: 400 };
        const owner = this.nameOwner(name);
        if (owner && owner.id !== account.id) return { status: 409 };
        if (account.name) return { status: 200, name: account.name };
        account.name = name;
        this.data.names[name.toLowerCase()] = account.id;
        this.save();
        return { status: 200, name };
    }

    // ACCOUNT (POST /account)
    accountInfo(account) {
        const clan = account.clan ? this.data.clans[account.clan] : null;
        const member = clan ? clan.members.find(m => m.id === account.id) : null;
        const notes = clan && member && member.role !== "member" ? clan.requests.length : 0;
        return {
            name: account.name,
            role: account.role,
            clan: clan ? { name: clan.name, role: member ? member.role : "member" } : null,
            clanNotes: notes
        };
    }

    // JOIN TICKETS (POST /join -> "tk:<ticket>" -> game server)
    issueTicket({ account, did }) {
        const ticket = randomBytes(18).toString("hex");
        const deviceId = did && /^[a-f0-9]{16,64}$/.test(did) ? did : randomBytes(12).toString("hex");
        this.tickets.set(ticket, { accountId: account ? account.id : null, did: deviceId, at: Date.now() });
        return { ticket, did: deviceId };
    }

    consumeTicket(ticket, maxAgeMs) {
        const entry = this.tickets.get(ticket);
        if (!entry) return null;
        this.tickets.delete(ticket);
        if (Date.now() - entry.at > maxAgeMs) return null;
        return { account: entry.accountId ? this.data.accounts[entry.accountId] || null : null, did: entry.did };
    }

    // STATS
    recordLife(account, life) {
        const s = account.stats;
        s.lives++;
        s.deaths += life.died ? 1 : 0;
        s.kills += life.kills;
        s.damage += life.damage;
        s.healing += life.healing;
        s.wood += life.wood;
        s.food += life.food;
        s.stone += life.stone;
        s.gold += life.gold;
        s.animalDamage += life.animalDamage;
        s.playtime += life.playtime;
        s.bestScore = Math.max(s.bestScore, life.score);
        s.maxKills = Math.max(s.maxKills, life.kills);
        for (const [key, count] of Object.entries(life.animalKills)) {
            s.animalKills[key] = (s.animalKills[key] || 0) + count;
        }
        for (const [span, keyFn] of Object.entries(PERIOD_SPANS)) {
            const key = keyFn();
            const p = s.periods[span] && s.periods[span].key === key ? s.periods[span] : (s.periods[span] = { key, kills: 0, bestScore: 0 });
            p.kills += life.kills;
            p.bestScore = Math.max(p.bestScore, life.score);
        }
        const clan = account.clan ? this.data.clans[account.clan] : null;
        if (clan) {
            clan.stats.kills += life.kills;
            clan.stats.raidKills += life.bossKills || 0;
            for (const span of ["week", "month"]) {
                const key = PERIOD_SPANS[span]();
                const p = clan.stats.periods[span] && clan.stats.periods[span].key === key ? clan.stats.periods[span] : (clan.stats.periods[span] = { key, kills: 0 });
                p.kills += life.kills;
            }
            const member = clan.members.find(m => m.id === account.id);
            if (member) {
                member.kills = (member.kills || 0) + life.kills;
                for (const span of ["week", "month"]) {
                    const key = PERIOD_SPANS[span]();
                    member.periods = member.periods || {};
                    const p = member.periods[span] && member.periods[span].key === key ? member.periods[span] : (member.periods[span] = { key, kills: 0 });
                    p.kills += life.kills;
                }
            }
        }
        this.save();
    }

    currentPeriods(periods) {
        const out = {};
        for (const [span, keyFn] of Object.entries(PERIOD_SPANS)) {
            const p = periods && periods[span];
            out[span] = p && p.key === keyFn() ? { kills: p.kills, bestScore: p.bestScore || 0 } : { kills: 0, bestScore: 0 };
        }
        return out;
    }

    profile(account) {
        const s = account.stats;
        const clan = account.clan ? this.data.clans[account.clan] : null;
        return {
            id: account.id,
            name: account.name,
            role: account.role,
            clan: clan ? { name: clan.name } : null,
            guest: false,
            kills: s.kills, deaths: s.deaths, damage: s.damage, healing: s.healing,
            wood: s.wood, food: s.food, stone: s.stone, gold: s.gold,
            animalDamage: s.animalDamage, animalKills: s.animalKills,
            bestScore: s.bestScore, maxKills: s.maxKills, lives: s.lives, playtime: s.playtime,
            periods: this.currentPeriods(s.periods),
            socials: account.socials || {}
        };
    }

    top(span) {
        const periodKills = (periods) => {
            if (span === "all") return null;
            const p = periods && periods[span];
            const key = PERIOD_SPANS[span] ? PERIOD_SPANS[span]() : null;
            return p && p.key === key ? p.kills : 0;
        };
        const players = Object.values(this.data.accounts)
            .filter(a => a.name)
            .map(a => ({
                name: a.name,
                kills: span === "all" ? a.stats.kills : periodKills(a.stats.periods),
                clan: a.clan || undefined,
                shadowed: a.verdict === "shadow" || undefined
            }))
            .filter(p => p.kills > 0)
            .sort((a, b) => b.kills - a.kills)
            .slice(0, 10);
        const clans = Object.values(this.data.clans)
            .map(c => ({
                name: c.name,
                kills: span === "all" ? c.stats.kills : periodKills(c.stats.periods),
                members: c.members.length,
                shadowed: c.shadowed || undefined
            }))
            .filter(c => c.kills > 0)
            .sort((a, b) => b.kills - a.kills)
            .slice(0, 10);
        return { players, clans };
    }

    // CLANS
    clanView(clan) {
        const nameOf = (id) => (this.data.accounts[id] || {}).name || "unknown";
        return {
            name: clan.name,
            members: clan.members.map(m => ({
                name: nameOf(m.id),
                role: m.role,
                stint: m.stint || 1,
                stats: { kills: m.kills || 0, periods: this.currentPeriods(m.periods) }
            })),
            past: (clan.past || []).slice(-20).map(p => ({
                name: nameOf(p.id), stint: p.stint || 1, left: p.left, kicked: !!p.kicked, stats: { kills: p.kills || 0 }
            })),
            stats: { kills: clan.stats.kills, raidKills: clan.stats.raidKills, periods: this.currentPeriods(clan.stats.periods) }
        };
    }

    myClan(account) {
        const clan = account.clan ? this.data.clans[account.clan] : null;
        if (!clan) {
            const invites = Object.values(this.data.clans)
                .flatMap(c => (c.invites || []).filter(i => i.id === account.id).map(i => ({ clan: c.name, by: (this.data.accounts[i.by] || {}).name || "unknown" })));
            return { clan: null, invites };
        }
        const member = clan.members.find(m => m.id === account.id);
        const role = member ? member.role : "member";
        return {
            clan: this.clanView(clan),
            role,
            requests: role !== "member" ? clan.requests.map(id => (this.data.accounts[id] || {}).name || "unknown") : []
        };
    }

    clanAction(account, action, body) {
        const err = (error, status = 400) => ({ status, body: { error } });
        const ok = (body = {}) => ({ status: 200, body });
        if (!account.name) return err("no name");
        const clans = this.data.clans;
        const mine = account.clan ? clans[account.clan] : null;
        const me = mine ? mine.members.find(m => m.id === account.id) : null;
        const rank = me ? { member: 0, officer: 1, owner: 2 }[me.role] : -1;
        const target = body && body.name ? this.nameOwner(body.name) : null;

        const leave = (clan, id, kicked) => {
            const idx = clan.members.findIndex(m => m.id === id);
            if (idx < 0) return;
            const [m] = clan.members.splice(idx, 1);
            clan.past = clan.past || [];
            clan.past.push({ id, stint: m.stint || 1, left: Date.now(), kicked, kills: m.kills || 0 });
            if (this.data.accounts[id]) this.data.accounts[id].clan = null;
        };
        const join = (clan, id) => {
            const prev = (clan.past || []).filter(p => p.id === id).length;
            clan.members.push({ id, role: "member", stint: prev + 1, joinedAt: Date.now(), kills: 0, periods: {} });
            clan.requests = clan.requests.filter(r => r !== id);
            clan.invites = (clan.invites || []).filter(i => i.id !== id);
            this.data.accounts[id].clan = clan.name;
        };

        switch (action) {
            case "mine":
                return ok(this.myClan(account));
            case "create": {
                const name = String(body.name || "").trim();
                if (!CLAN_RE.test(name)) return err("invalid");
                if (mine) return err("in a clan");
                if (Object.keys(clans).some(n => n.toLowerCase() === name.toLowerCase())) return err("taken", 409);
                clans[name] = {
                    name, createdAt: Date.now(), members: [], past: [], invites: [], requests: [], shadowed: false,
                    stats: { kills: 0, raidKills: 0, periods: {} }
                };
                join(clans[name], account.id);
                clans[name].members[0].role = "owner";
                break;
            }
            case "request": {
                const clan = Object.values(clans).find(c => c.name.toLowerCase() === String(body.clan || "").toLowerCase());
                if (!clan) return err("not found", 404);
                if (mine) return err("in a clan");
                if (clan.members.length >= CLAN_MAX_MEMBERS) return err("full");
                if (!clan.requests.includes(account.id)) clan.requests.push(account.id);
                break;
            }
            case "answer": {
                const clan = clans[body.clan];
                if (!clan) return err("not found", 404);
                const invited = (clan.invites || []).some(i => i.id === account.id);
                if (!invited) return err("not found", 404);
                if (body.accept) {
                    if (mine) return err("in a clan");
                    if (clan.members.length >= CLAN_MAX_MEMBERS) return err("full");
                    join(clan, account.id);
                } else {
                    clan.invites = clan.invites.filter(i => i.id !== account.id);
                }
                break;
            }
            case "invite": {
                if (rank < 1) return err("rank", 403);
                if (!target) return err("no player", 404);
                if (target.clan) return err("in a clan");
                mine.invites = (mine.invites || []).filter(i => i.id !== target.id);
                mine.invites.push({ id: target.id, by: account.id });
                break;
            }
            case "decide": {
                if (rank < 1) return err("rank", 403);
                if (!target || !mine.requests.includes(target.id)) return err("no player", 404);
                if (body.accept) {
                    if (target.clan) return err("in a clan");
                    if (mine.members.length >= CLAN_MAX_MEMBERS) return err("full");
                    join(mine, target.id);
                } else {
                    mine.requests = mine.requests.filter(r => r !== target.id);
                }
                break;
            }
            case "kick": {
                const them = target && mine ? mine.members.find(m => m.id === target.id) : null;
                if (!them) return err("no member", 404);
                if (rank < 1 || rank <= { member: 0, officer: 1, owner: 2 }[them.role]) return err("rank", 403);
                leave(mine, target.id, true);
                break;
            }
            case "role": {
                const them = target && mine ? mine.members.find(m => m.id === target.id) : null;
                if (!them) return err("no member", 404);
                if (rank < 2) return err("rank", 403);
                if (body.role === "owner") {
                    them.role = "owner";
                    me.role = "officer";
                } else if (body.role === "officer" || body.role === "member") {
                    them.role = body.role;
                } else return err("invalid");
                break;
            }
            case "leave": {
                if (!mine) return err("not found", 404);
                if (me.role === "owner" && mine.members.length > 1) return err("owner");
                leave(mine, account.id, false);
                if (!mine.members.length) delete clans[mine.name];
                break;
            }
            case "disband": {
                if (!mine) return err("not found", 404);
                if (rank < 2) return err("rank", 403);
                for (const m of [...mine.members]) leave(mine, m.id, false);
                delete clans[mine.name];
                break;
            }
            default:
                return err("not found", 404);
        }
        this.save();
        return ok({});
    }

    // MODERATION
    setRole(name, role) {
        const account = this.nameOwner(name);
        if (!account) return false;
        account.role = role === "admin" || role === "mod" ? role : null;
        this.save();
        return true;
    }

    setVerdict(name, level) {
        const account = this.nameOwner(name);
        if (!account) return false;
        account.verdict = level === "clear" ? null : level;
        this.save();
        return true;
    }

    setClanShadow(name, shadow) {
        const clan = this.data.clans[name];
        if (!clan) return false;
        clan.shadowed = !!shadow;
        this.save();
        return true;
    }

    // OWNER / DEV HELPERS
    accountByEmail(email) {
        const id = this.data.emails[String(email || "").trim().toLowerCase()];
        return id ? this.data.accounts[id] : null;
    }
}
