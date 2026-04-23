scoreboard objectives add ce_earned dummy {"text":"Tokens earned","color":"gold"}
scoreboard objectives add ce_timer dummy
scoreboard players set #t ce_timer 0

tellraw @a [{"text":"[Culture Craft] ","color":"dark_green"},{"text":"Economy datapack loaded","color":"gray"}]
