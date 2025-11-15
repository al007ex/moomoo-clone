var LangFilter = require("bad-words");
var langFilter = new LangFilter();

var mathABS = Math.abs;
var mathCOS = Math.cos;
var mathSIN = Math.sin;
var mathPOW = Math.pow;
var mathSQRT = Math.sqrt;
module.exports = function (id, sid, config, UTILS, projectileManager,
    objectManager, players, ais, items, hats, accessories, server, scoreCallback, iconCallback) {
    this.id = id;
    this.sid = sid;
    this.tmpScore = 0;
    this.team = null;
    this.skinIndex = 0;
    this.tailIndex = 0;
    this.hitTime = 0;
    this.tails = {};
    for (var i = 0; i < accessories.length; ++i) {
        if (accessories[i].price <= 0)
            this.tails[accessories[i].id] = 1;
    }
    this.skins = {};
    for (var i = 0; i < hats.length; ++i) {
        if (hats[i].price <= 0)
            this.skins[hats[i].id] = 1;
    }
    this.points = 0;
    this.dt = 0;
    this.hidden = false;
    this.itemCounts = {};
    this.isPlayer = true;
    this.pps = 0;
    this.sandboxMillCount = 0;
    this.moveDir = undefined;
    this.skinRot = 0;
    this.lastPing = 0;
    this.iconIndex = 0;
    this.skinColor = 0;
    this.cps = 0;
    this.ping = -1;

    this.spawn = function (moofoll) {
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
        this.maxXP = config.experience ? config.experience.initialXP : 300;
        this.XP = 0;
        this.age = 1;
        this.kills = 0;
        this.upgrAge = 2;
        this.upgradePoints = 0;
        this.sandboxMillCount = 0;
        this.x = 0;
        this.y = 0;
        this.zIndex = 0;
        this.xVel = 0;
        this.yVel = 0;
        this.slowMult = 1;
        this.dir = 0;
        this.dirPlus = 0;
        this.targetDir = 0;
        this.targetAngle = 0;
        var baseHealth = (typeof config.baseHealth === "number") ? config.baseHealth : 100;
        this.maxHealth = baseHealth;
        this.health = this.maxHealth;
        this.scale = config.playerScale;
        this.speed = config.playerSpeed;
        this.resetMoveDir();
        this.resetResources(moofoll);
        var startItems = Array.isArray(config.startItems) ? config.startItems.slice() : [0, 3, 6, 10];
        var startWeapons = Array.isArray(config.startWeapons) ? config.startWeapons.slice() : [0];
        this.items = startItems;
        this.weapons = startWeapons;
        this.shootCount = 0;
        this.weaponXP = [];
        this.reloads = {};
        this.cps = 0;
        this.ping = -1;
    };

    this.resetMoveDir = function () {
        this.moveDir = undefined;
    };

    this.resetResources = function (moofoll) {
        var startRes = config.startResources || {};
        var baseAmount = moofoll ? startRes.moofoll : startRes.normal;
        if (typeof baseAmount !== "number") {
            baseAmount = moofoll ? 100 : 0;
        }
        for (var i = 0; i < config.resourceTypes.length; ++i) {
            this[config.resourceTypes[i]] = baseAmount;
        }
    };

    this.addItem = function (id) {
        var tmpItem = items.list[id];
        if (tmpItem) {
            for (var i = 0; i < this.items.length; ++i) {
                if (items.list[this.items[i]].group == tmpItem.group) {
                    if (this.buildIndex == this.items[i])
                        this.buildIndex = id;
                    this.items[i] = id;
                    return true;
                }
            }
            this.items.push(id);
            return true;
        }
        return false;
    };

    this.setUserData = function (data) {
        if (data) {

            this.name = "unknown";

            var name = data.name + "";
            name = name.slice(0, config.maxNameLength);
            name = name.replace(/[^\w:\(\)\/? -]+/gmi, " "); // USE SPACE SO WE CAN CHECK PROFANITY
            name = name.replace(/[^\x00-\x7F]/g, " ");
            name = name.trim();

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

            this.skinColor = 0;
            if (config.skinColors[data.skin])
                this.skinColor = data.skin;
        }
    };

    this.getData = function () {
        return [
            this.id,
            this.sid,
            this.name,
            UTILS.fixTo(this.x, 2),
            UTILS.fixTo(this.y, 2),
            UTILS.fixTo(this.dir, 3),
            this.health,
            this.maxHealth,
            this.scale,
            this.skinColor
        ];
    };

    this.setData = function (data) {
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

    var timerCount = 0;
    this.update = function (delta) {
        if (!this.alive) return;

        if (this.shameTimer > 0) {
            this.shameTimer -= delta;
            if (this.shameTimer <= 0) {
                this.shameTimer = 0;
                this.shameCount = 0;
            }
        }

        timerCount -= delta;
        if (timerCount <= 0) {
            var regenAmount = (this.skin && this.skin.healthRegen ? this.skin.healthRegen : 0) +
                (this.tail && this.tail.healthRegen ? this.tail.healthRegen : 0);
            if (regenAmount) {
                this.changeHealth(regenAmount, this);
            }
            if (this.dmgOverTime.dmg) {
                this.changeHealth(-this.dmgOverTime.dmg, this.dmgOverTime.doer);
                this.dmgOverTime.time -= 1;
                if (this.dmgOverTime.time <= 0)
                    this.dmgOverTime.dmg = 0;
            }
            if (this.healCol) {
                this.changeHealth(this.healCol, this);
            }
            timerCount = 1000;
        }

        if (!this.alive)
            return;

        if (this.slowMult < 1) {
            this.slowMult += (config.combat ? config.combat.slowRecoveryRate : 0.0008) * delta;
            if (this.slowMult > 1)
                this.slowMult = 1;
        }

        this.noMovTimer += delta;
        if (this.xVel || this.yVel) this.noMovTimer = 0;
        if (this.lockMove) {
            this.xVel = 0;
            this.yVel = 0;
        } else {
            var buildPenalty = (this.buildIndex >= 0) ? (config.physics ? config.physics.buildingSpeedPenalty : 0.5) : 1;
            var spdMult = buildPenalty * (items.weapons[this.weaponIndex].spdMult || 1) *
                (this.skin ? (this.skin.spdMult || 1) : 1) * (this.tail ? (this.tail.spdMult || 1) : 1) * (this.y <= config.snowBiomeTop ?
                    ((this.skin && this.skin.coldM) ? 1 : config.snowSpeed) : 1) * this.slowMult;
            if (!this.zIndex && this.y >= (config.mapScale / 2) - (config.riverWidth / 2) &&
                this.y <= (config.mapScale / 2) + (config.riverWidth / 2)) {
                if (this.skin && this.skin.watrImm) {
                    spdMult *= (config.water ? config.water.immunitySpeedMultiplier : 0.75);
                    this.xVel += config.waterCurrent * (config.water ? config.water.immunityCurrentEffect : 0.4) * delta;
                } else {
                    spdMult *= (config.water ? config.water.normalSpeedMultiplier : 0.33);
                    this.xVel += config.waterCurrent * (config.water ? config.water.normalCurrentEffect : 1.0) * delta;
                }
            }
            var xVel = (this.moveDir != undefined) ? mathCOS(this.moveDir) : 0;
            var yVel = (this.moveDir != undefined) ? mathSIN(this.moveDir) : 0;
            var length = mathSQRT(xVel * xVel + yVel * yVel);
            if (length != 0) {
                xVel /= length;
                yVel /= length;
            }
            if (xVel) this.xVel += xVel * this.speed * spdMult * delta;
            if (yVel) this.yVel += yVel * this.speed * spdMult * delta;
        }

        this.zIndex = 0;
        this.lockMove = false;
        this.healCol = 0;
        var tmpList;
        var tmpSpeed = UTILS.getDistance(0, 0, this.xVel * delta, this.yVel * delta);
        var depth = Math.min(4, Math.max(1, Math.round(tmpSpeed / 40)));
        var tMlt = 1 / depth;
        for (var i = 0; i < depth; ++i) {
            if (this.xVel)
                this.x += (this.xVel * delta) * tMlt;
            if (this.yVel)
                this.y += (this.yVel * delta) * tMlt;
            tmpList = objectManager.getGridArrays(this.x, this.y, this.scale);
            for (var x = 0; x < tmpList.length; ++x) {
                for (var y = 0; y < tmpList[x].length; ++y) {
                    if (tmpList[x][y].active)
                        objectManager.checkCollision(this, tmpList[x][y], tMlt);
                }
            }
        }

        var tmpIndx = players.indexOf(this);
        for (var i = tmpIndx + 1; i < players.length; ++i) {
            if (players[i] != this && players[i].alive)
                objectManager.checkCollision(this, players[i]);
        }

        var velThreshold = config.physics ? config.physics.velocityStopThreshold : 0.01;
        if (this.xVel) {
            this.xVel *= mathPOW(config.playerDecel, delta);
            if (this.xVel <= velThreshold && this.xVel >= -velThreshold) this.xVel = 0;
        }
        if (this.yVel) {
            this.yVel *= mathPOW(config.playerDecel, delta);
            if (this.yVel <= velThreshold && this.yVel >= -velThreshold) this.yVel = 0;
        }

        if (this.x - this.scale < 0) {
            this.x = this.scale;
        } else if (this.x + this.scale > config.mapScale) {
            this.x = config.mapScale - this.scale;
        }
        if (this.y - this.scale < 0) {
            this.y = this.scale;
        } else if (this.y + this.scale > config.mapScale) {
            this.y = config.mapScale - this.scale;
        }

        if (this.buildIndex < 0) {
            if (this.reloads[this.weaponIndex] > 0) {
                this.reloads[this.weaponIndex] -= delta;
                this.gathering = this.mouseState;
            } else if (this.gathering || this.autoGather) {
                var worked = true;
                if (items.weapons[this.weaponIndex].gather != undefined) {
                    this.gather(players);
                } else if (items.weapons[this.weaponIndex].projectile != undefined &&
                    this.hasRes(items.weapons[this.weaponIndex], (this.skin ? this.skin.projCost : 0))) {
                    this.useRes(items.weapons[this.weaponIndex], (this.skin ? this.skin.projCost : 0));
                    this.noMovTimer = 0;
                    var tmpIndx = items.weapons[this.weaponIndex].projectile;
                    var projOffset = this.scale * 2;
                    var aMlt = (this.skin && this.skin.aMlt) ? this.skin.aMlt : 1;
                    if (items.weapons[this.weaponIndex].rec) {
                        this.xVel -= items.weapons[this.weaponIndex].rec * mathCOS(this.dir);
                        this.yVel -= items.weapons[this.weaponIndex].rec * mathSIN(this.dir);
                    }
                    projectileManager.addProjectile(this.x + (projOffset * mathCOS(this.dir)),
                        this.y + (projOffset * mathSIN(this.dir)), this.dir, items.projectiles[tmpIndx].range * aMlt,
                        items.projectiles[tmpIndx].speed * aMlt, tmpIndx, this, null, this.zIndex);
                } else {
                    worked = false;
                }
                this.gathering = this.mouseState;
                if (worked) {
                    this.reloads[this.weaponIndex] = items.weapons[this.weaponIndex].speed * (this.skin ? (this.skin.atkSpd || 1) : 1);
                }
            }
        }

    };

    this.addWeaponXP = function (amnt) {
        if (!this.weaponXP[this.weaponIndex])
            this.weaponXP[this.weaponIndex] = 0;
        this.weaponXP[this.weaponIndex] += amnt;
    };

    this.earnXP = function (amount) {
        if (this.age < config.maxAge) {
            this.XP += amount;
            if (this.XP >= this.maxXP) {
                if (this.age < config.maxAge) {
                    this.age++;
                    this.XP = 0;
                    this.maxXP *= (config.experience ? config.experience.levelMultiplier : 1.2);
                } else {
                    this.XP = this.maxXP;
                }
                this.upgradePoints++;
                server.send(this.id, "U", this.upgradePoints, this.upgrAge);
                server.send(this.id, "T", this.XP, UTILS.fixTo(this.maxXP, 1), this.age);
            } else {
                server.send(this.id, "T", this.XP);
            }
        }
    };

    this.changeHealth = function (amount, doer) {
        if (amount > 0 && this.health >= this.maxHealth)
            return false
        if (amount < 0 && this.skin)
            amount *= this.skin.dmgMult || 1;
        if (amount < 0 && this.tail)
            amount *= this.tail.dmgMult || 1;
        if (amount < 0)
            this.hitTime = Date.now();
        this.health += amount;
        if (this.health > this.maxHealth) {
            amount -= (this.health - this.maxHealth);
            this.health = this.maxHealth;
        }
        if (this.health <= 0)
            this.kill(doer);
        for (var i = 0; i < players.length; ++i) {
            if (this.sentTo[players[i].id])
                server.send(players[i].id, "O", this.sid, Math.round(this.health));
        }
        if (doer && doer.canSee(this) && !(doer == this && amount < 0)) {
            server.send(doer.id, "8", Math.round(this.x),
                Math.round(this.y), Math.round(-amount), 1);
        }
        return true;
    };

    this.kill = function (doer) {
        if (doer && doer.alive) {
            doer.kills++;
            var goldStealPct = config.combat ? config.combat.goldStealPercent : 0.5;
            var killScoreMult = config.combat ? config.combat.killScoreMultiplier : 100;
            if (doer.skin && doer.skin.goldSteal) scoreCallback(doer, Math.round(this.points * goldStealPct));
            else scoreCallback(doer, Math.round(this.age * killScoreMult * ((doer.skin && doer.skin.kScrM) ? doer.skin.kScrM : 1)));
            server.send(doer.id, "N", "kills", doer.kills, 1);
        }
        this.alive = false;
        server.send(this.id, "P");
        iconCallback();
    };

    this.addResource = function (type, amount, auto) {
        if (!auto && amount > 0)
            this.addWeaponXP(amount);
        if (type == 3) {
            scoreCallback(this, amount, true);
        } else {
            this[config.resourceTypes[type]] += amount;
            server.send(this.id, "N", config.resourceTypes[type], this[config.resourceTypes[type]], 1);
        }
    };

    this.changeItemCount = function (index, value) {
        this.itemCounts[index] = this.itemCounts[index] || 0;
        this.itemCounts[index] += value;
        if (this.itemCounts[index] < 0)
            this.itemCounts[index] = 0;
        if (config.isSandbox && index === 3)
            this.sandboxMillCount = this.itemCounts[index];
        server.send(this.id, "S", index, this.itemCounts[index]);
    };

    this.buildItem = function (item) {
        var tmpS = (this.scale + item.scale + (item.placeOffset || 0));
        var tmpX = this.x + (tmpS * mathCOS(this.dir));
        var tmpY = this.y + (tmpS * mathSIN(this.dir));
        if (this.canBuild(item) && !(item.consume && (this.skin && this.skin.noEat)) &&
            (item.consume || objectManager.checkItemLocation(tmpX, tmpY, item.scale,
                0.6, item.id, false, this))) {
            var worked = false;
            if (item.consume) {
                if (this.hitTime) {
                    var timeSinceHit = Date.now() - this.hitTime;
                    this.hitTime = 0;
                    var shameWindow = config.shameSystem ? config.shameSystem.detectionWindow : 120;
                    var shameThreshold = config.shameSystem ? config.shameSystem.threshold : 8;
                    var shamePenalty = config.shameSystem ? config.shameSystem.penaltyDuration : 30000;
                    var shameReduction = config.shameSystem ? config.shameSystem.countReduction : 2;
                    if (timeSinceHit <= shameWindow) {
                        this.shameCount++;
                        if (this.shameCount >= shameThreshold) {
                            this.shameTimer = shamePenalty;
                            this.shameCount = 0;
                        }
                    } else {
                        this.shameCount -= shameReduction;
                        if (this.shameCount <= 0) {
                            this.shameCount = 0;
                        }
                    }
                }
                if (this.shameTimer <= 0)
                    worked = item.consume(this);
            } else {
                worked = true;
                if (item.group && item.group.limit) {
                    this.changeItemCount(item.group.id, 1);
                }
                var placedItem = item;
                if (item.pps) {
                    var sandboxMultiplier = config.isSandbox ? (config.millPpsMultiplier || 1) : 1;
                    var ppsToAdd = item.pps * sandboxMultiplier;
                    this.pps += ppsToAdd;
                    placedItem = Object.assign({}, item, {
                        pps: ppsToAdd
                    });
                }
                objectManager.add(objectManager.objects.length, tmpX, tmpY, this.dir, item.scale,
                    item.type, placedItem, false, this);
            }
            if (worked) {
                this.useRes(item);
                this.buildIndex = -1;
            }
        }
    };

    this.hasRes = function (item, mult) {
        for (var i = 0; i < item.req.length;) {
            if (this[item.req[i]] < Math.round(item.req[i + 1] * (mult || 1)))
                return false;
            i += 2;
        }
        return true;
    };

    this.useRes = function (item, mult) {
        if (config.isSandbox)
            return;
        for (var i = 0; i < item.req.length;) {
            this.addResource(config.resourceTypes.indexOf(item.req[i]), -Math.round(item.req[i + 1] * (mult || 1)));
            i += 2;
        }
    };

    this.canBuild = function (item) {
        if (config.isSandbox) {
            if (item.group) {
                var count = this.itemCounts[item.group.id] || 0;
                var sandboxLimits = config.sandboxBuildLimits || {};
                var millLimit = typeof sandboxLimits.mill === "number" ? sandboxLimits.mill : 1;
                var spikeLimit = typeof sandboxLimits.spikes === "number" ? sandboxLimits.spikes : 200;
                var trapLimit = typeof sandboxLimits.traps === "number" ? sandboxLimits.traps : 100;
                var generalLimit = typeof sandboxLimits.general === "number" ? sandboxLimits.general : 300;
                if (item.group.id === 3 && count >= millLimit) {
                    return false;
                }
                if (item.group.id === 2 && count >= spikeLimit) {
                    return false;
                }
                if (item.group.id === 5 && count >= trapLimit) {
                    return false;
                }
                if (item.group.limit && count >= generalLimit) {
                    return false;
                }
            }
            return true;
        }
        if (item.group && item.group.limit && this.itemCounts[item.group.id] >= item.group.limit)
            return false;
        return this.hasRes(item);
    };

    this.gather = function () {

        this.noMovTimer = 0;

        var defaultHitSlow = config.combat ? config.combat.defaultHitSlow : 0.3;
        this.slowMult -= (items.weapons[this.weaponIndex].hitSlow || defaultHitSlow);
        if (this.slowMult < 0)
            this.slowMult = 0;

        var tmpVariant = config.fetchVariant(this);
        var applyPoison = tmpVariant.poison;
        var variantDmg = tmpVariant.val;

        var hitObjs = {};
        var tmpDist, tmpDir, tmpObj, hitSomething;
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
                                if (tmpObj.changeHealth(-items.weapons[this.weaponIndex].dmg * (variantDmg) *
                                        (items.weapons[this.weaponIndex].sDmg || 1) * (this.skin && this.skin.bDmg ? this.skin.bDmg : 1), this)) {
                                    for (var x = 0; x < tmpObj.req.length;) {
                                        this.addResource(config.resourceTypes.indexOf(tmpObj.req[x]), tmpObj.req[x + 1]);
                                        x += 2;
                                    }
                                    objectManager.disableObj(tmpObj);
                                }
                            } else {
                                var gatherXPMult = config.experience ? config.experience.gatheringMultiplier : 4;
                                var goldBonus = config.experience ? config.experience.goldBonusResources : 4;
                                this.earnXP(gatherXPMult * items.weapons[this.weaponIndex].gather);
                                var count = items.weapons[this.weaponIndex].gather + (tmpObj.type == 3 ? goldBonus : 0);
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

        for (var i = 0; i < players.length + ais.length; ++i) {
            tmpObj = players[i] || ais[i - players.length];
            if (tmpObj != this && tmpObj.alive && !(tmpObj.team && tmpObj.team == this.team)) {
                tmpDist = UTILS.getDistance(this.x, this.y, tmpObj.x, tmpObj.y) - (tmpObj.scale * 1.8);
                if (tmpDist <= items.weapons[this.weaponIndex].range) {
                    tmpDir = UTILS.getDirection(tmpObj.x, tmpObj.y, this.x, this.y);
                    if (UTILS.getAngleDist(tmpDir, this.dir) <= config.gatherAngle) {

                        var stealCount = items.weapons[this.weaponIndex].steal;
                        if (stealCount && tmpObj.addResource) {
                            stealCount = Math.min((tmpObj.points || 0), stealCount);
                            this.addResource(3, stealCount);
                            tmpObj.addResource(3, -stealCount);
                        }

                        var dmgMlt = variantDmg;
                        if (tmpObj.weaponIndex != undefined && items.weapons[tmpObj.weaponIndex].shield &&
                            UTILS.getAngleDist(tmpDir + Math.PI, tmpObj.dir) <= config.shieldAngle) {
                            dmgMlt = items.weapons[tmpObj.weaponIndex].shield;
                        }
                        var dmgVal = items.weapons[this.weaponIndex].dmg *
                            (this.skin && this.skin.dmgMultO ? this.skin.dmgMultO : 1) *
                            (this.tail && this.tail.dmgMultO ? this.tail.dmgMultO : 1);
                        var baseKB = config.combat ? config.combat.baseKnockback : 0.3;
                        var tmpSpd = (baseKB * (tmpObj.weightM || 1)) + (items.weapons[this.weaponIndex].knock || 0);
                        tmpObj.xVel += tmpSpd * mathCOS(tmpDir);
                        tmpObj.yVel += tmpSpd * mathSIN(tmpDir);
                        if (this.skin && this.skin.healD)
                            this.changeHealth(dmgVal * dmgMlt * this.skin.healD, this);
                        if (this.tail && this.tail.healD)
                            this.changeHealth(dmgVal * dmgMlt * this.tail.healD, this);
                        if (tmpObj.skin && tmpObj.skin.dmg && dmgMlt == 1)
                            this.changeHealth(-dmgVal * tmpObj.skin.dmg, tmpObj);
                        if (tmpObj.tail && tmpObj.tail.dmg && dmgMlt == 1)
                            this.changeHealth(-dmgVal * tmpObj.tail.dmg, tmpObj);
                        if (tmpObj.dmgOverTime && this.skin && this.skin.poisonDmg &&
                            !(tmpObj.skin && tmpObj.skin.poisonRes)) {
                            tmpObj.dmgOverTime.dmg = this.skin.poisonDmg;
                            tmpObj.dmgOverTime.time = this.skin.poisonTime || 1;
                            tmpObj.dmgOverTime.doer = this;
                        }
                        if (tmpObj.dmgOverTime && applyPoison &&
                            !(tmpObj.skin && tmpObj.skin.poisonRes)) {
                            var poisonDmg = config.combat ? config.combat.poisonDamage : 5;
                            var poisonTime = config.combat ? config.combat.poisonDuration : 5;
                            tmpObj.dmgOverTime.dmg = poisonDmg;
                            tmpObj.dmgOverTime.time = poisonTime;
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

        this.sendAnimation(hitSomething ? 1 : 0);
    };

    this.sendAnimation = function (hit) {
        for (var i = 0; i < players.length; ++i) {
            if (this.sentTo[players[i].id] && this.canSee(players[i])) {
                server.send(players[i].id, "K", this.sid, hit ? 1 : 0, this.weaponIndex);
            }
        }
    };

    var tmpRatio = 0;
    var animIndex = 0;
    this.animate = function (delta) {
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

    this.startAnim = function (didHit, index) {
        this.animTime = this.animSpeed = items.weapons[index].speed;
        this.targetAngle = (didHit ? -config.hitAngle : -Math.PI);
        tmpRatio = 0;
        animIndex = 0;
    };

    this.canSee = function (other) {
        if (!other) return false;
        if (other.skin && other.skin.invisTimer && other.noMovTimer >=
            other.skin.invisTimer) return false;
        var dx = mathABS(other.x - this.x) - other.scale;
        var dy = mathABS(other.y - this.y) - other.scale;
        return dx <= (config.maxScreenWidth / 2) * 1.3 && dy <= (config.maxScreenHeight / 2) * 1.3;
    };

};
