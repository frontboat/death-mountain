// Game Constants extracted from Cairo contracts

export const BEASTS = [
  // Magical T1s
  { id: 1, name: "Warlock", tier: 1, type: "Magical" },
  { id: 2, name: "Typhon", tier: 1, type: "Magical" },
  { id: 3, name: "Jiangshi", tier: 1, type: "Magical" },
  { id: 4, name: "Anansi", tier: 1, type: "Magical" },
  { id: 5, name: "Basilisk", tier: 1, type: "Magical" },
  
  // Magical T2s
  { id: 6, name: "Gorgon", tier: 2, type: "Magical" },
  { id: 7, name: "Kitsune", tier: 2, type: "Magical" },
  { id: 8, name: "Lich", tier: 2, type: "Magical" },
  { id: 9, name: "Chimera", tier: 2, type: "Magical" },
  { id: 10, name: "Wendigo", tier: 2, type: "Magical" },
  
  // Magical T3s
  { id: 11, name: "Rakshasa", tier: 3, type: "Magical" },
  { id: 12, name: "Werewolf", tier: 3, type: "Magical" },
  { id: 13, name: "Banshee", tier: 3, type: "Magical" },
  { id: 14, name: "Draugr", tier: 3, type: "Magical" },
  { id: 15, name: "Vampire", tier: 3, type: "Magical" },
  
  // Magical T4s
  { id: 16, name: "Goblin", tier: 4, type: "Magical" },
  { id: 17, name: "Ghoul", tier: 4, type: "Magical" },
  { id: 18, name: "Wraith", tier: 4, type: "Magical" },
  { id: 19, name: "Sprite", tier: 4, type: "Magical" },
  { id: 20, name: "Kappa", tier: 4, type: "Magical" },
  
  // Magical T5s
  { id: 21, name: "Fairy", tier: 5, type: "Magical" },
  { id: 22, name: "Leprechaun", tier: 5, type: "Magical" },
  { id: 23, name: "Kelpie", tier: 5, type: "Magical" },
  { id: 24, name: "Pixie", tier: 5, type: "Magical" },
  { id: 25, name: "Gnome", tier: 5, type: "Magical" },
  
  // Hunter T1s
  { id: 26, name: "Griffin", tier: 1, type: "Hunter" },
  { id: 27, name: "Manticore", tier: 1, type: "Hunter" },
  { id: 28, name: "Phoenix", tier: 1, type: "Hunter" },
  { id: 29, name: "Dragon", tier: 1, type: "Hunter" },
  { id: 30, name: "Minotaur", tier: 1, type: "Hunter" },
  
  // Hunter T2s
  { id: 31, name: "Qilin", tier: 2, type: "Hunter" },
  { id: 32, name: "Ammit", tier: 2, type: "Hunter" },
  { id: 33, name: "Nue", tier: 2, type: "Hunter" },
  { id: 34, name: "Skinwalker", tier: 2, type: "Hunter" },
  { id: 35, name: "Chupacabra", tier: 2, type: "Hunter" },
  
  // Hunter T3s
  { id: 36, name: "Weretiger", tier: 3, type: "Hunter" },
  { id: 37, name: "Wyvern", tier: 3, type: "Hunter" },
  { id: 38, name: "Roc", tier: 3, type: "Hunter" },
  { id: 39, name: "Harpy", tier: 3, type: "Hunter" },
  { id: 40, name: "Pegasus", tier: 3, type: "Hunter" },
  
  // Hunter T4s
  { id: 41, name: "Hippogriff", tier: 4, type: "Hunter" },
  { id: 42, name: "Fenrir", tier: 4, type: "Hunter" },
  { id: 43, name: "Jaguar", tier: 4, type: "Hunter" },
  { id: 44, name: "Satori", tier: 4, type: "Hunter" },
  { id: 45, name: "DireWolf", tier: 4, type: "Hunter" },
  
  // Hunter T5s
  { id: 46, name: "Bear", tier: 5, type: "Hunter" },
  { id: 47, name: "Wolf", tier: 5, type: "Hunter" },
  { id: 48, name: "Mantis", tier: 5, type: "Hunter" },
  { id: 49, name: "Spider", tier: 5, type: "Hunter" },
  { id: 50, name: "Rat", tier: 5, type: "Hunter" },
  
  // Brute T1s
  { id: 51, name: "Kraken", tier: 1, type: "Brute" },
  { id: 52, name: "Colossus", tier: 1, type: "Brute" },
  { id: 53, name: "Balrog", tier: 1, type: "Brute" },
  { id: 54, name: "Leviathan", tier: 1, type: "Brute" },
  { id: 55, name: "Tarrasque", tier: 1, type: "Brute" },
  
  // Brute T2s
  { id: 56, name: "Titan", tier: 2, type: "Brute" },
  { id: 57, name: "Nephilim", tier: 2, type: "Brute" },
  { id: 58, name: "Behemoth", tier: 2, type: "Brute" },
  { id: 59, name: "Hydra", tier: 2, type: "Brute" },
  { id: 60, name: "Juggernaut", tier: 2, type: "Brute" },
  
  // Brute T3s
  { id: 61, name: "Oni", tier: 3, type: "Brute" },
  { id: 62, name: "Jotunn", tier: 3, type: "Brute" },
  { id: 63, name: "Ettin", tier: 3, type: "Brute" },
  { id: 64, name: "Cyclops", tier: 3, type: "Brute" },
  { id: 65, name: "Giant", tier: 3, type: "Brute" },
  
  // Brute T4s
  { id: 66, name: "Nemean Lion", tier: 4, type: "Brute" },
  { id: 67, name: "Berserker", tier: 4, type: "Brute" },
  { id: 68, name: "Yeti", tier: 4, type: "Brute" },
  { id: 69, name: "Golem", tier: 4, type: "Brute" },
  { id: 70, name: "Ent", tier: 4, type: "Brute" },
  
  // Brute T5s
  { id: 71, name: "Troll", tier: 5, type: "Brute" },
  { id: 72, name: "Bigfoot", tier: 5, type: "Brute" },
  { id: 73, name: "Ogre", tier: 5, type: "Brute" },
  { id: 74, name: "Orc", tier: 5, type: "Brute" },
  { id: 75, name: "Skeleton", tier: 5, type: "Brute" },
];

