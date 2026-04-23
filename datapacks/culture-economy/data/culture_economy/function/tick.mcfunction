scoreboard players add #t ce_timer 1
execute if score #t ce_timer matches 20.. run function culture_economy:check_all
execute if score #t ce_timer matches 20.. run scoreboard players set #t ce_timer 0
