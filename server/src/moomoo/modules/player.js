import {
    Filter
} from "bad-words";
import {
    encode
} from "msgpack-lite";
import { delay } from "./delay.js";

var langFilter = new Filter();
var newProfane = ['jew', 'black', 'baby', 'child', 'white', 'porn', 'pedo', 'trump', 'clinton', 'hitler', 'nazi', 'gay', 'pride', 'sex', 'pleasure', 'touch', 'poo', 'kids', 'rape', 'white power', 'nigga', 'nig nog', 'doggy', 'rapist', 'boner', 'nigger', 'nigg', 'finger', 'nogger', 'nagger', 'nig', 'fag', 'gai', 'pole', 'stripper', "penis", 'vagina', 'pussy', 'nazi', 'hitler', 'stalin', 'burn', 'chamber', 'cock', 'peen', 'dick', 'spick', 'nieger', 'die', 'satan', 'n|ig', 'nlg', 'cunt', 'c0ck', 'fag', 'lick', 'condom', 'anal', 'shit', 'phile', 'little', 'kids', 'free KR', 'tiny', 'sidney', 'ass', 'kill', '.io', '(dot)', '[dot]', 'mini', 'whiore', 'whore', 'faggot', 'github', '1337', '666', 'satan', 'senpa', 'discord', 'd1scord', 'mistik', '.io', 'senpa.io', 'sidney', 'sid', 'senpaio', 'vries', 'asa'];
langFilter.addWords(...newProfane);
var mathABS = Math.abs;
var mathCOS = Math.cos;
var mathSIN = Math.sin;
var mathPOW = Math.pow;
var mathSQRT = Math.sqrt;
export class Player {

    is_owner = false;
    notify = new Set;
    chat_cooldown = 0;
    clan_cooldown = 0;
    ping_cooldown = 0;

    is_bot = false;
    packet_spam = 0;

    async send(type, ...data) {

        await delay();

        if (!this.socket) return;

        this.socket.send(encode([type, data]));

    }

    setSkin(id) {
        this.skin = hats.find(hat => hat.id == id);
        this.skinIndex = id;
    }

    setTail(id) {
        this.tail = accessories.find(acc => acc.id == id);
        this.tailIndex = id;
    }

