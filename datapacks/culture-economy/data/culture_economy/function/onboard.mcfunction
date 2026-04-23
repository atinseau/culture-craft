# Runs once per player on first tick where they lack the ce_onboarded tag.
# Tag is added first so the message/kit never double-fires, even if /give or
# the tellraw cascade somehow error — idempotent.

tag @s add ce_onboarded

tellraw @s ""
tellraw @s [{"text":"═══════════════════════════════════","color":"dark_green"}]
tellraw @s [{"text":"  Bienvenue sur ","color":"green","bold":true},{"text":"Culture Craft","color":"gold","bold":true},{"text":", ","color":"green","bold":true},{"selector":"@s","color":"yellow","bold":true},{"text":" !","color":"green","bold":true}]
tellraw @s [{"text":"═══════════════════════════════════","color":"dark_green"}]
tellraw @s ""

tellraw @s [{"text":"💰 Tu commences avec ","color":"gold"},{"text":"50 tokens","color":"yellow","bold":true},{"text":" dans ta balance","color":"gold"}]
tellraw @s [{"text":"   Tape ","color":"gray"},{"text":"/bal","color":"yellow","clickEvent":{"action":"suggest_command","value":"/bal"},"hoverEvent":{"action":"show_text","contents":"Cliquer pour copier"}},{"text":" pour vérifier ton solde à tout moment","color":"gray"}]

tellraw @s ""
tellraw @s [{"text":"🎯 Comment gagner des tokens :","color":"aqua","bold":true}]
tellraw @s [{"text":"   • Complete les advancements vanilla ","color":"gray"},{"text":"(+50 à +2500)","color":"yellow"}]
tellraw @s [{"text":"   • Vends ton surplus avec ","color":"gray"},{"text":"/sell","color":"yellow","clickEvent":{"action":"run_command","value":"/sell"},"hoverEvent":{"action":"show_text","contents":"Cliquer pour ouvrir"}},{"text":" (70 items acceptés)","color":"gray"}]
tellraw @s [{"text":"   • Trade avec d'autres joueurs (chest shops ou Trade Shop blocks)","color":"gray"}]

tellraw @s ""
tellraw @s [{"text":"🛒 Comment dépenser :","color":"light_purple","bold":true}]
tellraw @s [{"text":"   • ","color":"gray"},{"text":"/market","color":"yellow","clickEvent":{"action":"run_command","value":"/market"},"hoverEvent":{"action":"show_text","contents":"Cliquer pour ouvrir"}},{"text":" — 45 items (confort, déco, blocs de construction)","color":"gray"}]
tellraw @s [{"text":"   • ","color":"gray"},{"text":"/pay <joueur> <montant>","color":"yellow","clickEvent":{"action":"suggest_command","value":"/pay "},"hoverEvent":{"action":"show_text","contents":"Cliquer pour copier"}},{"text":" — transfert entre joueurs","color":"gray"}]

tellraw @s ""
tellraw @s [{"text":"📜 Règles du serveur :","color":"red","bold":true}]
tellraw @s [{"text":"   1. Pas de griefing ni vol — respect les builds des autres","color":"gray"}]
tellraw @s [{"text":"   2. Mining, farming et élevage sont le cœur du jeu","color":"gray"}]
tellraw @s [{"text":"   3. Les graves protègent ton inventaire à la mort — pas de panique","color":"gray"}]
tellraw @s [{"text":"   4. Les chest shops joueurs sont la vraie économie — l'admin est juste le floor","color":"gray"}]

tellraw @s ""
tellraw @s [{"text":"🎁 Un kit de survie a été ajouté à ton inventaire. Bon jeu !","color":"green","bold":true}]
tellraw @s ""

function culture_economy:onboard/kit
