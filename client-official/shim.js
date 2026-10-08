/*
 * Local stand-ins for the third-party services the official client expects on moomoo.io.
 * Loaded as a classic script before the game module, exactly where the FRVR SDK,
 * CookiePro consent and the ad scripts used to be.
 *
 *  - FRVR SDK: bootstrapper, tracker, ads, profile and the auth API used for signing in.
 *    Sign-in talks to this server's /api/auth/* endpoints: any email works, any 6-digit
 *    code or password is accepted, and a real (locally signed) access token is issued.
 *  - FRVR social: friends (webClient -> /api/social) and the live socket for presence and
 *    game invites (/api/social/ws), with the SDK's message format ({code, data}).
 *  - Cloudflare Turnstile: the "human check" passes instantly.
 *  - Ads / consent: no-ops.
 */
(function () {
    "use strict";

    var API = location.origin + "/api";
    var STORE_KEY = "moo_local_frvr_session";
    var GAME_ID = "moomoo";

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
        getFRVRID: function () {
            return session ? session.id : null;
        },
        getFreshAccessToken: function () {
            if (!session) return Promise.resolve(null);
            return post("/auth/refresh", { token: session.token }).then(function (res) {
                var changed = session.id !== res.id;
                session.token = res.token;
                session.id = res.id;
                save(session);
                if (changed) notify();
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
        // Like the SDK: JSON + "Authorization: Bearer <access token>", refreshing first
        // when the token is close to expiring.
        authenticatedFetch: function (url, opts) {
            return freshEnough().then(function (token) {
                if (!token) throw sdkError("notLoggedIn");
                var options = Object.assign({}, opts);
                options.headers = Object.assign({ "Content-Type": "application/json" }, options.headers, { Authorization: "Bearer " + token });
                return fetch(url, options);
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

    function tokenExpiry(token) {
        try {
            var part = String(token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            return (JSON.parse(atob(part)).exp || 0) * 1000;
        } catch (e) {
            return 0;
        }
    }

    function freshEnough() {
        if (!session) return Promise.resolve(null);
        if (tokenExpiry(session.token) - Date.now() > 60000) return Promise.resolve(session.token);
        return auth.getFreshAccessToken();
    }

    // ---------------- FRVR social ----------------
    var SOCIAL_EVENTS = {
        onFriendStatusUpdated: "FRIEND_STATUS_UPDATED",
        onConnect: "ON_CONNECT",
        onGameInvite: "RECEIVE_GAME_INVITE",
        onError: "ON_ERROR"
    };

    function LiveClient(gameId) {
        var self = this;
        this.gameId = gameId;
        this.SocialEvents = SOCIAL_EVENTS;
        this.listeners = {};
        Object.keys(SOCIAL_EVENTS).forEach(function (k) {
            self.listeners[SOCIAL_EVENTS[k]] = [];
        });
        this.friendsStatus = {};
        this.socket = null;
        this.connectedUser = undefined;
        this.closedByUser = false;
        this.retries = 0;
        this.on(SOCIAL_EVENTS.onConnect, function (msg) {
            ((msg.data && msg.data.friends) || []).forEach(function (status) {
                self.friendsStatus[status.userId] = status;
            });
        });
        this.on(SOCIAL_EVENTS.onFriendStatusUpdated, function (msg) {
            if (msg.data) self.friendsStatus[msg.data.userId] = msg.data;
        });
        auth.addStatusChangeListener(function () {
            if (!auth.isLoggedIn()) return self.close();
            var state = self.readyState();
            if (state === 0 || state === 1) self.connect();
        });
    }

    LiveClient.prototype.readyState = function () {
        return this.socket ? this.socket.readyState : 3;
    };

    LiveClient.prototype.connect = function () {
        var sameUser = this.connectedUser === auth.getFRVRID();
        var state = this.readyState();
        if ((state !== 0 && state !== 1) || !sameUser) {
            this.connectedUser = auth.getFRVRID();
            this.open();
        }
    };

    LiveClient.prototype.open = function () {
        var self = this;
        this.closedByUser = false;
        if (this.socket) {
            var old = this.socket;
            this.socket = null;
            old.onopen = old.onclose = old.onmessage = old.onerror = null;
            try {
                old.close();
            } catch (e) {}
        }
        auth.getFreshAccessToken().then(function (token) {
            if (!token || self.closedByUser) return;
            var ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/social/ws?token=" + encodeURIComponent(token) + "&gameId=" + encodeURIComponent(self.gameId));
            self.socket = ws;
            ws.onopen = function () {
                self.retries = 0;
            };
            ws.onmessage = function (event) {
                var msg;
                try {
                    msg = JSON.parse(event.data);
                } catch (e) {
                    return;
                }
                if (msg && self.listeners[msg.code]) self.dispatch(msg.code, msg);
            };
            ws.onclose = function () {
                if (self.socket === ws && !self.closedByUser) self.reconnect();
            };
            ws.onerror = function () {};
        });
    };

    LiveClient.prototype.reconnect = function () {
        var self = this;
        var backoff = 500 * this.retries++ + 1000;
        setTimeout(function () {
            if (!self.closedByUser) self.open();
        }, backoff);
    };

    LiveClient.prototype.close = function () {
        this.friendsStatus = {};
        this.connectedUser = undefined;
        this.closedByUser = true;
        if (this.socket) {
            try {
                this.socket.close();
            } catch (e) {}
        }
    };

    LiveClient.prototype.on = function (type, listener) {
        if (!this.listeners[type]) throw new Error('event type "' + type + '" is not supported');
        this.listeners[type].push(listener);
    };

    LiveClient.prototype.dispatch = function (type, msg) {
        this.listeners[type].forEach(function (listener) {
            listener(msg);
        });
    };

    LiveClient.prototype.send = function (msg) {
        if (this.socket && this.socket.readyState === 1) this.socket.send(JSON.stringify(msg));
    };

    LiveClient.prototype.getFriendsStatus = function () {
        var self = this;
        return Object.keys(this.friendsStatus).map(function (id) {
            return self.friendsStatus[id];
        });
    };

    LiveClient.prototype.updateStatus = function (metadata) {
        this.send({ code: "UPDATE_STATUS", data: { metadata: metadata, gameId: this.gameId } });
    };

    LiveClient.prototype.sendGameInvite = function (recipientId, lobbyId, metadata) {
        this.send({ code: "SEND_GAME_INVITE", data: { recipientId: recipientId, lobbyId: lobbyId, gameId: this.gameId, metadata: metadata } });
    };

    var social = {
        gameId: GAME_ID,
        webClient: { baseUrl: API + "/social", auth: auth },
        live: new LiveClient(GAME_ID)
    };

    // ---------------- FRVR SDK ----------------
    window.FRVR = {
        config: { gameId: GAME_ID },
        bootstrapper: {
            init: function () {
                return Promise.resolve();
            },
            complete: function () {
                return Promise.resolve();
            }
        },
        auth: auth,
        social: social,
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