    constructor(id, sid, config, UTILS, projectileManager, objectManager, players, ais, items, hats, accessories, socket, scoreCallback, iconCallback) {
        this.socket = socket;
        this.id = id;
        this.sid = sid;
        this.tmpScore = 0;
        this.team = null;
        this.skinIndex = 0;
        this.tailIndex = 0;
        this.hitTime = 0;
        this.tails = {};
        for (var i = 0; i < accessories.length; ++i) {
            if (accessories[i].price <= 0) {
                this.tails[accessories[i].id] = 1;
            }
        }
        this.skins = {};
        for (var i = 0; i < hats.length; ++i) {
            if (hats[i].price <= 0) {
                this.skins[hats[i].id] = 1;
            }
        }
        this.points = 0;
        this.dt = 0;
        this.hidden = false;
        this.itemCounts = {};
        this.isPlayer = true;
        this.pps = 0;
        this.moveDir = undefined;
        this.skinRot = 0;
        this.lastPing = 0;
        this.iconIndex = 0;
        this.skinColor = 0;

        // SPAWN:
        this.spawn = function(moofoll) {
            this.active = true;
            this.alive = true;
            this.lockMove = false;
            this.lockDir = false;
            this.minimapCounter = 0;
            this.chatCountdown = 0;
            this.shameCount = 0;
            this.shameTimer = 0;
            this.sentTo = {};
            this.gathering = 0;
            this.autoGather = 0;
            this.animTime = 0;
            this.animSpeed = 0;
            this.mouseState = 0;
            this.buildIndex = -1;
            this.weaponIndex = 0;
            this.dmgOverTime = {};
            this.noMovTimer = 0;
            this.maxXP = 300;
            this.XP = 0;
            this.age = 1;
            this.kills = 0;
            this.upgrAge = 2;
            this.upgradePoints = 0;

            const spawn = objectManager.fetchSpawnObj(this.sid);

            if (spawn) {
                
                [
                    this.x,
                    this.y
                ] = spawn;

            } else {
                this.x = config.mapScale * Math.random();
                this.y = config.mapScale * Math.random();
            }


            this.zIndex = 0;
            this.xVel = 0;
            this.yVel = 0;
            this.slowMult = 1;
            this.dir = 0;
            this.dirPlus = 0;
            this.targetDir = 0;
            this.targetAngle = 0;
            this.maxHealth = 100;
            this.health = this.maxHealth;
            this.scale = config.playerScale;
            this.speed = config.playerSpeed;
            this.resetMoveDir();
            this.resetResources(moofoll);
            this.items = [0, 3, 6, 10];
            this.weapons = [0];
            this.shootCount = 0;
            this.weaponXP = [];
            this.reloads = {};
            this.hits = 0;
        };

        // RESET MOVE DIR:
        this.resetMoveDir = function() {
            this.moveDir = undefined;
        };

        // RESET RESOURCES:
        this.resetResources = function(moofoll) {
            for (var i = 0; i < config.resourceTypes.length; ++i) {
                this[config.resourceTypes[i]] = moofoll ? 100 : 0;
            }
        };

        // ADD ITEM:
        this.addItem = function(id) {
            var tmpItem = items.list[id];
            if (tmpItem) {
                for (var i = 0; i < this.items.length; ++i) {
                    if (items.list[this.items[i]].group == tmpItem.group) {
                        if (this.buildIndex == this.items[i]) {
                            this.buildIndex = id;
                        }
                        this.items[i] = id;
                        return true;
                    }
                }
                this.items.push(id);
                return true;
            }
            return false;
        };

        // SET USER DATA:
        this.setUserData = function(data) {
            if (data) {
                // SET INITIAL NAME:
                this.name = "unknown";

                // VALIDATE NAME:
                var name = data.name + "";
                name = name.slice(0, config.maxNameLength);
                name = name.replace(/[^\w:\(\)\/? -]+/gmi, " "); // USE SPACE SO WE CAN CHECK PROFANITY
                name = name.replace(/[^\x00-\x7F]/g, " ");
                name = name.trim();

                // CHECK IF IS PROFANE:
                var isProfane = false;
                var convertedName = name.toLowerCase().replace(/\s/g, "").replace(/1/g, "i").replace(/0/g, "o").replace(/5/g, "s");
                for (var word of langFilter.list) {
                    if (convertedName.indexOf(word) != -1) {
                        isProfane = true;
                        break;
                    }
                }
                if (name.length > 0 && !isProfane) {
                    this.name = name;
                }

                // SKIN:
                this.skinColor = 0;
                if (config.skinColors[data.skin]) {
                    this.skinColor = data.skin;
                }
            }
        };

        // GET DATA TO SEND:
        this.getData = function() {
            return [this.id, this.sid, this.name, UTILS.fixTo(this.x, 2), UTILS.fixTo(this.y, 2), UTILS.fixTo(this.dir, 3), this.health, this.maxHealth, this.scale, this.skinColor];
        };

        this.getInfo = function() {
            return [
                this.sid,
                Math.round(this.x),
                Math.round(this.y),
                UTILS.fixTo(this.dir, 2),
                this.buildIndex,
                this.weaponIndex,
                config.fetchVariant(this).id,
                this.team,
                this.is_owner,
                this.skinIndex,
                this.tailIndex,
                this.iconIndex,
                this.zIndex
            ];
        };

        // SET DATA:
        this.setData = function(data) {
            this.id = data[0];
            this.sid = data[1];
            this.name = data[2];
            this.x = data[3];
            this.y = data[4];
            this.dir = data[5];
            this.health = data[6];
            this.maxHealth = data[7];
            this.scale = data[8];
            this.skinColor = data[9];
        };

        // UPDATE:
        var timerCount = 0;
        this.update = function(delta) {
            if (!this.alive) {
                return;
            }

            if (this.chat_cooldown >= 0) {
                this.chat_cooldown -= delta;
            }
            if (this.clan_cooldown >= 0) {
                this.clan_cooldown -= delta;
            }
            if (this.ping_cooldown >= 0) {
                this.ping_cooldown -= delta;
            }

            // SHAME SHAME SHAME:
            if (this.shameTimer > 0) {
                this.skinIndex = 45;
                this.shameTimer -= delta;
                if (this.shameTimer <= 0) {
                    this.skinIndex = this.skin.id || 0;
                    this.shameTimer = 0;
                    this.shameCount = 0;
                }
            }

            // REGENS AND AUTO:
            timerCount -= 1;
            if (timerCount <= 0) {

                if (this.pps) {
                    this.addResource(3, this.pps * 1000, true);
                    this.earnXP(this.pps * 1000);
                }

                var regenAmount = (this.skin && this.skin.healthRegen ? this.skin.healthRegen : 0) + (this.tail && this.tail.healthRegen ? this.tail.healthRegen : 0);
                if (regenAmount) {
                    this.changeHealth(regenAmount, this);
                }
                if (this.dmgOverTime.dmg) {
                    this.changeHealth(-this.dmgOverTime.dmg, this.dmgOverTime.doer);
                    this.dmgOverTime.time -= 1;
                    if (this.dmgOverTime.time <= 0) {
                        this.dmgOverTime.dmg = 0;
                    }
                }
                if (this.healCol) {
                    this.changeHealth(this.healCol, this);
                }
                timerCount = config.serverUpdateRate;

                this.packet_spam = 0;
            }

            // CHECK KILL:
            if (!this.alive) {
                return;
            }

            // SLOWER:
            if (this.slowMult < 1) {
                this.slowMult += 0.0008 * delta;
                if (this.slowMult > 1) {
                    this.slowMult = 1;
                }
            }

            // MOVE:
            this.noMovTimer += delta;
            if (this.xVel || this.yVel) {
                this.noMovTimer = 0;
            }
            if (this.lockMove) {
                this.xVel = 0;
                this.yVel = 0;
            } else {
                var spdMult = (this.buildIndex >= 0 ? 0.5 : 1) * (items.weapons[this.weaponIndex].spdMult || 1) * (this.skin ? this.skin.spdMult || 1 : 1) * (this.tail ? this.tail.spdMult || 1 : 1) * (this.y <= config.snowBiomeTop ? this.skin && this.skin.coldM ? 1 : config.snowSpeed : 1) * this.slowMult;
                if (!this.zIndex && this.y >= config.mapScale / 2 - config.riverWidth / 2 && this.y <= config.mapScale / 2 + config.riverWidth / 2) {
                    if (this.skin && this.skin.watrImm) {
                        spdMult *= 0.75;
                        this.xVel += config.waterCurrent * 0.4 * delta;
                    } else {
                        spdMult *= 0.33;
                        this.xVel += config.waterCurrent * delta;
                    }
                }
                var xVel = this.moveDir != undefined ? mathCOS(this.moveDir) : 0;
                var yVel = this.moveDir != undefined ? mathSIN(this.moveDir) : 0;
                var length = mathSQRT(xVel * xVel + yVel * yVel);
                if (length != 0) {
                    xVel /= length;
                    yVel /= length;
                }
                if (xVel) {
                    this.xVel += xVel * this.speed * spdMult * delta;
                }
                if (yVel) {
                    this.yVel += yVel * this.speed * spdMult * delta;
                }
            }

            // OBJECT COLL:
            this.zIndex = 0;
            this.lockMove = false;
            this.healCol = 0;

            (() => {

                const dist = UTILS.getDistance(0, 0, this.xVel * delta, this.yVel * delta);
                const depth = Math.min(4, Math.max(1, Math.round(dist / 40)));
                const mlt = 1 / depth;
                
                for (let i = 0; i < depth; i++) {
                
                    if (this.xVel) {
                        this.x += this.xVel * delta * mlt;
                    }
                    if (this.yVel) {
                        this.y += this.yVel * delta * mlt;
                    }

                    const arrs = objectManager.getGridArrays(this.x, this.y, this.scale);
                    const already = new Set;

                    for (let x = 0; x < arrs.length; x++) {
                        for (let y = 0; y < arrs[x].length; y++) {

                            const obj = arrs[x][y];
                
                            if (!obj.active || already.has(obj.sid)) {
                                continue;
                            }
                
                            already.add(obj.sid);
                            objectManager.checkCollision(this, obj, mlt);
                
                            if (!this.alive) return;

                        }

                    }
                }

            })();

            // PLAYER COLLISIONS:
            var tmpIndx = players.indexOf(this);
            for (var i = tmpIndx + 1; i < players.length; ++i) {
                if (players[i] != this && players[i].alive) {
                    objectManager.checkCollision(this, players[i]);
                }
            }

            // DECEL:
            if (this.xVel) {
                this.xVel *= mathPOW(config.playerDecel, delta);
                if (this.xVel <= 0.01 && this.xVel >= -0.01) {
                    this.xVel = 0;
                }
            }
            if (this.yVel) {
                this.yVel *= mathPOW(config.playerDecel, delta);
                if (this.yVel <= 0.01 && this.yVel >= -0.01) {
                    this.yVel = 0;
                }
            }

            // MAP BOUNDARIES:
            if (this.x - this.scale < 0) {
                this.x = this.scale;
            } else {
                if (this.x + this.scale > config.mapScale) {
                    this.x = config.mapScale - this.scale;
                }
            }
            if (this.y - this.scale < 0) {
                this.y = this.scale;
            } else {
                if (this.y + this.scale > config.mapScale) {
                    this.y = config.mapScale - this.scale;
                }
            }

            // USE WEAPON OR TOOL:
            if (this.buildIndex < 0) {
                this.gathering = this.mouseState || this.hits > 0;
                if (this.reloads[this.weaponIndex] > 0) {
                    this.reloads[this.weaponIndex] -= delta;
                } else {
                    if (this.gathering || this.autoGather) {
                        var worked = true;
                        if (items.weapons[this.weaponIndex].gather != undefined) {
                            this.gather(players);
                        } else {
                            if (items.weapons[this.weaponIndex].projectile != undefined && this.hasRes(items.weapons[this.weaponIndex], this.skin ? this.skin.projCost : 0)) {
                                this.useRes(items.weapons[this.weaponIndex], this.skin ? this.skin.projCost : 0);
                                this.noMovTimer = 0;
                                var tmpIndx = items.weapons[this.weaponIndex].projectile;
                                var projOffset = this.scale * 2;
                                var aMlt = this.skin && this.skin.aMlt ? this.skin.aMlt : 1;
                                if (items.weapons[this.weaponIndex].rec) {
                                    this.xVel -= items.weapons[this.weaponIndex].rec * mathCOS(this.dir);
                                    this.yVel -= items.weapons[this.weaponIndex].rec * mathSIN(this.dir);
                                }
                                projectileManager.addProjectile(this.x + projOffset * mathCOS(this.dir), this.y + projOffset * mathSIN(this.dir), this.dir, items.projectiles[tmpIndx].range * aMlt, items.projectiles[tmpIndx].speed * aMlt, tmpIndx, this, null, this.zIndex);
                            } else {
                                worked = false;
                            }
                        }
                        this.gathering = this.mouseState;
                        if (worked) {
                            this.reloads[this.weaponIndex] = items.weapons[this.weaponIndex].speed * (this.skin ? this.skin.atkSpd || 1 : 1);
                        }
                    }
                }
            }

            this.hits = 0;

            this.shootCount -= delta;
            if (this.shootCount <= 0) {
                this.addProjectile();
            }

        };

        this.addProjectile = () => {
            if (this.skinIndex != 53) return;
            let getDist = (tmpObj) => UTILS.getDistance(this.x, this.y, tmpObj.x, tmpObj.y);
            let getDirect = (tmpObj) => UTILS.getDirection(tmpObj.x, tmpObj.y, this.x, this.y)
            let nearPlayer = players.filter(tmpObj => tmpObj.alive && tmpObj.skinIndex != 22 && !(this == tmpObj || (this.team && this.team == tmpObj.team))).sort(function (tmp1, tmp2) {
                return getDist(tmp1) - getDist(tmp2);
            })[0];
            if (!nearPlayer) return;
            if (getDist(nearPlayer) > 735) return;
            projectileManager.addProjectile(this.x, this.y, getDirect(nearPlayer), this.skin.turret.range, 1.6, this.skin.turret.proj, this, 0, 1);
            this.shootCount = 2500;
        }

        // ADD WEAPON XP:
        this.addWeaponXP = function(amnt) {
            if (!this.weaponXP[this.weaponIndex]) {
                this.weaponXP[this.weaponIndex] = 0;
            }
            this.weaponXP[this.weaponIndex] += amnt;
        };

        // EARN XP:
        this.earnXP = function(amount) {

            if (this.age < config.maxAge) {
                this.XP += amount;
                if (this.XP >= this.maxXP) {
                    if (this.age < config.maxAge) {
                        this.age++;
                        this.XP = 0;
                        this.maxXP *= 1.2;
                    } else {
                        this.XP = this.maxXP;
                    }
                    this.upgradePoints++;
                    this.send("16", this.upgradePoints, this.upgrAge);
                    this.send("15", this.XP, UTILS.fixTo(this.maxXP, 1), this.age);
                } else {
                    this.send("15", this.XP);
                }
            }
        };

        // CHANGE HEALTH:
        this.changeHealth = function(amount, doer) {
            if (amount > 0 && this.health >= this.maxHealth) {
                return false;
            }
            if (amount < 0 && this.skin) {
                amount *= this.skin.dmgMult || 1;
            }
            if (amount < 0 && this.tail) {
                amount *= this.tail.dmgMult || 1;
            }
            if (amount < 0) {
                this.hitTime = Date.now();
            }
            this.health += amount;
            if (this.health > this.maxHealth) {
                amount -= this.health - this.maxHealth;
                this.health = this.maxHealth;
            }
            if (this.health <= 0) {
                this.kill(doer);
            }
            for (var i = 0; i < players.length; ++i) {
                if (this.sentTo[players[i].id]) {
                    players[i].send("h", this.sid, Math.round(this.health));
                }
            }
            if (doer && doer.canSee(this) && !(doer == this && amount < 0)) {
                doer.send("t", Math.round(this.x), Math.round(this.y), Math.round(-amount), 1);
            }
            return true;
        };

        // KILL:
        this.kill = function(doer) {
            if (doer && doer.alive) {
                doer.kills++;
                if (doer.skin && doer.skin.goldSteal) {
                    scoreCallback(doer, Math.round(this.points / 2));
                } else {
                    scoreCallback(doer, Math.round(this.age * 100 * (doer.skin && doer.skin.kScrM ? doer.skin.kScrM : 1)));
                }
                doer.send("9", "kills", doer.kills, 1);
            }
            this.alive = false;
            this.send("11");
            iconCallback();
        };

        // ADD RESOURCE:
        this.addResource = function(type, amount, auto) {
            if (!auto && amount > 0) {
                this.addWeaponXP(amount);
            }
                this[config.resourceTypes[type]] += amount;
                this.send("9", config.resourceTypes[type], this[config.resourceTypes[type]], 1);
        };

        // CHANGE ITEM COUNT:
        this.changeItemCount = function(index, value) {
            this.itemCounts[index] = this.itemCounts[index] || 0;
            this.itemCounts[index] += value;
            this.send("14", index, this.itemCounts[index]);
        };

        // BUILD:
        this.buildItem = function(item) {
            var tmpS = this.scale + item.scale + (item.placeOffset || 0);
            var tmpX = this.x + tmpS * mathCOS(this.dir);
            var tmpY = this.y + tmpS * mathSIN(this.dir);
            if (this.canBuild(item) && !(item.consume && this.skin && this.skin.noEat) && (item.consume || objectManager.checkItemLocation(tmpX, tmpY, item.scale, 0.6, item.id, false, this))) {
                var worked = false;
                if (item.consume) {
                    if (this.hitTime) {
                        var timeSinceHit = Date.now() - this.hitTime;
                        this.hitTime = 0;
                        if (timeSinceHit <= 120) {
                            this.shameCount++;
                            if (this.shameCount >= 8) {
                                this.shameTimer = 30000;
                                this.shameCount = 0;
                            }
                        } else {
                            this.shameCount -= 2;
                            if (this.shameCount <= 0) {
                                this.shameCount = 0;
                            }
                        }
                    }
                    if (this.shameTimer <= 0) {
                        worked = item.consume(this);
                    }
                } else {
                    worked = true;
                    if (item.group.limit) {
                        this.changeItemCount(item.group.id, 1);
                    }
                    if (item.pps) {
                        this.pps += item.pps;
                    }
                    objectManager.add(objectManager.objects.length, tmpX, tmpY, this.dir, item.scale, item.type, item, false, this);
                }
                if (worked) {
                    this.useRes(item);
                    this.buildIndex = -1;
                }
            }
        };

        // HAS RESOURCES:
        this.hasRes = function(item, mult) {
            for (var i = 0; i < item.req.length;) {
                if (this[item.req[i]] < Math.round(item.req[i + 1] * (mult || 1))) {
                    return false;
                }
                i += 2;
            }
            return true;
        };

        // USE RESOURCES:
        this.useRes = function(item, mult) {
            if (config.inSandbox) {
                return;
            }
            for (var i = 0; i < item.req.length;) {
                this.addResource(config.resourceTypes.indexOf(item.req[i]), -Math.round(item.req[i + 1] * (mult || 1)));
                i += 2;
            }
        };

        // CAN BUILD:
        this.canBuild = function(item) {
            if (config.inSandbox) {
                return true;
            }
            if (item.group.limit && this.itemCounts[item.group.id] >= item.group.limit) {
                return false;
            }
            return this.hasRes(item);
        };

        // GATHER:
        this.gather = function() {
            // SHOW:
            this.noMovTimer = 0;

            // SLOW MOVEMENT:
            this.slowMult -= items.weapons[this.weaponIndex].hitSlow || 0.3;
            if (this.slowMult < 0) {
                this.slowMult = 0;
            }

            // VARIANT DMG:
            var tmpVariant = config.fetchVariant(this);
            var applyPoison = tmpVariant.poison;
            var variantDmg = tmpVariant.val;

            // CHECK IF HIT GAME OBJECT:
            var hitObjs = {};
            var tmpDist;
            var tmpDir;
            var tmpObj;
            var hitSomething;
            var tmpList = objectManager.getGridArrays(this.x, this.y, items.weapons[this.weaponIndex].range);
            for (var t = 0; t < tmpList.length; ++t) {
                for (var i = 0; i < tmpList[t].length; ++i) {
                    tmpObj = tmpList[t][i];
                    if (tmpObj.active && !tmpObj.dontGather && !hitObjs[tmpObj.sid] && tmpObj.visibleToPlayer(this)) {
                        tmpDist = UTILS.getDistance(this.x, this.y, tmpObj.x, tmpObj.y) - tmpObj.scale;
                        if (tmpDist <= items.weapons[this.weaponIndex].range) {
                            tmpDir = UTILS.getDirection(tmpObj.x, tmpObj.y, this.x, this.y);
                            if (UTILS.getAngleDist(tmpDir, this.dir) <= config.gatherAngle) {
                                hitObjs[tmpObj.sid] = 1;
                                if (tmpObj.health) {
                                    if (tmpObj.changeHealth(-items.weapons[this.weaponIndex].dmg * variantDmg * (items.weapons[this.weaponIndex].sDmg || 1) * (this.skin && this.skin.bDmg ? this.skin.bDmg : 1), this)) {
                                        for (var x = 0; x < tmpObj.req.length;) {
                                            this.addResource(config.resourceTypes.indexOf(tmpObj.req[x]), tmpObj.req[x + 1]);
                                            x += 2;
                                        }
                                        objectManager.disableObj(tmpObj);
                                    }
                                } else {
                                    this.earnXP(4 * items.weapons[this.weaponIndex].gather);
                                    var count = items.weapons[this.weaponIndex].gather + (tmpObj.type == 3 ? 4 : 0);
                                    if (this.skin && this.skin.extraGold) {
                                        this.addResource(3, 1);
                                    }
                                    this.addResource(tmpObj.type, count);
                                }
                                hitSomething = true;
                                objectManager.hitObj(tmpObj, tmpDir);
                            }
                        }
                    }
                }
            }

            // CHECK IF HIT PLAYER:
            for (var i = 0; i < players.length + ais.length; ++i) {
                tmpObj = players[i] || ais[i - players.length];
                if (tmpObj != this && tmpObj.alive && !(tmpObj.team && tmpObj.team == this.team)) {
                    tmpDist = UTILS.getDistance(this.x, this.y, tmpObj.x, tmpObj.y) - tmpObj.scale * 1.8;
                    if (tmpDist <= items.weapons[this.weaponIndex].range) {
                        tmpDir = UTILS.getDirection(tmpObj.x, tmpObj.y, this.x, this.y);
                        if (UTILS.getAngleDist(tmpDir, this.dir) <= config.gatherAngle) {
                            // STEAL RESOURCES:
                            var stealCount = items.weapons[this.weaponIndex].steal;
                            if (stealCount && tmpObj.addResource) {
                                stealCount = Math.min(tmpObj.points || 0, stealCount);
                                this.addResource(3, stealCount);
                                tmpObj.addResource(3, -stealCount);
                            }

                            // MELEE HIT PLAYER:
                            var dmgMlt = variantDmg;
                            if (tmpObj.weaponIndex != undefined && items.weapons[tmpObj.weaponIndex].shield && UTILS.getAngleDist(tmpDir + Math.PI, tmpObj.dir) <= config.shieldAngle) {
                                dmgMlt = items.weapons[tmpObj.weaponIndex].shield;
                            }
                            var dmgVal = items.weapons[this.weaponIndex].dmg * (this.skin && this.skin.dmgMultO ? this.skin.dmgMultO : 1) * (this.tail && this.tail.dmgMultO ? this.tail.dmgMultO : 1);
                            var tmpSpd = 0.3 * (tmpObj.weightM || 1) + (items.weapons[this.weaponIndex].knock || 0);
                            tmpObj.xVel += tmpSpd * mathCOS(tmpDir);
                            tmpObj.yVel += tmpSpd * mathSIN(tmpDir);
                            if (this.skin && this.skin.healD) {
                                this.changeHealth(dmgVal * dmgMlt * this.skin.healD, this);
                            }
                            if (this.tail && this.tail.healD) {
                                this.changeHealth(dmgVal * dmgMlt * this.tail.healD, this);
                            }
                            if (tmpObj.skin && tmpObj.skin.dmg) {
                                this.changeHealth(-dmgVal * tmpObj.skin.dmg, tmpObj);
                            }
                            if (tmpObj.tail && tmpObj.tail.dmg) {
                                this.changeHealth(-dmgVal * tmpObj.tail.dmg, tmpObj);
                            }
                            if (tmpObj.dmgOverTime && this.skin && this.skin.poisonDmg && !(tmpObj.skin && tmpObj.skin.poisonRes)) {
                                tmpObj.dmgOverTime.dmg = this.skin.poisonDmg;
                                tmpObj.dmgOverTime.time = this.skin.poisonTime || 1;
                                tmpObj.dmgOverTime.doer = this;
                            }
                            if (tmpObj.dmgOverTime && applyPoison && !(tmpObj.skin && tmpObj.skin.poisonRes)) {
                                tmpObj.dmgOverTime.dmg = 5;
                                tmpObj.dmgOverTime.time = 5;
                                tmpObj.dmgOverTime.doer = this;
                            }
                            if (tmpObj.skin && tmpObj.skin.dmgK) {
                                this.xVel -= tmpObj.skin.dmgK * mathCOS(tmpDir);
                                this.yVel -= tmpObj.skin.dmgK * mathSIN(tmpDir);
                            }
                            tmpObj.changeHealth(-dmgVal * dmgMlt, this, this);
                        }
                    }
                }
            }

            // SEND FOR ANIMATION:
            this.sendAnimation(hitSomething ? 1 : 0);
        };

        // SEND ANIMATION:
        this.sendAnimation = function(hit) {
            for (var i = 0; i < players.length; ++i) {
                if (this.sentTo[players[i].id] && this.canSee(players[i])) {
                    players[i].send("7", this.sid, hit ? 1 : 0, this.weaponIndex);
                }
            }
        };

        // ANIMATE:
        var tmpRatio = 0;
        var animIndex = 0;
        this.animate = function(delta) {
            if (this.animTime > 0) {
                this.animTime -= delta;
                if (this.animTime <= 0) {
                    this.animTime = 0;
                    this.dirPlus = 0;
                    tmpRatio = 0;
                    animIndex = 0;
                } else {
                    if (animIndex == 0) {
                        tmpRatio += delta / (this.animSpeed * config.hitReturnRatio);
                        this.dirPlus = UTILS.lerp(0, this.targetAngle, Math.min(1, tmpRatio));
                        if (tmpRatio >= 1) {
                            tmpRatio = 1;
                            animIndex = 1;
                        }
                    } else {
                        tmpRatio -= delta / (this.animSpeed * (1 - config.hitReturnRatio));
                        this.dirPlus = UTILS.lerp(0, this.targetAngle, Math.max(0, tmpRatio));
                    }
                }
            }
        };

        // GATHER ANIMATION:
        this.startAnim = function(didHit, index) {
            this.animTime = this.animSpeed = items.weapons[index].speed;
            this.targetAngle = didHit ? -config.hitAngle : -Math.PI;
            tmpRatio = 0;
            animIndex = 0;
        };

        // CAN SEE:
        this.canSee = function(other) {
            if (!other) {
                return false;
            }
            if (other.skin && other.skin.invisTimer && other.noMovTimer >= other.skin.invisTimer) {
                return false;
            }
            var dx = mathABS(other.x - this.x) - other.scale;
            var dy = mathABS(other.y - this.y) - other.scale;
            return dx <= config.maxScreenWidth / 2 * 1.3 && dy <= config.maxScreenHeight / 2 * 1.3;
        };
    };
}