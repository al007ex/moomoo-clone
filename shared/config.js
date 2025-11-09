"use strict";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MOOMOO.IO GAME CONFIGURATION FILE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This file contains all configurable game settings for the MooMoo.io server
 * and client. It is shared between both to ensure consistency.
 *
 * FILE STRUCTURE:
 * 1. Config Mechanics - Helper functions and utilities (don't modify these)
 * 2. Weapon Variants - Weapon upgrade tiers and their properties
 * 3. Spawn Defaults - Starting items, weapons, and resources for players
 * 4. Build Limits - Sandbox mode building restrictions
 * 5. World Resources - Natural resource spawn configuration
 * 6. Animal Spawns - Detailed animal spawn plan (IMPORTANT SECTION!)
 * 7. Grouped Config - Main configuration object with all game settings
 *
 * HOW TO USE THIS FILE:
 * - Scroll to the section you want to modify
 * - Read the comments to understand what each value does
 * - Change values carefully and test your changes
 * - Most values are in the "groupedConfig" object at the bottom
 *
 * ⚠️  IMPORTANT NOTES:
 * - Server must be restarted for changes to take effect
 * - Some values affect game balance significantly
 * - Keep backups before making major changes
 * - Invalid values may cause the server to crash
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * ---------------------------------------------------------------------------
 *  CONFIG MECHANICS (helpers, derived values, flattening)
 * ---------------------------------------------------------------------------
 * Internal utility functions - DO NOT MODIFY unless you know what you're doing
 */

// Check if we're running in a Node.js environment (server-side)
var hasProcess = typeof process === "object" && process !== null;
var hasArgv = hasProcess && Array.isArray(process.argv);

/**
 * Determines maximum player count based on server launch arguments
 * Returns 80 if --largeserver flag is present, otherwise 10
 */
function resolveMaxPlayers() {
    if (hasArgv && process.argv.indexOf("--largeserver") !== -1) {
        return 80;  // Large server mode
    }
    return 10;      // Default mode
}

/**
 * Flattens grouped config object for easy access
 * Converts nested config groups into a single flat object while keeping groups reference
 * Also validates that there are no duplicate keys across groups
 */
function defineConfig(groups) {
    var flat = { groups: groups };
    Object.keys(groups).forEach(function (groupName) {
        var group = groups[groupName];
        Object.keys(group).forEach(function (settingKey) {
            if (flat.hasOwnProperty(settingKey)) {
                throw new Error("Duplicate config key detected: " + settingKey);
            }
            flat[settingKey] = group[settingKey];
        });
    });
    return flat;
}

// Determine player limit based on server launch mode
var baseMaxPlayers = resolveMaxPlayers();

/**
 * Weapon variant metadata shared by client & server.
 * Each variant represents an upgrade tier for weapons.
 *
 * Properties:
 *  - id: Variant tier (0 = default, 1-4 = upgraded versions)
 *  - src: Image suffix for the weapon texture (e.g., "_g" = gold variant)
 *  - xp: Experience points required to unlock this variant
 *  - val: Damage multiplier (e.g., 1.1 = 10% more damage than base)
 *  - poison: (optional) If true, this variant applies poison damage
 *
 * Variant progression:
 *  0: Default (no suffix) - base damage, 0 XP
 *  1: Gold (_g) - 10% more damage, requires 3000 XP
 *  2: Diamond (_d) - 18% more damage, requires 7000 XP
 *  3: Ruby (_r) - 18% more damage + poison, requires 12000 XP
 *  4: Emerald (_e) - 18% more damage + poison, requires 24000 XP
 */
var weaponVariants = [{
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
}, {
    id: 4,
    src: "_e",
    poison: true,
    xp: 24000,
    val: 1.18
}];

/**
 * ---------------------------------------------------------------------------
 *  CONFIG VALUES (edit below to tune gameplay)
 * ---------------------------------------------------------------------------
 */

/**
 * Player spawn defaults - what players start with when they join the game
 *
 * defaultStartItems: Array of item IDs that players spawn with
 *   (These correspond to items in the items list - e.g., tools, weapons, accessories)
 *   Current: [0, 3, 6, 10] - modify this array to change starting items
 *
 * defaultStartWeapons: Array of weapon IDs that players start with
 *   Current: [0] - players start with weapon ID 0 (usually the basic tool)
 *
 * startResources: Resources players start with
 *   - normal: Starting score/points (currently 0)
 *   - moofoll: Starting moofoll currency (currently 100)
 */
var defaultStartItems = [0, 3, 6, 10];
var defaultStartWeapons = [0];
var startResources = {
    normal: 100,
    moofoll: 100
};

/**
 * Sandbox mode building limits
 * These limits control how many of each structure type a player can build in sandbox mode
 *
 * Limits:
 *  - mill: Maximum number of windmills (currently 1)
 *  - spikes: Maximum number of spike structures (currently 200)
 *  - traps: Maximum number of trap structures (currently 100)
 *  - general: Maximum number of all other buildings combined (currently 300)
 */
var sandboxBuildLimits = {
    mill: 1,
    spikes: 200,
    traps: 100,
    general: 300
};

/**
 * World resource spawn counts
 * Controls how many natural resources spawn across the map
 *
 * Resource counts:
 *  - treesPerArea: Number of trees spawned per world area (currently 30)
 *  - bushesPerArea: Number of bushes spawned per world area (currently 12)
 *  - totalRocks: Total number of stone rocks across entire map (currently 120)
 *  - goldOres: Total number of gold ore nodes across entire map (currently 7)
 *
 * Note: The world is divided into multiple areas (see areaCount in world config).
 * Trees and bushes spawn per area, while rocks and gold are total counts for the entire map.
 */
var worldSpawnCounts = {
    treesPerArea: 30,
    bushesPerArea: 12,
    totalRocks: 120,
    goldOres: 7
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * ANIMAL SPAWN CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════
 * Controls what animals spawn, how many, and where they appear on the map.
 *
 * Each entry in the array represents one type of animal with these properties:
 *
 *  • index (required): The animal type ID (refers to AI type in aiManager)
 *      Common animal indices:
 *        0 = Cow (passive, drops food)
 *        1 = Pig (passive, drops food)
 *        2 = Bull (aggressive, strong)
 *        3 = Bully (aggressive)
 *        4 = Wolf (aggressive, fast)
 *        5 = Bear (aggressive, very strong)
 *        6-8 = Boss animals (special spawns)
 *
 *  • desired (required): How many of this animal should be active on the map
 *      The game will continuously spawn animals of this type until the desired
 *      count is reached. When an animal dies, a new one will spawn to maintain
 *      this number.
 *      Examples:
 *        desired: 12  → Always try to maintain 12 of this animal type
 *        desired: 1   → Only spawn one (usually for boss animals)
 *
 *  • positions (optional): Specific spawn locations for this animal type
 *      If not specified, animals will spawn randomly across the map.
 *      If specified, animals will spawn at these exact locations.
 *
 *      Format options:
 *        A) Relative positioning (recommended):
 *           { xRatio: 0.5, yRatio: 0.5 }
 *           - xRatio: horizontal position (0.0 = left edge, 1.0 = right edge, 0.5 = center)
 *           - yRatio: vertical position (0.0 = top edge, 1.0 = bottom edge, 0.5 = center)
 *           Example: { xRatio: 0.42, yRatio: 0.72 } → spawns at 42% from left, 72% from top
 *
 *        B) Absolute positioning (alternative):
 *           { x: 5000, y: 7200 }
 *           - x: exact X coordinate on the map
 *           - y: exact Y coordinate on the map
 *
 *      You can specify multiple positions in an array to create multiple spawn points.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * HOW TO CONFIGURE:
 * ═══════════════════════════════════════════════════════════════════════
 * 1. To add more animals: Increase the "desired" number
 * 2. To add a new animal type: Add a new object with index and desired
 * 3. To create a boss spawn: Set desired: 1 and specify positions
 * 4. To make animals spawn anywhere: Don't include the positions property
 * 5. To remove an animal type: Delete its entire entry or set desired: 0
 *
 * Example - Adding a new animal type:
 *   {
 *     index: 4,           // Wolf
 *     desired: 15         // Spawn 15 wolves, anywhere on map
 *   }
 *
 * Example - Creating a boss spawn at a specific location:
 *   {
 *     index: 6,           // Boss animal
 *     desired: 1,         // Only one boss
 *     positions: [{
 *       xRatio: 0.5,      // Center of map horizontally
 *       yRatio: 0.5       // Center of map vertically
 *     }]
 *   }
 * ═══════════════════════════════════════════════════════════════════════
 */
