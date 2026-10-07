// LOCAL API
// Answers every request the official client makes to api.moomoo.io (and the FRVR auth
// calls made by client-official/shim.js) so the menus, sign-in, profiles, clans, top
// boards and server picker behave like the live site - without any real verification.

import express from "express";

export function createApiRouter({ store, moderation, servers, game }) {
    const router = express.Router();
    router.use(express.json({ limit: "32kb" }));

    const auth = (req) => store.verifyToken(req.body && req.body.auth);
    const requireAuth = (req, res) => {
        const account = auth(req);
        if (!account) res.status(403).json({ error: "auth" });
        return account;
    };
    const requireStaff = (req, res, roles = ["admin", "mod"]) => {
        const account = requireAuth(req, res);
        if (!account) return null;
        if (!roles.includes(account.role)) {
            res.status(403).json({ error: "rank" });
            return null;
        }
        return account;
    };

    // ---------- FRVR auth emulation (used by shim.js) ----------
    // Email + code: any 6 digits work. Email + password: any password works.
    router.post("/auth/code", (req, res) => {
        const flow = store.startLogin(req.body && req.body.email);
        if (!flow) return res.status(400).json({ type: "invalidEmail" });
        res.json({ flow });
    });
    router.post("/auth/verify", (req, res) => {
        const code = String((req.body && req.body.code) || "");
        if (!/^\d{6}$/.test(code)) return res.status(400).json({ type: "invalidCode" });
        const account = store.finishLogin(req.body.flow);
        if (!account) return res.status(400).json({ type: "serverError" });
        res.json({ token: store.issueToken(account), email: account.email, id: account.id });
    });
    router.post("/auth/password", (req, res) => {
        const account = store.accountForEmail(req.body && req.body.email);
        if (!account || !String((req.body && req.body.password) || "").length) {
            return res.status(400).json({ type: "invalidCredentials" });
        }
        res.json({ token: store.issueToken(account), email: account.email, id: account.id });
    });
    router.post("/auth/refresh", (req, res) => {
        const account = store.verifyToken(req.body && req.body.token);
        if (!account) return res.status(403).json({ type: "accountNotActive" });
        res.json({ token: store.issueToken(account), email: account.email, id: account.id });
    });

    // ---------- servers / join ----------
    router.get("/servers", (_req, res) => {
        res.set("Cache-Control", "no-store");
        res.json(servers.list());
    });

    router.post("/join", (req, res) => {
        const body = req.body || {};
        const account = body.auth ? store.verifyToken(body.auth) : null;
        if (body.auth && !account) return res.status(403).json({ error: "auth" });
        if (!account && !body.captcha) return res.status(403).json({ error: "captcha" });
        res.json(store.issueTicket({ account, did: body.did }));
    });

    // ---------- account / names ----------
    router.post("/account", (req, res) => {
        const account = requireAuth(req, res);
        if (account) res.json(store.accountInfo(account));
    });

    router.post("/name", (req, res) => {
        const account = requireAuth(req, res);
        if (!account) return;
        const result = store.claimName(account, req.body.name);
        if (result.status !== 200) return res.status(result.status).json({});
        res.json({ name: result.name });
    });

    router.get("/name-check", (req, res) => {
        res.json({ reserved: Boolean(store.nameOwner(req.query.name)) });
    });

    router.get("/clan-check", (req, res) => {
        const name = String(req.query.name || "").trim().toLowerCase();
        res.json({ reserved: Object.keys(store.data.clans).some(c => c.toLowerCase() === name) });
    });

    router.post("/account/socials", (req, res) => {
        const account = requireAuth(req, res);
        if (!account) return;
        const socials = req.body.socials && typeof req.body.socials === "object" ? req.body.socials : {};
        account.socials = {};
        for (const [k, v] of Object.entries(socials)) {
            if (typeof v === "string" && k.length < 20) account.socials[k] = v.slice(0, 60);
        }
        store.save();
        res.json({ socials: account.socials });
    });

    router.post("/client-log", (_req, res) => res.status(204).end());

    // ---------- profiles / top ----------
    router.get("/profile", (req, res) => {
        const account = store.nameOwner(req.query.name);
        if (!account) return res.status(404).json({ error: "not found" });
        res.json(store.profile(account));
    });

    const top = (span, staff) => {
        const board = store.top(["week", "month", "all"].includes(span) ? span : "week");
        if (!staff) {
            board.players = board.players.filter(p => !p.shadowed);
            board.clans = board.clans.filter(c => !c.shadowed);
        }
        return board;
    };
    router.get("/top", (req, res) => res.json(top(req.query.span, false)));
    router.post("/top", (req, res) => {
        const account = requireStaff(req, res);
        if (account) res.json(top(req.body.span, true));
    });

    // ---------- clans ----------
    router.get("/clan", (req, res) => {
        const clan = Object.values(store.data.clans).find(c => c.name.toLowerCase() === String(req.query.name || "").toLowerCase());
        if (!clan) return res.status(404).json({ error: "not found" });
        res.json(store.clanView(clan));
    });

    router.post("/clan/:action", (req, res) => {
        const account = requireAuth(req, res);
        if (!account) return;
        const result = store.clanAction(account, req.params.action, req.body || {});
        res.status(result.status).json(result.body);
    });

    // ---------- moderation (staff) ----------
    router.post("/mod/role", (req, res) => {
        if (!requireStaff(req, res, ["admin"])) return;
        if (!store.setRole(req.body.name, req.body.role)) return res.status(404).json({ error: "no player" });
        res.json({});
    });

    router.post("/mod/verdict", (req, res) => {
        const staff = requireStaff(req, res);
        if (!staff) return;
        const target = store.nameOwner(req.body.name);
        if (!target) return res.status(404).json({ error: "no player" });
        const level = String(req.body.level || "clear");
        store.setVerdict(target.name, level);
        moderation.recordVerdict(target, level, String(req.body.reason || ""), staff);
        if (level === "ban") game.kickAccount(target.id, "kicked");
        res.json({});
    });

    router.post("/mod/clan", (req, res) => {
        if (!requireStaff(req, res)) return;
        if (!store.setClanShadow(req.body.clan, req.body.shadow)) return res.status(404).json({ error: "not found" });
        res.json({});
    });

    router.post("/mod/player", (req, res) => {
        if (!requireStaff(req, res)) return;
        const target = store.nameOwner(req.body.name);
        if (!target) return res.status(404).json({ error: "no player" });
        res.json(moderation.playerRecord(target, game.sessionFor(target.id)));
    });

    // ---------- FRVR social (friends) - not available on a private server ----------
    router.all(["/requests", "/names-for", "/friends/allow", "/social/*rest"], (_req, res) => res.status(404).json({ error: "not found" }));

    router.use((_req, res) => res.status(404).json({ error: "not found" }));
    return router;
}
