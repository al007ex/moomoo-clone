
	// RENDER:
	module.exports.maxScreenWidth = 1920;
	module.exports.maxScreenHeight = 1080;

	// SERVER:
	module.exports.serverUpdateRate = 9;
	module.exports.maxPlayers =  (process && process.argv.indexOf("--largeserver") != -1) ? 80 : 40;
	module.exports.maxPlayersHard =  module.exports.maxPlayers + 10;
	module.exports.collisionDepth = 6;
	module.exports.minimapRate = 3000;

	// COLLISIONS:
	module.exports.colGrid = 10;

	// CLIENT:
	module.exports.clientSendRate = 5;

	// UI:
	module.exports.healthBarWidth = 50;
	module.exports.healthBarPad = 4.5;
	module.exports.iconPadding = 15;
	module.exports.iconPad = 0.9;
	module.exports.deathFadeout = 3000;
	module.exports.crownIconScale = 60;
	module.exports.crownPad = 35;

	// CHAT:
	module.exports.chatCountdown = 3000;
	module.exports.chatCooldown = 500;

	// SANDBOX:
	module.exports.inSandbox = process && process.env.VULTR_SCHEME === "mm_exp";;

	// PLAYER:
	module.exports.maxAge = 100;
	module.exports.gatherAngle = Math.PI/2.6;
	module.exports.gatherWiggle = 10;
	module.exports.hitReturnRatio = 0.25;
	module.exports.hitAngle = Math.PI / 2;
	module.exports.playerScale = 35;
	module.exports.playerSpeed = 0.0016;
	module.exports.playerDecel = 0.993;
	module.exports.nameY = 34;

	// CUSTOMIZATION:
	module.exports.skinColors = ["#bf8f54", "#cbb091", "#896c4b",
		"#fadadc", "#ececec", "#c37373", "#4c4c4c", "#ecaff7", "#738cc3",
	 	"#8bc373"];

	// ANIMALS:
	module.exports.animalCount = 7;
	module.exports.aiTurnRandom = 0.06;
	module.exports.cowNames = ["Sid", "Steph", "Bmoe", "Romn", "Jononthecool", "Fiona", "Vince", "Nathan", "Nick", "Flappy", "Ronald", "Otis", "Pepe", "Mc Donald", "Theo", "Fabz", "Oliver", "Jeff", "Jimmy", "Helena", "Reaper",
		"Ben", "Alan", "Naomi", "XYZ", "Clever", "Jeremy", "Mike", "Destined", "Stallion", "Allison", "Meaty", "Sophia", "Vaja", "Joey", "Pendy", "Murdoch", "Theo", "Jared", "July", "Sonia", "Mel", "Dexter", "Quinn", "Milky"];

	// WEAPONS:
	module.exports.shieldAngle = Math.PI/3;
	module.exports.weaponVariants = [{
		id: 0,
		src: "",
		xp: 0,
		val: 1
	}, {
		id: 1,
		src: "_g",
		xp: 3000,
		val: 1.1
	}, {
		id: 2,
		src: "_d",
		xp: 7000,
		val: 1.18
	}, {
		id: 3,
		src: "_r",
		poison: true,
		xp: 12000,
		val: 1.18
	}];
	module.exports.fetchVariant = function(player) {
		var tmpXP = player.weaponXP[player.weaponIndex]||0;
		for (var i = module.exports.weaponVariants.length - 1; i >= 0; --i) {
			if (tmpXP >= module.exports.weaponVariants[i].xp)
				return module.exports.weaponVariants[i];
		}
	};

	// NATURE:
	module.exports.resourceTypes = ["wood", "food", "stone", "points"];
	module.exports.areaCount = 7;
	module.exports.treesPerArea = 9;
	module.exports.bushesPerArea = 3;
	module.exports.totalRocks = 32;
	module.exports.goldOres = 7;
	module.exports.riverWidth = 724;
	module.exports.riverPadding = 114;
	module.exports.waterCurrent = 0.0011;
	module.exports.waveSpeed = 0.0001;
	module.exports.waveMax = 1.3;
	module.exports.treeScales = [150, 160, 165, 175];
	module.exports.bushScales = [80, 85, 95];
	module.exports.rockScales = [80, 85, 90];

	// BIOME DATA:
	module.exports.snowBiomeTop = 2400;
	module.exports.snowSpeed = 0.75;

	// DATA:
	module.exports.maxNameLength = 15;

	// MAP:
	module.exports.mapScale = 14400;
	module.exports.mapPingScale = 40;
	module.exports.mapPingTime = 2200;