var animalSpawnPlan = [{
    index: 0,       // Cow - passive animal
    desired: 13     // Maintain 12 cows on the map
}, {
    index: 1,       // Pig - passive animal
    desired: 10     // Maintain 10 pigs on the map
}, {
    index: 4,       // Wolf - aggressive animal
    desired: 20      // Maintain 8 wolves on the map
}, {
    index: 5,       // Bear - aggressive animal
    desired: 6      // Maintain 6 bears on the map
}, {
    index: 2,       // Bull - aggressive animal
    desired: 8      // Maintain 8 bulls on the map
}, {
    index: 3,       // Bully - aggressive animal
    desired: 6      // Maintain 6 bullies on the map
}, {
    index: 6,       // Boss animal #1
    desired: 1,     // Only spawn one
    positions: [{   // Spawn at specific location
        xRatio: 0.42,   // 42% from left side of map
        yRatio: 0.72    // 72% from top of map
    }]
}, {
    index: 7,       // Boss animal #2
    desired: 1,     // Only spawn one
    positions: [{   // Spawn at specific location
        xRatio: 0.18,   // 18% from left side of map
        yRatio: 0.22    // 22% from top of map
    }]
}, {
    index: 8,       // Boss animal #3
    desired: 1,     // Only spawn one
    positions: [{   // Spawn at specific location
        xRatio: 0.78,   // 78% from left side of map
        yRatio: 0.64    // 64% from top of map
    }]
}];

