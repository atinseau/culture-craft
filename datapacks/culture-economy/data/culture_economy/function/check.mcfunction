$execute as @a[advancements={minecraft:$(adv)=true},tag=!ce_paid_$(tag)] run function culture_economy:pay {tag: "$(tag)", amount: $(amount)}