export const ITEMS = [
  // Necklaces
  { id: 1, name: "Pendant", tier: 5, slot: "Neck", type: "Jewelry" },
  { id: 2, name: "Necklace", tier: 5, slot: "Neck", type: "Jewelry" },
  { id: 3, name: "Amulet", tier: 5, slot: "Neck", type: "Jewelry" },
  
  // Rings
  { id: 4, name: "Silver Ring", tier: 5, slot: "Ring", type: "Jewelry" },
  { id: 5, name: "Bronze Ring", tier: 5, slot: "Ring", type: "Jewelry" },
  { id: 6, name: "Platinum Ring", tier: 5, slot: "Ring", type: "Jewelry" },
  { id: 7, name: "Titanium Ring", tier: 5, slot: "Ring", type: "Jewelry" },
  { id: 8, name: "Gold Ring", tier: 5, slot: "Ring", type: "Jewelry" },
  
  // Magic Weapons
  { id: 9, name: "Ghost Wand", tier: 4, slot: "Weapon", type: "Magic" },
  { id: 10, name: "Grave Wand", tier: 4, slot: "Weapon", type: "Magic" },
  { id: 11, name: "Bone Wand", tier: 3, slot: "Weapon", type: "Magic" },
  { id: 12, name: "Wand", tier: 5, slot: "Weapon", type: "Magic" },
  { id: 13, name: "Grimoire", tier: 1, slot: "Weapon", type: "Magic" },
  { id: 14, name: "Chronicle", tier: 2, slot: "Weapon", type: "Magic" },
  { id: 15, name: "Tome", tier: 3, slot: "Weapon", type: "Magic" },
  { id: 16, name: "Book", tier: 5, slot: "Weapon", type: "Magic" },
  
  // Cloth Armor
  { id: 17, name: "Divine Robe", tier: 1, slot: "Chest", type: "Cloth" },
  { id: 18, name: "Silk Robe", tier: 2, slot: "Chest", type: "Cloth" },
  { id: 19, name: "Linen Robe", tier: 3, slot: "Chest", type: "Cloth" },
  { id: 20, name: "Robe", tier: 4, slot: "Chest", type: "Cloth" },
  { id: 21, name: "Shirt", tier: 5, slot: "Chest", type: "Cloth" },
  
  // Cloth Head
  { id: 22, name: "Crown", tier: 1, slot: "Head", type: "Cloth" },
  { id: 23, name: "Divine Hood", tier: 1, slot: "Head", type: "Cloth" },
  { id: 24, name: "Silk Hood", tier: 2, slot: "Head", type: "Cloth" },
  { id: 25, name: "Linen Hood", tier: 3, slot: "Head", type: "Cloth" },
  { id: 26, name: "Hood", tier: 4, slot: "Head", type: "Cloth" },
  
  // Cloth Waist
  { id: 27, name: "Brightsilk Sash", tier: 1, slot: "Waist", type: "Cloth" },
  { id: 28, name: "Silk Sash", tier: 2, slot: "Waist", type: "Cloth" },
  { id: 29, name: "Wool Sash", tier: 3, slot: "Waist", type: "Cloth" },
  { id: 30, name: "Linen Sash", tier: 4, slot: "Waist", type: "Cloth" },
  { id: 31, name: "Sash", tier: 5, slot: "Waist", type: "Cloth" },
  
  // Cloth Foot
  { id: 32, name: "Divine Slippers", tier: 1, slot: "Foot", type: "Cloth" },
  { id: 33, name: "Silk Slippers", tier: 2, slot: "Foot", type: "Cloth" },
  { id: 34, name: "Wool Shoes", tier: 3, slot: "Foot", type: "Cloth" },
  { id: 35, name: "Linen Shoes", tier: 4, slot: "Foot", type: "Cloth" },
  { id: 36, name: "Shoes", tier: 5, slot: "Foot", type: "Cloth" },
  
  // Cloth Hand
  { id: 37, name: "Divine Gloves", tier: 1, slot: "Hand", type: "Cloth" },
  { id: 38, name: "Silk Gloves", tier: 2, slot: "Hand", type: "Cloth" },
  { id: 39, name: "Wool Gloves", tier: 3, slot: "Hand", type: "Cloth" },
  { id: 40, name: "Linen Gloves", tier: 4, slot: "Hand", type: "Cloth" },
  { id: 41, name: "Gloves", tier: 5, slot: "Hand", type: "Cloth" },
  
  // Blade Weapons
  { id: 42, name: "Katana", tier: 1, slot: "Weapon", type: "Blade" },
  { id: 43, name: "Falchion", tier: 2, slot: "Weapon", type: "Blade" },
  { id: 44, name: "Scimitar", tier: 3, slot: "Weapon", type: "Blade" },
  { id: 45, name: "Long Sword", tier: 4, slot: "Weapon", type: "Blade" },
  { id: 46, name: "Short Sword", tier: 5, slot: "Weapon", type: "Blade" },
  
  // Leather Armor
  { id: 47, name: "Demon Husk", tier: 1, slot: "Chest", type: "Leather" },
  { id: 48, name: "Dragonskin Armor", tier: 2, slot: "Chest", type: "Leather" },
  { id: 49, name: "Studded Leather Armor", tier: 3, slot: "Chest", type: "Leather" },
  { id: 50, name: "Hard Leather Armor", tier: 4, slot: "Chest", type: "Leather" },
  { id: 51, name: "Leather Armor", tier: 5, slot: "Chest", type: "Leather" },
  
  // Leather Head
  { id: 52, name: "Demon Crown", tier: 1, slot: "Head", type: "Leather" },
  { id: 53, name: "Dragon's Crown", tier: 2, slot: "Head", type: "Leather" },
  { id: 54, name: "War Cap", tier: 3, slot: "Head", type: "Leather" },
  { id: 55, name: "Leather Cap", tier: 4, slot: "Head", type: "Leather" },
  { id: 56, name: "Cap", tier: 5, slot: "Head", type: "Leather" },
  
  // Leather Waist
  { id: 57, name: "Demonhide Belt", tier: 1, slot: "Waist", type: "Leather" },
  { id: 58, name: "Dragonskin Belt", tier: 2, slot: "Waist", type: "Leather" },
  { id: 59, name: "Studded Leather Belt", tier: 3, slot: "Waist", type: "Leather" },
  { id: 60, name: "Hard Leather Belt", tier: 4, slot: "Waist", type: "Leather" },
  { id: 61, name: "Leather Belt", tier: 5, slot: "Waist", type: "Leather" },
  
  // Leather Foot
  { id: 62, name: "Demonhide Boots", tier: 1, slot: "Foot", type: "Leather" },
  { id: 63, name: "Dragonskin Boots", tier: 2, slot: "Foot", type: "Leather" },
  { id: 64, name: "Studded Leather Boots", tier: 3, slot: "Foot", type: "Leather" },
  { id: 65, name: "Hard Leather Boots", tier: 4, slot: "Foot", type: "Leather" },
  { id: 66, name: "Leather Boots", tier: 5, slot: "Foot", type: "Leather" },
  
  // Leather Hand
  { id: 67, name: "Demon's Hands", tier: 1, slot: "Hand", type: "Leather" },
  { id: 68, name: "Dragonskin Gloves", tier: 2, slot: "Hand", type: "Leather" },
  { id: 69, name: "Studded Leather Gloves", tier: 3, slot: "Hand", type: "Leather" },
  { id: 70, name: "Hard Leather Gloves", tier: 4, slot: "Hand", type: "Leather" },
  { id: 71, name: "Leather Gloves", tier: 5, slot: "Hand", type: "Leather" },
  
  // Bludgeon Weapons
  { id: 72, name: "Warhammer", tier: 1, slot: "Weapon", type: "Bludgeon" },
  { id: 73, name: "Quarterstaff", tier: 2, slot: "Weapon", type: "Bludgeon" },
  { id: 74, name: "Maul", tier: 3, slot: "Weapon", type: "Bludgeon" },
  { id: 75, name: "Mace", tier: 4, slot: "Weapon", type: "Bludgeon" },
  { id: 76, name: "Club", tier: 5, slot: "Weapon", type: "Bludgeon" },
  
  // Metal Armor
  { id: 77, name: "Holy Chestplate", tier: 1, slot: "Chest", type: "Metal" },
  { id: 78, name: "Ornate Chestplate", tier: 2, slot: "Chest", type: "Metal" },
  { id: 79, name: "Plate Mail", tier: 3, slot: "Chest", type: "Metal" },
  { id: 80, name: "Chain Mail", tier: 4, slot: "Chest", type: "Metal" },
  { id: 81, name: "Ring Mail", tier: 5, slot: "Chest", type: "Metal" },
  
  // Metal Head
  { id: 82, name: "Ancient Helm", tier: 1, slot: "Head", type: "Metal" },
  { id: 83, name: "Ornate Helm", tier: 2, slot: "Head", type: "Metal" },
  { id: 84, name: "Great Helm", tier: 3, slot: "Head", type: "Metal" },
  { id: 85, name: "Full Helm", tier: 4, slot: "Head", type: "Metal" },
  { id: 86, name: "Helm", tier: 5, slot: "Head", type: "Metal" },
  
  // Metal Waist
  { id: 87, name: "Ornate Belt", tier: 1, slot: "Waist", type: "Metal" },
  { id: 88, name: "War Belt", tier: 2, slot: "Waist", type: "Metal" },
  { id: 89, name: "Plated Belt", tier: 3, slot: "Waist", type: "Metal" },
  { id: 90, name: "Mesh Belt", tier: 4, slot: "Waist", type: "Metal" },
  { id: 91, name: "Heavy Belt", tier: 5, slot: "Waist", type: "Metal" },
  
  // Metal Foot
  { id: 92, name: "Holy Greaves", tier: 1, slot: "Foot", type: "Metal" },
  { id: 93, name: "Ornate Greaves", tier: 2, slot: "Foot", type: "Metal" },
  { id: 94, name: "Greaves", tier: 3, slot: "Foot", type: "Metal" },
  { id: 95, name: "Chain Boots", tier: 4, slot: "Foot", type: "Metal" },
  { id: 96, name: "Heavy Boots", tier: 5, slot: "Foot", type: "Metal" },
  
  // Metal Hand
  { id: 97, name: "Holy Gauntlets", tier: 1, slot: "Hand", type: "Metal" },
  { id: 98, name: "Ornate Gauntlets", tier: 2, slot: "Hand", type: "Metal" },
  { id: 99, name: "Gauntlets", tier: 3, slot: "Hand", type: "Metal" },
  { id: 100, name: "Chain Gloves", tier: 4, slot: "Hand", type: "Metal" },
  { id: 101, name: "Heavy Gloves", tier: 5, slot: "Hand", type: "Metal" },
];