/**
 * ═══════════════════════════════════════════════════════════════════════
 * GROUPED CONFIG VALUES
 * ═══════════════════════════════════════════════════════════════════════
 * Main configuration object with all game settings organized by category.
 * Edit these values to customize gameplay, visuals, performance, and more.
 * ═══════════════════════════════════════════════════════════════════════
 */
var groupedConfig = {

    /**
     * RENDERING SETTINGS
     * Controls visual display limits for the game client
     */
    render: {
        maxScreenWidth: 1920,      // Maximum screen width to render (in pixels)
        maxScreenHeight: 1080      // Maximum screen height to render (in pixels)
    },

    /**
     * SERVER SETTINGS
     * Core server performance and capacity settings
     */
    server: {
        serverUpdateRate: 9,                    // How often server sends updates (updates per tick)
        maxPlayers: baseMaxPlayers,             // Soft player limit (10 default, 80 with --largeserver flag)
        maxPlayersHard: baseMaxPlayers + 10,    // Hard player limit (cannot exceed this)
        collisionDepth: 6,                      // Collision detection precision (higher = more accurate but slower)
        minimapRate: 3000                       // How often minimap updates (in milliseconds)
    },

    /**
     * COLLISION SYSTEM
     * Physics and collision detection settings
     */
    collisions: {
        colGrid: 10    // Grid cell size for spatial partitioning in collision detection
    },

    /**
     * NETWORKING
     * Client-server communication settings
     */
    networking: {
        clientSendRate: 5    // How often client sends input to server (updates per tick)
    },

    /**
     * USER INTERFACE
     * Visual elements and UI component settings
     */
    ui: {
        healthBarWidth: 50,     // Width of player health bar (in pixels)
        healthBarPad: 4.5,      // Padding around health bar (in pixels)
        iconPadding: 15,        // Padding between UI icons (in pixels)
        iconPad: 0.9,           // Icon padding multiplier
        deathFadeout: 3000,     // How long death screen fades out (in milliseconds)
        crownIconScale: 60,     // Size of crown icon for leader (in pixels)
        crownPad: 35            // Padding for crown icon above player (in pixels)
    },

    /**
     * CHAT SYSTEM
     * Chat message timing and cooldown settings
     */
    chat: {
        chatCountdown: 3000,    // How long chat messages stay visible (in milliseconds)
        chatCooldown: 500       // Minimum time between sending messages (in milliseconds)
    },

    /**
     * SANDBOX MODE
     * Settings for creative/sandbox gameplay mode
     */
    sandbox: {
        isSandbox: true,                       // Enable/disable sandbox mode (true/false)
        millPpsMultiplier: 5,                   // Points-per-second multiplier for windmills in sandbox
        sandboxBuildLimits: sandboxBuildLimits  // Building limits for sandbox (see sandboxBuildLimits above)
    },

    /**
     * PLAYER MECHANICS
     * Core player physics, combat, and starting equipment
     */
    player: {
        maxAge: 100,                        // Maximum player age/level
        gatherAngle: Math.PI / 2.6,         // Angle range for gathering resources (in radians)
        gatherWiggle: 10,                   // Random variation in gather hits
        hitReturnRatio: 0.25,               // Knockback ratio when hitting objects
        hitAngle: Math.PI / 2,              // Angle range for melee attacks (in radians)
        baseHealth: 100,                    // Starting health points
        playerScale: 35,                    // Visual size of player (in pixels)
        playerSpeed: 0.0016,                // Movement speed multiplier
        playerDecel: 0.993,                 // Deceleration rate (0-1, lower = faster stopping)
        nameY: 34,                          // Height of name tag above player (in pixels)
        startItems: defaultStartItems,      // Items players spawn with (see defaultStartItems above)
        startWeapons: defaultStartWeapons,  // Weapons players spawn with (see defaultStartWeapons above)
        startResources: startResources      // Resources players spawn with (see startResources above)
    },

    /**
     * CUSTOMIZATION OPTIONS
     * Player appearance customization settings
     */
    customization: {
        // Available skin colors for players (hex color codes)
        // Colors: tan, light tan, brown, pink, white, red, dark gray, purple, blue, green
        skinColors: ["#bf8f54", "#cbb091", "#896c4b", "#fadadc", "#ececec", "#c37373", "#4c4c4c", "#ecaff7", "#738cc3", "#8bc373"]
    },

    /**
     * ANIMAL SYSTEM
     * AI behavior and animal spawning settings
     */
    animals: {
        animalCount: 40,                    // Total maximum animals across all types (deprecated - use animalSpawnPlan)
        aiTurnRandom: 0.06,                 // Random turning chance for AI movement (0-1, higher = more erratic)
        // Random names assigned to cows/passive animals when they spawn
        cowNames: ["Sid", "Steph", "Bmoe", "Romn", "Jononthecool", "Fiona", "Vince", "Nathan", "Nick", "Flappy", "Ronald", "Otis", "Pepe", "Mc Donald", "Theo", "Fabz", "Oliver", "Jeff", "Jimmy", "Helena", "Reaper", "Ben", "Alan", "Naomi", "XYZ", "Clever", "Jeremy", "Mike", "Destined", "Stallion", "Allison", "Meaty", "Sophia", "Vaja", "Joey", "Pendy", "Murdoch", "Theo", "Jared", "July", "Sonia", "Mel", "Dexter", "Quinn", "Milky"],
        animalSpawnPlan: animalSpawnPlan    // Animal spawn configuration (see animalSpawnPlan above)
    },

    /**
     * WEAPON SYSTEM
     * Weapon mechanics and upgrade system
     */
    weapons: {
        shieldAngle: Math.PI / 3,           // Angle range that shields protect (in radians)
        weaponVariants: weaponVariants,     // Weapon upgrade tiers (see weaponVariants above)
        // Function to determine which weapon variant a player has unlocked based on XP
        fetchVariant: function (player) {
            var tmpXP = player.weaponXP[player.weaponIndex] || 0;
            for (var i = weaponVariants.length - 1; i >= 0; --i) {
                if (tmpXP >= weaponVariants[i].xp) {
                    return weaponVariants[i];
                }
            }
            return weaponVariants[0];
        }
    },

    /**
     * WORLD SETTINGS
     * Map generation and environment settings
     */
    world: Object.assign({
        resourceTypes: ["wood", "food", "stone", "points"],  // Types of resources in game
        areaCount: 7,                   // Number of world areas/biomes
        riverWidth: 724,                // Width of rivers (in pixels)
        riverPadding: 114,              // Padding around rivers (in pixels)
        waterCurrent: 0.0011,           // Speed of water current in rivers
        waveSpeed: 0.0001,              // Speed of water wave animation
        waveMax: 1.3,                   // Maximum wave height multiplier
        treeScales: [150, 160, 165, 175],  // Possible tree sizes (in pixels) - randomly selected
        bushScales: [80, 85, 95],          // Possible bush sizes (in pixels) - randomly selected
        rockScales: [80, 85, 90]           // Possible rock sizes (in pixels) - randomly selected
    }, worldSpawnCounts, {
        spawnCounts: worldSpawnCounts   // Resource spawn amounts (see worldSpawnCounts above)
    }),

    /**
     * BIOME SETTINGS
     * Special biome effects and boundaries
     */
    biome: {
        snowBiomeTop: 2400,     // Y-coordinate where snow biome begins (in pixels)
        snowSpeed: 0.75         // Speed multiplier in snow biome (slower movement)
    },

    /**
     * META SETTINGS
     * General game rules and restrictions
     */
    meta: {
        maxNameLength: 15    // Maximum characters allowed in player names
    },

    /**
     * MAP/MINIMAP SETTINGS
     * Map size and minimap display settings
     */
    map: {
        mapScale: 14400,        // Total map size (width and height in pixels)
        mapPingScale: 40,       // Size of ping markers on minimap (in pixels)
        mapPingTime: 2200       // How long pings stay visible on minimap (in milliseconds)
    },

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * EXPERIENCE & LEVELING SYSTEM
     * ═══════════════════════════════════════════════════════════════════════
     * Controls how players gain XP and level up
     */
    experience: {
        initialXP: 300,             // XP required to reach level 2 from level 1
        levelMultiplier: 1.2,       // XP scaling per level (each level requires 20% more XP)
        gatheringMultiplier: 4,     // XP gained per resource gathered (multiplied by weapon gather value)
        goldBonusResources: 4,      // Extra resources gained when gathering from gold nodes
        goldGenerationXP: 1000      // XP multiplier for points generated by windmills (points × this value)
    },

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * COMBAT SYSTEM
     * ═══════════════════════════════════════════════════════════════════════
     * Controls damage, knockback, and combat mechanics
     */
    combat: {
        // Knockback values
        baseKnockback: 0.3,             // Base knockback speed applied when hitting players
        projectileKnockback: 0.3,       // Knockback from arrow/projectile hits
        spikeKnockback: 1.5,            // Knockback from damage-dealing structures (spikes, traps)

        // Slow effects
        defaultHitSlow: 0.3,            // Default slow amount applied when attacking (if weapon doesn't specify)
        slowRecoveryRate: 0.0008,       // How fast players recover from slow effects per tick

        // Hit detection
        playerHitScale: 1.8,            // Multiplier for player hitbox size in melee combat
        objectDamageMultiplier: 5,      // Damage multiplier when AI attacks structures

        // Rewards
        killScoreMultiplier: 100,       // Base score for kills (victim's age × this value)
        goldStealPercent: 0.5,          // Percentage of victim's points stolen with goldSteal hat (0.5 = 50%)

        // Poison effects
        poisonDamage: 5,                // Damage per tick from poison weapons/spikes
        poisonDuration: 5               // Number of ticks poison effect lasts
    },

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * WATER MECHANICS
     * ═══════════════════════════════════════════════════════════════════════
     * Controls movement and physics in water
     */
    water: {
        normalSpeedMultiplier: 0.33,        // Speed multiplier in water without immunity (33% speed)
        immunitySpeedMultiplier: 0.75,      // Speed multiplier with water immunity item (75% speed)
        normalCurrentEffect: 1.0,           // Water current strength for normal players (100%)
        immunityCurrentEffect: 0.4          // Water current strength with immunity (40%)
    },

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * SHAME/ANTI-CHEAT SYSTEM
     * ═══════════════════════════════════════════════════════════════════════
     * Anti-exploit system that detects and punishes rapid auto-healing
     */
    shameSystem: {
        detectionWindow: 120,       // Time window in ms to detect rapid healing after being hit
        threshold: 8,               // Number of suspicious heals before applying shame
        penaltyDuration: 30000,     // How long shame hat is forced on player (30 seconds)
        countReduction: 2           // How much shame count decreases for legitimate plays
    },

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * AI BEHAVIOR SYSTEM
     * ═══════════════════════════════════════════════════════════════════════
     * Controls animal/AI movement, combat, and decision-making
     *
     * HOW AI WORKS:
     * - AI cycles between states: idle (waitCount), moving (moveCount), attacking
     * - Speed multipliers apply during different behaviors (fleeing, charging, attacking)
     * - Hostile AI chases players, passive AI wanders randomly
     * - All durations are in milliseconds
     */
    ai: {
        // Update timing
        initialWait: 1000,              // Initial wait time when AI spawns (ms)
        updateInterval: 1000,           // How often AI processes health regen and poison (ms)

        // Movement timing (random ranges)
        chargeDurationMin: 8000,        // Minimum time AI charges at player (ms)
        chargeDurationMax: 12000,       // Maximum time AI charges at player (ms)
        wanderDurationMin: 1000,        // Minimum time AI wanders when no target (ms)
        wanderDurationMax: 2000,        // Maximum time AI wanders when no target (ms)
        movementDurationMin: 4000,      // Minimum time for normal movement (ms)
        movementDurationMax: 10000,     // Maximum time for normal movement (ms)

        // Wait timing
        hostileWaitTime: 1500,          // Wait time for hostile AI between movements (ms)
        passiveWaitMin: 1500,           // Minimum wait time for passive AI (ms)
        passiveWaitMax: 6000,           // Maximum wait time for passive AI (ms)
        postHitWait: 3000,              // Wait time after successfully hitting player (ms)
        fleeDuration: 2000,             // How long AI flees after being hit (ms)

        // Speed multipliers
        fleeSpeedMultiplier: 1.42,      // Speed boost when fleeing (42% faster)
        chargeSpeedMultiplier: 1.75,    // Speed boost when charging player (75% faster)
        hitWindupSlowdown: 0.3,         // Speed during attack wind-up (30% speed)
        waterSlowdown: 0.33,            // Speed multiplier in water (33% speed)

        // Combat behavior
        leapChance: 0.33,               // Probability of leaping during attack (33%)
        playerKnockback: 0.6,           // Knockback force applied to players by AI attacks
        collisionKnockback: 0.55,       // Knockback from colliding with AI
        hitDelay: 600,                  // Attack cooldown variation (ms, 33% chance to apply)
        hitDelayAfterDamage: 500,       // Delay before counter-attacking after taking damage (ms)

        // Animation
        animationSpeed: 600,            // Duration of attack animation (ms)
        attackAngle: 0.8,               // Attack swing angle (multiply by Math.PI for radians)

        // Physics
        collisionDepthDivisor: 40,      // Divisor for calculating collision depth from speed
        maxCollisionDepth: 4,           // Maximum collision detection iterations
        minCollisionDepth: 1            // Minimum collision detection iterations
    },

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * PHYSICS & COLLISION SYSTEM
     * ═══════════════════════════════════════════════════════════════════════
     * Controls movement physics, collision detection, and object interactions
     */
    physics: {
        // Velocity thresholds
        velocityStopThreshold: 0.01,        // Minimum velocity before stopping movement

        // Collision behavior
        collisionVelocityRetention: 0.75,   // Percentage of velocity kept when hitting objects (75%)
        objectScaleMultiplier: 0.6,         // Collision scale for non-item objects (60% of visual size)
        wiggleDecayRate: 0.99,              // How fast objects stop wiggling after being hit

        // Building mechanics
        buildingSpeedPenalty: 0.5           // Speed multiplier when holding building items (50% speed)
    },

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * TURRET SYSTEM
     * ═══════════════════════════════════════════════════════════════════════
     * Settings for turret gear hat and turret structures
     */
    turret: {
        gearHatID: 53,                  // Hat ID that enables turret mode
        empHelmetID: 22,                // Hat ID that grants turret immunity
        targetRange: 735,               // Maximum distance to target enemies (pixels)
        projectileSpeed: 1.6,           // Speed of turret projectiles
        fireRate: 2500,                 // Cooldown between turret hat shots (ms)
        structureMinCooldown: 250       // Minimum cooldown for turret structures when no target (ms)
    },

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * LEADERBOARD & UI
     * ═══════════════════════════════════════════════════════════════════════
     * User interface and leaderboard settings
     */
    leaderboard: {
        leaderboardMaxPlayers: 10,      // Number of players shown on leaderboard
        allianceNameMaxLength: 7        // Maximum characters in alliance names
    },

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * SPECIAL ITEMS & HATS
     * ═══════════════════════════════════════════════════════════════════════
     * IDs and settings for special cosmetic items with unique effects
     */
    specialItems: {
        shameHatID: 45,                 // Hat ID forced on cheaters/exploiters
        turretGearID: 53                // Turret gear hat ID (duplicate for reference)
        // NOTE: Turret EMP helmet ID defined in turret config (empHelmetID)
    },

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * WORLD GENERATION & SPAWNING
     * ═══════════════════════════════════════════════════════════════════════
     * Settings for world generation and entity spawning
     */
    spawning: {
        aiSpawnCheckInterval: 1000,     // How often to check if animals need respawning (ms)
        turretProjectileOffset: 45      // Distance from turret center to spawn projectile (pixels)
    }
};

module.exports = defineConfig(groupedConfig);
