# Driver: one line per rewarded vanilla advancement.
# Add / remove lines freely — no schema changes needed elsewhere.
# Columns: advancement id (under minecraft:) | tag suffix | token amount

# Tier 1 — Onboarding (50 tokens)
function culture_economy:check {adv: "story/root", tag: "story_root", amount: 50}
function culture_economy:check {adv: "adventure/root", tag: "adventure_root", amount: 50}
function culture_economy:check {adv: "husbandry/root", tag: "husbandry_root", amount: 50}
function culture_economy:check {adv: "story/mine_stone", tag: "story_mine_stone", amount: 50}

# Tier 2 — Early progression (100 tokens)
function culture_economy:check {adv: "story/upgrade_tools", tag: "story_upgrade_tools", amount: 100}
function culture_economy:check {adv: "story/smelt_iron", tag: "story_smelt_iron", amount: 100}
function culture_economy:check {adv: "story/obtain_armor", tag: "story_obtain_armor", amount: 100}
function culture_economy:check {adv: "story/lava_bucket", tag: "story_lava_bucket", amount: 100}
function culture_economy:check {adv: "story/iron_tools", tag: "story_iron_tools", amount: 100}
function culture_economy:check {adv: "husbandry/plant_seed", tag: "husbandry_plant_seed", amount: 100}
function culture_economy:check {adv: "husbandry/breed_an_animal", tag: "husbandry_breed", amount: 100}
function culture_economy:check {adv: "husbandry/tame_an_animal", tag: "husbandry_tame", amount: 100}

# Tier 3 — Milestones (200 tokens)
function culture_economy:check {adv: "story/mine_diamond", tag: "story_mine_diamond", amount: 200}
function culture_economy:check {adv: "story/enter_the_nether", tag: "story_enter_nether", amount: 200}
function culture_economy:check {adv: "story/shiny_gear", tag: "story_shiny_gear", amount: 200}
function culture_economy:check {adv: "story/enchant_item", tag: "story_enchant", amount: 200}
function culture_economy:check {adv: "story/cure_zombie_villager", tag: "story_cure_villager", amount: 200}
function culture_economy:check {adv: "story/follow_ender_eye", tag: "story_follow_eye", amount: 200}
function culture_economy:check {adv: "story/form_obsidian", tag: "story_obsidian", amount: 200}
function culture_economy:check {adv: "husbandry/fishy_business", tag: "husbandry_fishy", amount: 200}

# Tier 4 — Nether / mid-game (400 tokens)
function culture_economy:check {adv: "nether/root", tag: "nether_root", amount: 400}
function culture_economy:check {adv: "nether/obtain_blaze_rod", tag: "nether_blaze", amount: 400}
function culture_economy:check {adv: "nether/obtain_wither_skull", tag: "nether_wither_skull", amount: 400}
function culture_economy:check {adv: "nether/find_fortress", tag: "nether_fortress", amount: 400}
function culture_economy:check {adv: "nether/find_bastion", tag: "nether_bastion", amount: 400}
function culture_economy:check {adv: "nether/obtain_ancient_debris", tag: "nether_debris", amount: 400}
function culture_economy:check {adv: "nether/distract_piglin", tag: "nether_piglin", amount: 400}
function culture_economy:check {adv: "nether/create_beacon", tag: "nether_beacon", amount: 400}
function culture_economy:check {adv: "nether/brew_potion", tag: "nether_potion", amount: 400}
function culture_economy:check {adv: "story/enter_the_end", tag: "story_enter_end", amount: 400}

# Tier 5 — End / late game (800 tokens)
function culture_economy:check {adv: "end/root", tag: "end_root", amount: 800}
function culture_economy:check {adv: "end/kill_dragon", tag: "end_dragon", amount: 800}
function culture_economy:check {adv: "end/dragon_egg", tag: "end_egg", amount: 800}
function culture_economy:check {adv: "end/find_end_city", tag: "end_city", amount: 800}
function culture_economy:check {adv: "end/elytra", tag: "end_elytra", amount: 800}
function culture_economy:check {adv: "nether/summon_wither", tag: "nether_summon_wither", amount: 800}
function culture_economy:check {adv: "nether/netherite_armor", tag: "nether_netherite_armor", amount: 800}
function culture_economy:check {adv: "adventure/hero_of_the_village", tag: "adv_hero", amount: 800}
function culture_economy:check {adv: "adventure/totem_of_undying", tag: "adv_totem", amount: 800}

# Tier 6 — Completion trophies (2000 tokens)
function culture_economy:check {adv: "adventure/adventuring_time", tag: "adv_adventuring", amount: 2000}
function culture_economy:check {adv: "adventure/kill_all_mobs", tag: "adv_monsters_hunted", amount: 2000}
function culture_economy:check {adv: "husbandry/balanced_diet", tag: "husbandry_diet", amount: 2000}
function culture_economy:check {adv: "husbandry/complete_catalogue", tag: "husbandry_catalogue", amount: 2000}
function culture_economy:check {adv: "nether/all_potions", tag: "nether_all_potions", amount: 2000}
function culture_economy:check {adv: "nether/all_effects", tag: "nether_all_effects", amount: 2000}
function culture_economy:check {adv: "nether/create_full_beacon", tag: "nether_beaconator", amount: 2000}
function culture_economy:check {adv: "adventure/arbalistic", tag: "adv_arbalistic", amount: 2000}
