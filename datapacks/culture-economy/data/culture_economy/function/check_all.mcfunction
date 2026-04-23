# Driver: one line per rewarded vanilla advancement.
# Add / remove lines freely — no schema changes needed elsewhere.
# Columns: adv id (under minecraft:) | tag suffix | label (human) | amount

# Tier — Onboarding (50 tokens)
function culture_economy:check {adv: "story/root", tag: "story_root", label: "Minecraft", amount: 50}
function culture_economy:check {adv: "adventure/root", tag: "adventure_root", label: "Adventure", amount: 50}
function culture_economy:check {adv: "husbandry/root", tag: "husbandry_root", label: "Husbandry", amount: 50}
function culture_economy:check {adv: "story/mine_stone", tag: "story_mine_stone", label: "Stone Age", amount: 50}

# Tier — Early progression (100 tokens)
function culture_economy:check {adv: "story/upgrade_tools", tag: "story_upgrade_tools", label: "Getting an Upgrade", amount: 100}
function culture_economy:check {adv: "story/smelt_iron", tag: "story_smelt_iron", label: "Acquire Hardware", amount: 100}
function culture_economy:check {adv: "story/obtain_armor", tag: "story_obtain_armor", label: "Suit Up", amount: 100}
function culture_economy:check {adv: "story/lava_bucket", tag: "story_lava_bucket", label: "Hot Stuff", amount: 100}
function culture_economy:check {adv: "story/iron_tools", tag: "story_iron_tools", label: "Iron Tools", amount: 100}
function culture_economy:check {adv: "husbandry/plant_seed", tag: "husbandry_plant_seed", label: "A Seedy Place", amount: 100}
function culture_economy:check {adv: "husbandry/breed_an_animal", tag: "husbandry_breed", label: "Parrots and Bats", amount: 100}
function culture_economy:check {adv: "husbandry/tame_an_animal", tag: "husbandry_tame", label: "Best Friends Forever", amount: 100}

# Tier — Milestones (200 tokens)
function culture_economy:check {adv: "story/mine_diamond", tag: "story_mine_diamond", label: "Diamonds!", amount: 200}
function culture_economy:check {adv: "story/enter_the_nether", tag: "story_enter_nether", label: "We Need to Go Deeper", amount: 200}
function culture_economy:check {adv: "story/shiny_gear", tag: "story_shiny_gear", label: "Cover Me with Diamonds", amount: 200}
function culture_economy:check {adv: "story/enchant_item", tag: "story_enchant", label: "Enchanter", amount: 200}
function culture_economy:check {adv: "story/cure_zombie_villager", tag: "story_cure_villager", label: "Zombie Doctor", amount: 200}
function culture_economy:check {adv: "story/follow_ender_eye", tag: "story_follow_eye", label: "Eye Spy", amount: 200}
function culture_economy:check {adv: "story/form_obsidian", tag: "story_obsidian", label: "Ice Bucket Challenge", amount: 200}
function culture_economy:check {adv: "husbandry/fishy_business", tag: "husbandry_fishy", label: "Fishy Business", amount: 200}

# Tier — Nether / mid-game (400 tokens)
function culture_economy:check {adv: "nether/root", tag: "nether_root", label: "Nether", amount: 400}
function culture_economy:check {adv: "nether/obtain_blaze_rod", tag: "nether_blaze", label: "Into Fire", amount: 400}
function culture_economy:check {adv: "nether/obtain_wither_skull", tag: "nether_wither_skull", label: "Spooky Scary Skeleton", amount: 400}
function culture_economy:check {adv: "nether/find_fortress", tag: "nether_fortress", label: "A Terrible Fortress", amount: 400}
function culture_economy:check {adv: "nether/find_bastion", tag: "nether_bastion", label: "Those Were the Days", amount: 400}
function culture_economy:check {adv: "nether/obtain_ancient_debris", tag: "nether_debris", label: "Hidden in the Depths", amount: 400}
function culture_economy:check {adv: "nether/distract_piglin", tag: "nether_piglin", label: "Oh Shiny", amount: 400}
function culture_economy:check {adv: "nether/create_beacon", tag: "nether_beacon", label: "Bring Home the Beacon", amount: 400}
function culture_economy:check {adv: "nether/brew_potion", tag: "nether_potion", label: "Local Brewery", amount: 400}
function culture_economy:check {adv: "story/enter_the_end", tag: "story_enter_end", label: "The End?", amount: 400}

# Tier — End / late game (800 tokens)
function culture_economy:check {adv: "end/root", tag: "end_root", label: "The End", amount: 800}
function culture_economy:check {adv: "end/kill_dragon", tag: "end_dragon", label: "Free the End", amount: 800}
function culture_economy:check {adv: "end/dragon_egg", tag: "end_egg", label: "The Next Generation", amount: 800}
function culture_economy:check {adv: "end/find_end_city", tag: "end_city", label: "The City at the End of the Game", amount: 800}
function culture_economy:check {adv: "end/elytra", tag: "end_elytra", label: "Sky is the Limit", amount: 800}
function culture_economy:check {adv: "nether/summon_wither", tag: "nether_summon_wither", label: "Withering Heights", amount: 800}
function culture_economy:check {adv: "nether/netherite_armor", tag: "nether_netherite_armor", label: "Cover Me in Debris", amount: 800}
function culture_economy:check {adv: "adventure/hero_of_the_village", tag: "adv_hero", label: "Hero of the Village", amount: 800}
function culture_economy:check {adv: "adventure/totem_of_undying", tag: "adv_totem", label: "Postmortal", amount: 800}

# Tier — Completion trophies (2000 tokens)
function culture_economy:check {adv: "adventure/adventuring_time", tag: "adv_adventuring", label: "Adventuring Time", amount: 2000}
function culture_economy:check {adv: "adventure/kill_all_mobs", tag: "adv_monsters_hunted", label: "Monsters Hunted", amount: 2000}
function culture_economy:check {adv: "husbandry/balanced_diet", tag: "husbandry_diet", label: "A Balanced Diet", amount: 2000}
function culture_economy:check {adv: "husbandry/complete_catalogue", tag: "husbandry_catalogue", label: "A Complete Catalogue", amount: 2000}
function culture_economy:check {adv: "nether/all_potions", tag: "nether_all_potions", label: "A Furious Cocktail", amount: 2000}
function culture_economy:check {adv: "nether/all_effects", tag: "nether_all_effects", label: "How Did We Get Here?", amount: 2000}
function culture_economy:check {adv: "nether/create_full_beacon", tag: "nether_beaconator", label: "Beaconator", amount: 2000}
function culture_economy:check {adv: "adventure/arbalistic", tag: "adv_arbalistic", label: "Arbalistic", amount: 2000}
