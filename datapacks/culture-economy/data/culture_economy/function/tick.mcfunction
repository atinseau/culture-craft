scoreboard players add #t ce_timer 1
execute if score #t ce_timer matches 20.. run function culture_economy:check_all
execute if score #t ce_timer matches 20.. run scoreboard players set #t ce_timer 0

# Onboarding runs once per player (tag is added inside the function).
execute as @a[tag=!ce_onboarded] at @s run function culture_economy:onboard