export const OBSTACLES = [
  // Magical Obstacles
  { id: 1, name: "Demonic Alter", tier: 1, type: "Magical", damageType: "Magic", avoidStat: "Intelligence" },
  { id: 2, name: "Vortex of Despair", tier: 1, type: "Magical", damageType: "Magic", avoidStat: "Wisdom" },
  { id: 3, name: "Eldritch Barrier", tier: 1, type: "Magical", damageType: "Magic", avoidStat: "Intelligence" },
  { id: 4, name: "Soul Trap", tier: 1, type: "Magical", damageType: "Magic", avoidStat: "Charisma" },
  { id: 5, name: "Phantom Vortex", tier: 1, type: "Magical", damageType: "Magic", avoidStat: "Wisdom" },
  { id: 6, name: "Ectoplasmic Web", tier: 2, type: "Magical", damageType: "Magic", avoidStat: "Intelligence" },
  { id: 7, name: "Spectral Chains", tier: 2, type: "Magical", damageType: "Magic", avoidStat: "Charisma" },
  { id: 8, name: "Infernal Pact", tier: 2, type: "Magical", damageType: "Magic", avoidStat: "Wisdom" },
  { id: 9, name: "Arcane Explosion", tier: 2, type: "Magical", damageType: "Magic", avoidStat: "Intelligence" },
  { id: 10, name: "Hypnotic Essence", tier: 2, type: "Magical", damageType: "Magic", avoidStat: "Charisma" },
  { id: 11, name: "Mischievous Sprites", tier: 3, type: "Magical", damageType: "Magic", avoidStat: "Intelligence" },
  { id: 12, name: "Soul Draining Statue", tier: 3, type: "Magical", damageType: "Magic", avoidStat: "Charisma" },
  { id: 13, name: "Petrifying Gaze", tier: 3, type: "Magical", damageType: "Magic", avoidStat: "Wisdom" },
  { id: 14, name: "Summoning Circle", tier: 3, type: "Magical", damageType: "Magic", avoidStat: "Intelligence" },
  { id: 15, name: "Ethereal Void", tier: 3, type: "Magical", damageType: "Magic", avoidStat: "Wisdom" },
  { id: 16, name: "Magic Lock", tier: 4, type: "Magical", damageType: "Magic", avoidStat: "Intelligence" },
  { id: 17, name: "Bewitching Fog", tier: 4, type: "Magical", damageType: "Magic", avoidStat: "Charisma" },
  { id: 18, name: "Illusionary Maze", tier: 4, type: "Magical", damageType: "Magic", avoidStat: "Wisdom" },
  { id: 19, name: "Spellbound Mirror", tier: 4, type: "Magical", damageType: "Magic", avoidStat: "Intelligence" },
  { id: 20, name: "Ensnaring Shadow", tier: 4, type: "Magical", damageType: "Magic", avoidStat: "Charisma" },
  { id: 21, name: "Dark Mist", tier: 5, type: "Magical", damageType: "Magic", avoidStat: "Wisdom" },
  { id: 22, name: "Curse", tier: 5, type: "Magical", damageType: "Magic", avoidStat: "Charisma" },
  { id: 23, name: "Haunting Echo", tier: 5, type: "Magical", damageType: "Magic", avoidStat: "Intelligence" },
  { id: 24, name: "Hex", tier: 5, type: "Magical", damageType: "Magic", avoidStat: "Charisma" },
  { id: 25, name: "Ghostly Whispers", tier: 5, type: "Magical", damageType: "Magic", avoidStat: "Wisdom" },
  
  // Sharp Obstacles
  { id: 26, name: "Pendulum Blades", tier: 1, type: "Sharp", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 27, name: "Icy Razor Winds", tier: 1, type: "Sharp", damageType: "Physical", avoidStat: "Vitality" },
  { id: 28, name: "Acidic Thorns", tier: 1, type: "Sharp", damageType: "Poison", avoidStat: "Intelligence" },
  { id: 29, name: "Dragon's Breath", tier: 1, type: "Sharp", damageType: "Fire", avoidStat: "Dexterity" },
  { id: 30, name: "Pendulum Scythe", tier: 1, type: "Sharp", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 31, name: "Flame Jet", tier: 2, type: "Sharp", damageType: "Fire", avoidStat: "Dexterity" },
  { id: 32, name: "Piercing Ice Darts", tier: 2, type: "Sharp", damageType: "Ice", avoidStat: "Vitality" },
  { id: 33, name: "Glass Sand Storm", tier: 2, type: "Sharp", damageType: "Physical", avoidStat: "Strength" },
  { id: 34, name: "Poisoned Dart Wall", tier: 2, type: "Sharp", damageType: "Poison", avoidStat: "Dexterity" },
  { id: 35, name: "Spinning Blade Wheel", tier: 2, type: "Sharp", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 36, name: "Poison Dart", tier: 3, type: "Sharp", damageType: "Poison", avoidStat: "Dexterity" },
  { id: 37, name: "Spiked Tumbleweed", tier: 3, type: "Sharp", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 38, name: "Thunderbolt", tier: 3, type: "Sharp", damageType: "Lightning", avoidStat: "Intelligence" },
  { id: 39, name: "Giant Bear Trap", tier: 3, type: "Sharp", damageType: "Physical", avoidStat: "Wisdom" },
  { id: 40, name: "Steel Needle Rain", tier: 3, type: "Sharp", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 41, name: "Spiked Pit", tier: 4, type: "Sharp", damageType: "Physical", avoidStat: "Wisdom" },
  { id: 42, name: "Diamond Dust Storm", tier: 4, type: "Sharp", damageType: "Ice", avoidStat: "Vitality" },
  { id: 43, name: "Trapdoor Scorpion Pit", tier: 4, type: "Sharp", damageType: "Poison", avoidStat: "Wisdom" },
  { id: 44, name: "Bladed Fan", tier: 4, type: "Sharp", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 45, name: "Bear Trap", tier: 4, type: "Sharp", damageType: "Physical", avoidStat: "Wisdom" },
  { id: 46, name: "Porcupine Quill", tier: 5, type: "Sharp", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 47, name: "Hidden Arrow", tier: 5, type: "Sharp", damageType: "Physical", avoidStat: "Wisdom" },
  { id: 48, name: "Glass Shard", tier: 5, type: "Sharp", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 49, name: "Thorn Bush", tier: 5, type: "Sharp", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 50, name: "Jagged Rocks", tier: 5, type: "Sharp", damageType: "Physical", avoidStat: "Vitality" },
  
  // Crushing Obstacles
  { id: 51, name: "Collapsing Ceiling", tier: 1, type: "Crushing", damageType: "Physical", avoidStat: "Strength" },
  { id: 52, name: "Rockslide", tier: 1, type: "Crushing", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 53, name: "Flash Flood", tier: 1, type: "Crushing", damageType: "Physical", avoidStat: "Strength" },
  { id: 54, name: "Clinging Roots", tier: 1, type: "Crushing", damageType: "Physical", avoidStat: "Strength" },
  { id: 55, name: "Collapsing Cavern", tier: 1, type: "Crushing", damageType: "Physical", avoidStat: "Wisdom" },
  { id: 56, name: "Crushing Walls", tier: 2, type: "Crushing", damageType: "Physical", avoidStat: "Strength" },
  { id: 57, name: "Smashing Pillars", tier: 2, type: "Crushing", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 58, name: "Rumbling Catacomb", tier: 2, type: "Crushing", damageType: "Physical", avoidStat: "Wisdom" },
  { id: 59, name: "Whirling Cyclone", tier: 2, type: "Crushing", damageType: "Physical", avoidStat: "Strength" },
  { id: 60, name: "Erupting Earth", tier: 2, type: "Crushing", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 61, name: "Subterranean Tremor", tier: 3, type: "Crushing", damageType: "Physical", avoidStat: "Vitality" },
  { id: 62, name: "Falling Chandelier", tier: 3, type: "Crushing", damageType: "Physical", avoidStat: "Wisdom" },
  { id: 63, name: "Collapsing Bridge", tier: 3, type: "Crushing", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 64, name: "Raging Sandstorm", tier: 3, type: "Crushing", damageType: "Physical", avoidStat: "Vitality" },
  { id: 65, name: "Avalanching Rocks", tier: 3, type: "Crushing", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 66, name: "Tumbling Boulders", tier: 4, type: "Crushing", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 67, name: "Slamming Iron Gate", tier: 4, type: "Crushing", damageType: "Physical", avoidStat: "Strength" },
  { id: 68, name: "Shifting Sandtrap", tier: 4, type: "Crushing", damageType: "Physical", avoidStat: "Strength" },
  { id: 69, name: "Erupting Mud Geyser", tier: 4, type: "Crushing", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 70, name: "Crumbling Staircase", tier: 4, type: "Crushing", damageType: "Physical", avoidStat: "Wisdom" },
  { id: 71, name: "Swinging Logs", tier: 5, type: "Crushing", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 72, name: "Unstable Cliff", tier: 5, type: "Crushing", damageType: "Physical", avoidStat: "Wisdom" },
  { id: 73, name: "Toppling Statue", tier: 5, type: "Crushing", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 74, name: "Tumbling Barrels", tier: 5, type: "Crushing", damageType: "Physical", avoidStat: "Dexterity" },
  { id: 75, name: "Rolling Boulder", tier: 5, type: "Crushing", damageType: "Physical", avoidStat: "Dexterity" },
];

