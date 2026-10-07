/*
 * Local stand-ins for the third-party services the official client expects on moomoo.io.
 * Loaded as a classic script before the game module, exactly where the FRVR SDK,
 * CookiePro consent and the ad scripts used to be.
 *
 *  - FRVR SDK: bootstrapper, tracker, ads, profile and the auth API used for signing in.
 *    Sign-in talks to this server's /api/auth/* endpoints: any email works, any 6-digit
 *    code or password is accepted, and a real (locally signed) access token is issued.
 *  - Cloudflare Turnstile: the "human check" passes instantly.
 *  - Ads / consent: no-ops.
 */
(function () {
    "use strict";

    var API = location.origin + "/api";
    var STORE_KEY = "moo_local_frvr_session";

    function load() {
        try {
            return JSON.parse(localStorage.getItem(STORE_KEY)) || null;
        } catch (e) {
            return null;
        }
    }

    function save(value) {
        try {
            if (value) localStorage.setItem(STORE_KEY, JSON.stringify(value));
            else localStorage.removeItem(STORE_KEY);
        } catch (e) {}
    }

    function sdkError(type) {
        var err = new Error(type);
        err.type = type;
        return err;
    }

    function post(path, body) {
        return fetch(API + path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body || {})
        }).then(function (res) {
            return res.json().catch(function () {
                return {};
            }).then(function (json) {
                if (!res.ok) throw sdkError(json.type || "serverError");
                return json;
            });
        }, function () {
            throw sdkError("networkError");
        });
    }

    // ---------------- FRVR auth ----------------
    var session = load();
    var listeners = [];

    function notify() {
        listeners.slice().forEach(function (fn) {
            try {
                fn();
            } catch (e) {
                console.error(e);
            }
        });
    }

    function signedIn(res) {
        session = { token: res.token, email: res.email, id: res.id };
        save(session);
        notify();
        return session;
    }

    function codeFlow(email) {
        var flowId = null;
        var start = function () {
            return post("/auth/code", { email: email }).then(function (res) {
                flowId = res.flow;
            });
        };
        return start().then(function () {
            return {
                email: email,
                resend: function () {
                    return start();
                },
                "continue": function (code) {
                    return post("/auth/verify", { flow: flowId, code: String(code || "") }).then(signedIn);
                }
            };
        });
    }

    var auth = {
        isLoggedIn: function () {
            return !!session;
        },
        isVerified: function () {
            return !!session;
        },
        getAccessToken: function () {
            return session ? session.token : null;
        },
        getFreshAccessToken: function () {
            if (!session) return Promise.resolve(null);
            return post("/auth/refresh", { token: session.token }).then(function (res) {
                session.token = res.token;
                save(session);
                return res.token;
            }, function (err) {
                if (err && err.type === "accountNotActive") {
                    session = null;
                    save(null);
                    notify();
                    return null;
                }
                return session ? session.token : null;
            });
        },
        logout: function () {
            session = null;
            save(null);
            notify();
            return Promise.resolve();
        },
        addStatusChangeListener: function (fn) {
            listeners.push(fn);
        },
        requestEmailLoginCode: codeFlow,
        requestEmailRegisterCode: codeFlow,
        loginToFRVR: function (opts) {
            var c = (opts && opts.credentials) || {};
            return post("/auth/password", { email: c.email, password: c.password }).then(signedIn);
        },
        registerOnFRVR: function (opts) {
            return post("/auth/password", { email: opts.email, password: opts.password, register: true }).then(signedIn);
        }
    };

    // ---------------- FRVR SDK ----------------
    window.FRVR = {
        config: {},
        bootstrapper: {
            init: function () {
                return Promise.resolve();
            },
            complete: function () {
                return Promise.resolve();
            }
        },
        auth: auth,
        tracker: {
            levelStart: function () {},
            levelEnd: function () {},
            customEvent: function () {}
        },
        ads: {
            show: function (type, callback) {
                if (typeof callback === "function") setTimeout(callback, 0);
                return Promise.resolve();
            }
        },
        profile: {
            name: function () {
                return null;
            }
        }
    };
    window.frvrSdkInitPromise = window.FRVR.bootstrapper.init();

    // ---------------- Ads / consent ----------------
    window.factorem = { refreshAds: function () {} };
    window.OptanonWrapper = function () {};
    window.adsbygoogle = window.adsbygoogle || [];

    // ---------------- Cloudflare Turnstile ----------------
    var widgets = {};
    var widgetCount = 0;

    function issueToken(id) {
        var opts = widgets[id];
        if (!opts) return;
        setTimeout(function () {
            if (!widgets[id]) return;
            var token = "local." + Date.now().toString(36) + "." + Math.random().toString(36).slice(2);
            widgets[id].token = token;
            if (typeof opts.callback === "function") opts.callback(token);
        }, 60);
    }

    window.turnstile = {
        render: function (element, opts) {
            var id = "cf-local-" + (++widgetCount);
            widgets[id] = opts || {};
            issueToken(id);
            return id;
        },
        reset: function (id) {
            if (widgets[id]) {
                widgets[id].token = null;
                issueToken(id);
            }
        },
        remove: function (id) {
            delete widgets[id];
        },
        getResponse: function (id) {
            return widgets[id] ? widgets[id].token : undefined;
        },
        isExpired: function () {
            return false;
        }
    };
})();
