# Runs as the player who just completed an advancement.
# `tag` = unique id (e.g. "story_mine_diamond"), `amount` = tokens awarded.
#
# ce_earned is a local scoreboard tracking cumulative rewards (visible via
# `/scoreboard players list <player>`). The real credit to the player's Savs
# wallet happens through `/givemoney`, which requires function-permission-level
# >= 2 (default in server.properties).

$tag @s add ce_paid_$(tag)
$scoreboard players add @s ce_earned $(amount)
$tellraw @s [{"text":"[Culture Craft] ","color":"dark_green"},{"text":"+$(amount)","color":"gold","bold":true},{"text":" tokens","color":"yellow"}]
$givemoney @s $(amount)