// Item type and slot mappings
export const ITEM_TYPES = {
  Weapon: ["Blade", "Bludgeon", "Magic"],
  Armor: ["Metal", "Leather", "Cloth"],
  Jewelry: ["Ring", "Neck"],
};

export const ITEM_SLOTS = ["Weapon", "Chest", "Head", "Waist", "Foot", "Hand", "Neck", "Ring"];

// Beast settings
export const BEAST_SETTINGS = {
  STARTER_BEAST_HEALTH: 3,
  MAXIMUM_HEALTH: 1023,
  MINIMUM_XP_REWARD: 4,
  CRITICAL_HIT_LEVEL_MULTIPLIER: 1,
  CRITICAL_HIT_AMBUSH_MULTIPLIER: 1,
  BEAST_SPECIAL_NAME_LEVEL_UNLOCK: 19,
  GOLD_MULTIPLIER: {
    T1: 5,
    T2: 4,
    T3: 3,
    T4: 2,
    T5: 1,
  },
  GOLD_REWARD_DIVISOR: 2,
};

// Obstacle settings
export const OBSTACLE_SETTINGS = {
  MINIMUM_DAMAGE: 2,
  DAMAGE_BOOST: 0,
  MINIMUM_XP_REWARD: 4,
};

// Combat formulas
export function calculateBeastHealth(tier: number, level: number): number {
  const baseTierHealth = tier === 1 ? 20 : tier === 2 ? 30 : tier === 3 ? 40 : tier === 4 ? 50 : 60;
  return Math.min(baseTierHealth + (level * 2), BEAST_SETTINGS.MAXIMUM_HEALTH);
}

export function calculateBeastGoldReward(tier: number, level: number): number {
  const multiplier = BEAST_SETTINGS.GOLD_MULTIPLIER[`T${tier}` as keyof typeof BEAST_SETTINGS.GOLD_MULTIPLIER];
  return Math.floor((multiplier * level) / BEAST_SETTINGS.GOLD_REWARD_DIVISOR);
}

export function calculateObstacleDamage(tier: number, level: number): number {
  const baseDamage = OBSTACLE_SETTINGS.MINIMUM_DAMAGE + OBSTACLE_SETTINGS.DAMAGE_BOOST;
  const tierMultiplier = 6 - tier; // T1=5x, T2=4x, T3=3x, T4=2x, T5=1x
  return baseDamage + (tierMultiplier * Math.floor(level / 5));
}