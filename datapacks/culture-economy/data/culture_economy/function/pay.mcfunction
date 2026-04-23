# Runs as the player who just completed an advancement.
# `tag`    = unique id (e.g. "story_mine_diamond")
# `label`  = human-readable advancement name shown in chat
# `amount` = tokens awarded
#
# Why `ce_give` and not `/givemoney @s`: Savs' /givemoney takes a
# StringArgumentType player name and rejects `@s` at parse time, which
# makes the macro fail to instantiate. The command-maker alias `ce_give`
# is defined as `givemoney ${player}` — ${player} resolves to
# source.getName(), producing `givemoney <PlayerName> <amount>`.

$tag @s add ce_paid_$(tag)
$scoreboard players add @s ce_earned $(amount)
$tellraw @s [{"text":"[Culture Craft] ","color":"dark_green"},{"text":"+$(amount)","color":"gold","bold":true},{"text":" tokens","color":"yellow"},{"text":" — ","color":"dark_gray"},{"text":"🏆 $(label)","color":"gray","italic":true}]
$ce_give $(amount)
