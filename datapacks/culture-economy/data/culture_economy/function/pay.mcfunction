# Runs as the player who just completed an advancement.
# `tag` = unique id (e.g. "story_mine_diamond"), `amount` = tokens awarded.
#
# Why `ce_give` and not `/givemoney @s`: Savs' /givemoney takes a
# StringArgumentType player name and rejects `@s` at parse time, which makes
# the macro fail to instantiate (no tag set, no tellraw, no reward). The
# command-maker alias `ce_give` is defined as `givemoney ${player}` — the
# ${player} token resolves to source.getName() (the player we're running as),
# so the final command is `givemoney <PlayerName> <amount>` which parses
# cleanly.
#
# ce_earned is a local scoreboard tracking cumulative rewards across all
# tiers; inspect with `/scoreboard players list <player>`.

$tag @s add ce_paid_$(tag)
$scoreboard players add @s ce_earned $(amount)
$tellraw @s [{"text":"[Culture Craft] ","color":"dark_green"},{"text":"+$(amount)","color":"gold","bold":true},{"text":" tokens","color":"yellow"}]
$ce_give $(amount)
