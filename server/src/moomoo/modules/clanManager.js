
import { Player } from "./player.js";

export class Clan {

    teams = new Map;
    /** @type {Player[]} */
    players = 0xf;
    /** @type {Player} */
    owner = -1;

    constructor(title, players, owner) {

        this.title = title;
        this.players = players;
        this.owner = owner;

        this.join(owner.sid, owner.name);

    }

    join(sid, name) {

        const player = this.players.find(x => x.sid === sid);

        if (!player) return;

        if (player.team) return;

        if (sid === this.owner.sid) {
            player.is_owner = true;
        }

        player.team = this.title;
        player.send("st", player.team, player.is_owner);

        this.teams.set(
            sid,
            name
        );

        this.update();

    }

    kick(sid) {

        const player = this.players.find(x => x.sid === sid);

        if (!player) return;

        player.team = null;
        player.send("st", null, false);

        if (this.teams.delete(sid)) this.update();

    }

    notify(sid) {

        if (this.owner.notify.has(sid)) return;

        const player = this.players.find(x => x.sid === sid);
        if (!player) return;

        this.owner.send("an", sid, player.name);
        this.owner.notify.add(sid);

    }

    update() {

        const ext = [...this.teams.entries()].flat();

        for (const [sid, _name] of this.teams) {

            const player = this.players.find(x => x.sid === sid);

            if (!player) break;

            player.send("sa", ext);

        }

    }

}

export class ClanManager {

    clans = new Map;

    /** @type {Player[]} */
    players = 0xff;

    constructor(players, server) {

        this.players = players;
        this.server = server;

    }

    create(name, player) {

        if (this.clans.has(name)) return false;

        const clan = new Clan(name, this.players, player);

        this.clans.set(name, clan);
        this.server.broadcast("ac", {sid: name});

        return true;

    }

    remove(name) {

        const clan = this.clans.get(name);

        if (!clan) return false;

        for (const [sid, name] of clan.teams) {
            
            const player = this.players.find(x => x.sid === sid);

            if (!player) break;

            player.team = null;
            player.is_owner = false;
            player.send("st", null, false);

        }

        clan.owner.notify.clear();

        this.clans.delete(name);
        this.server.broadcast("ad", name);

        return true;

    }

    kick(name, sid) {

        this.clans.get(name)?.kick(sid);

    }

    join(name, player) {

        this.clans.get(name)?.join(player.sid, player.name);

    }

    add_notify(name, sid) {

        this.clans.get(name)?.notify(sid);

    }

    unnotify(name, sid) {

        this.clans.get(name)?.owner.notify.delete(sid);

    }

    confirm_join(name, sid, join) {

        const player = this.players.find(x => x.sid === sid);

        if (!player) return;

        this.unnotify(name, player?.sid);

        if (join) {
            this.join(name, player);
            return;
        }

    }

    ext() {

        const ext = [...this.clans.keys()].map(sid => {
            return {sid}
        });

        return ext;

    }

}