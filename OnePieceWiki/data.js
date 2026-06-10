/* ============================================================
 GRAND LINE ARCHIVE — DATA FILE ============================================================
 Edit THIS file to reshape the entire site.
 index.html never needs to change.

 SCHEMA
 ------
 window.WIKI_DATA = { site: { title: string (hero title, letter-animated)
 tagline: string (italic line under title)
 badge: string (small mono label above title)
 footer: string (footer credit line)
 }, groups: [ (each group = one section on the page)
 { id: string (unique, no spaces)
 title: string (section heading)
 tagline: string (small label next to heading)
 characters: [ Character, ... ]
 } ], fruits: [ Fruit, ... ]
 }
 
 Character = {
 id: unique string
 name: display name
 hue: 0-360, drives the crest/theme color of the card
 initials: 1-2 chars shown inside the medallion crest
 role: small caps tag on card front
 epithet: italic nickname
 affiliation: shown in dossier
 devil_fruit: string or 'None'
 bounty: number or null (null shows "UNDISCLOSED")
 status: 'wanted' | 'marine' | 'royal' | 'warlord' | 'rogue'
 (controls the wanted-poster stamp)
 abilities: [strings]
 feats: [strings]
 stats: { Strength, Speed, Durability, Skill, Intelligence } 0-100
 }
 
 Fruit = {
 name, type ('Paramecia'|'Logia'|'Zoan'), user, hue (orb color), description
 }

 TO ADD A NEW SAGA (example, uncomment and fill in):
 ---------------------------------------------------
 // { // id: 'skypiea', // title: 'Skypiea Saga', // tagline: 'ISLAND IN THE SKY', // characters: [ // { id:'enel', name:'Enel', hue:50, initials:'E', role:'GOD', // epithet:'God of Skypiea', affiliation:'Skypiea', // devil_fruit:'Goro Goro no Mi', bounty:null, status:'rogue', // abilities:['Logia; lightning.'], feats:['Ruled Upper Yard.'], // stats:{Strength:85,Speed:95,Durability:70,Skill:90,Intelligence:80} } // ] // }

 /* ============================================================
 UPGRADE INSTRUCTIONS — HOW TO ADVANCE THIS ARCHIVE
 ============================================================
 To upgrade this file to the next story arc, follow this protocol exactly:

 1. UPDATE SITE META
 - Change `site.badge` to the new LOG POSE destination
 (e.g., "ALABASTA → JAYA → SKYPIEA ⊹").
 - Update `site.tagline` and `site.footer` if needed.

 2. UPDATE CHARACTERS
 - The 'crew' group stays. Adjust stats/abilities/feats so
 they reflect the Straw Hats' state AT THE START of the
 new saga.
 - Add a new group object for the upcoming saga using the
 same schema: id, title, tagline, characters[].
 - Remove groups for completed arcs ONLY if the archive
 is meant to roll forward. Otherwise, keep history and
 append.

 3. UPDATE FRUITS
 - Keep entries for Devil Fruits still relevant.
 - Add new Fruit objects for powers revealed in the
 upcoming saga.
 - Remove entries whose users are no longer featured.

 4. SCHEMA REMAINS UNCHANGED
 Do NOT add new top-level keys. Only modify data values.

 NEXT TARGET EXAMPLES:
 - Water 7 / Enies Lobby
 - Thriller Bark
 - Sabaody Archipelago
 - Marineford
 ============================================================ */

 window.WIKI_DATA = {
  site: {
   title: "GRAND LINE ARCHIVE",
   tagline: "Records of pirates, marines & cursed fruits — chronicled to Skypiea (Ep. 144–195)",
   badge: "⊹ LOG POSE SET · ALABASTA → JAYA → SKYPIEA ⊹",
   footer: "Grand Line Archive · © Libertas 🕊️ · All rights reserved"
  },
  groups: [
   {
    id: 'crew',
    title: 'The Straw Hat Crew',
    tagline: 'MAIN CREW · THE GOING MERRY',
    characters: [
     { id:'luffy', name:'Monkey D. Luffy', hue:355, initials:'L', role:'CAPTAIN', epithet:'Straw Hat Luffy', affiliation:'Straw Hat Pirates (Captain)', devil_fruit:'Gomu Gomu no Mi (Rubber Human)', bounty:100000000, status:'wanted', abilities:['Body made of rubber: Immune to blunt attacks (bullets, punches), electricity (mostly).','Can stretch limbs for attacks like Gomu Gomu no Pistol, Bazooka, Gatling, Rocket.','High tolerance for pain and immense willpower.','Learned to use the Impact Dial to counter lightning-based attacks.'], feats:['Defeated Alvida, Captain Morgan, Buggy the Clown, Captain Kuro, Don Krieg, Arlong.','Defeated Wapol on Drum Island.','Infiltrated Whiskey Peak.','Survived encounter with Mr. 3 on Little Garden.','Declared war on the World Government at Alabasta.','Conquered the island of Skypiea and defeated the god Enel, ringing the Golden Bell.'], stats:{Strength:90,Speed:70,Durability:95,Skill:70,Intelligence:35} },
     { id:'zoro', name:'Roronoa Zoro', hue:140, initials:'Z', role:'SWORDSMAN', epithet:'Pirate Hunter Zoro', affiliation:'Straw Hat Pirates (Swordsman)', devil_fruit:'None', bounty:60000000, status:'wanted', abilities:['Master of Santoryu (Three Sword Style).','Incredible strength, endurance, and tolerance for pain.','Known techniques: Oni Giri, Tora Gari, Santoryu Ogi: Sanzen Sekai (briefly shown vs Mihawk).','Poor sense of direction.'], feats:['Defeated Captain Morgan, Cabaji, Nyaban Brothers (Siam & Buchi), Hatchan.','Survived a devastating blow from Dracule Mihawk.','Defeated Mr. 5 (Baroque Works Officer).','Defeated numerous Baroque Works Millions/Billions.','Learned to cut steel (vs Mr. 1 Daz Bonez around ep 118, but foundations laid earlier).','Battled Ohm in Upper Yard and earned a bitter draw via exhaustion.'], stats:{Strength:88,Speed:72,Durability:88,Skill:92,Intelligence:45} },
     { id:'nami', name:'Nami', hue:28, initials:'N', role:'NAVIGATOR', epithet:'Cat Burglar Nami', affiliation:'Straw Hat Pirates (Navigator)', devil_fruit:'None', bounty:16000000, status:'wanted', abilities:['Exceptional Navigator and Cartographer, can sense weather changes.','Skilled thief and pickpocket.','Uses a three-section Bo Staff and the Clima-Tact for self-defense and combat.','High intelligence and cunning.'], feats:['Stole treasure from Buggy.','Tricked and robbed various pirates.','Created maps of areas visited.','Successfully navigated the Straw Hats through treacherous waters.','Fought Miss Valentine alongside Vivi at Whiskey Peak.','Navigated the White Sea and Upper Yard and countered Enel\'s thunder with Clima-Tact.'], stats:{Strength:30,Speed:55,Durability:40,Skill:65,Intelligence:96} },
     { id:'usopp', name:'Usopp', hue:48, initials:'U', role:'SNIPER', epithet:'"God" Usopp (Self-proclaimed)', affiliation:'Straw Hat Pirates (Sniper)', devil_fruit:'None', bounty:null, status:'wanted', abilities:['Incredibly skilled Sniper/Marksman, uses a slingshot (Kabuto) with various ammo (lead stars, rotten eggs, smoke stars, explosive stars - Kayaku Boshi).','Compulsive liar, tells tall tales.','Inventive, creates gadgets and weapons (like Clima-Tact for Nami).','Surprisingly fast runner when scared.'], feats:['Defended Kaya and Syrup Village (defeated Jango partially, Chu).','Helped Nami defeat Miss Valentine.','Fought Mr. 5 & Miss Valentine team with Karoo on Little Garden.','Created Nami\'s Clima-Tact.','Headed a small crew during the Skypiea trials against Enel\'s priests.'], stats:{Strength:35,Speed:65,Durability:45,Skill:88,Intelligence:75} },
     { id:'sanji', name:'Sanji', hue:210, initials:'S', role:'COOK', epithet:'Black Leg Sanji', affiliation:'Straw Hat Pirates (Cook)', devil_fruit:'None', bounty:null, status:'wanted', abilities:['Master of the "Black Leg Style", fighting only with powerful kicks.','Superb Chef, knowledgeable about ingredients.','Keen intellect, often perceptive and strategic.','Strong sense of chivalry, refuses to harm women.','Known techniques: Collier, Épaule, Côtelette, Selle, Poitrine, Gigot, Mouton Shot.'], feats:['Defeated Pearl and fought Don Krieg at the Baratie.','Defeated Kuroobi of the Arlong Pirates.','Dealt with Baroque Works agents at Whiskey Peak.','Adopted "Mr. Prince" alias, outsmarted Crocodile temporarily at Rainbase.','Fought Enel\'s guards and protected his crewmates on the Ark Maxim.'], stats:{Strength:78,Speed:82,Durability:72,Skill:82,Intelligence:78} },
     { id:'chopper', name:'Tony Tony Chopper', hue:330, initials:'C', role:'DOCTOR', epithet:'Cotton Candy Lover Chopper', affiliation:'Straw Hat Pirates (Doctor)', devil_fruit:'Hito Hito no Mi (Human-Human Fruit)', bounty:null, status:'wanted', abilities:['Zoan Devil Fruit user; reindeer who ate the Human-Human fruit.','Can transform between Walk Point (reindeer), Brain Point (small hybrid), Heavy Point (humanoid).','Developed and used Rumble Ball drug to access additional transformations.','Skilled Doctor who healed crewmates throughout the voyage.'], feats:['Assisted in defeating Wapol and his subordinates.',"Treated Nami's illness on Drum Island.",'Joined the Straw Hat Pirates.','Began using Rumble Ball transformations.','Healed the crew of electricity burns following the Enel battle.'], stats:{Strength:72,Speed:65,Durability:68,Skill:82,Intelligence:88} },
     { id:'robin', name:'Miss All Sunday (Nico Robin)', hue:280, initials:'R', role:'SCHOLAR', epithet:'Miss All Sunday (former)', affiliation:'Straw Hat Pirates (Archeologist)', devil_fruit:'Hana Hana no Mi (Flower-Flower Fruit)', bounty:null, status:'wanted', abilities:['Paramecia; can replicate and sprout parts of her body from any surface, especially arms and eyes.','Can use sprouted limbs to restrain (Clutch), attack (Slap), or observe.','Highly intelligent, reads Poneglyphs secretly.','Calm and enigmatic demeanor.'], feats:['Appeared before the Straw Hats after Whiskey Peak.','Gave the Straw Hats an Eternal Pose to a safer island (destroyed by Luffy).','Met the Straw Hats again in Alabasta (Rainbase).','Saved Luffy from drowning in quicksand near Rainbase.','Officially joined the Straw Hat Pirates.',"Read the Poneglyph near the Bell of Proud on Skypiea. ","Fought against Enel's guards and protected the crew."], stats:{Strength:45,Speed:55,Durability:55,Skill:92,Intelligence:99} }
    ]
   },
   {
    id: 'eastblue',
    title: 'East Blue & Loguetown',
    tagline: 'WHERE THE VOYAGE BEGAN',
    characters: [
     { id:'buggy', name:'Buggy', hue:0, initials:'B', role:'PIRATE CAPTAIN', epithet:'Buggy the Clown', affiliation:'Buggy Pirates (Captain)', devil_fruit:'Bara Bara no Mi (Chop-Chop Fruit)', bounty:15000000, status:'wanted', abilities:['Paramecia; can split his body into pieces and control them levitating (feet must stay grounded or nearby).','Immune to slashing/cutting attacks.','Uses knives and "Buggy Balls" (powerful cannonballs).'], feats:['Terrorized Orange Town.','Fought Luffy (lost).',"Escaped capture in Loguetown (with Alvida's help).",'Briefly encountered Ace in Alabasta (searching for Luffy).'], stats:{Strength:40,Speed:30,Durability:30,Skill:50,Intelligence:45} },
     { id:'alvida', name:'Alvida', hue:300, initials:'A', role:'PIRATE', epithet:'"Iron Mace" Alvida', affiliation:'Alvida Pirates (former Captain), Buggy and Alvida Alliance', devil_fruit:'Sube Sube no Mi (Slip-Slip Fruit)', bounty:5000000, status:'wanted', abilities:['Paramecia; makes her body extremely slippery.','Attacks and objects slide off her skin.','Transformed her appearance.','Can "skate" on surfaces.','Carries iron mace.'], feats:['First antagonist Luffy defeated (pre-fruit).','Tracked Luffy to Loguetown.','Allied with Buggy.','Helped Buggy escape Smoker in Loguetown.'], stats:{Strength:35,Speed:60,Durability:75,Skill:30,Intelligence:40} },
     { id:'smoker', name:'Smoker', hue:200, initials:'SM', role:'MARINE', epithet:'"White Chase" Smoker', affiliation:'Marines (Captain, Loguetown Base → pursuing Straw Hats)', devil_fruit:'Moku Moku no Mi (Plume-Plume Fruit)', bounty:null, status:'marine', abilities:['Logia; can create, control, and turn into smoke.','Intangible against most non-elemental/Sea Prism Stone attacks.','Can capture opponents with smoke (White Out).','Uses a large Jitte tipped with Sea Prism Stone (Kairoseki).'], feats:['Easily captured Buggy and Alvida (temporarily).','Cornered and almost captured Luffy multiple times in Loguetown.','Followed the Straw Hats into the Grand Line.','Fought Portgas D. Ace briefly in Nanohana, Alabasta.'], stats:{Strength:75,Speed:70,Durability:80,Skill:80,Intelligence:70} }
    ]
   },
   {
    id: 'drum',
    title: 'Drum Island',
    tagline: 'THE WINTER KINGDOM',
    characters: [
     { id:'wapol', name:'Wapol', hue:265, initials:'W', role:'TYRANT', epithet:'Tin-Plate Wapol', affiliation:'Former King of Drum Kingdom', devil_fruit:'Baku Baku no Mi (Munch-Munch Fruit)', bounty:null, status:'rogue', abilities:['Paramecia; can eat anything (wood, metal, cannons, people).','Can merge consumed objects into his body or create new things (Wapol House, Baku Baku Factory).','Wide, metal-reinforced jaw.'], feats:['Tyrannical ruler of Drum Island.','Ate his subordinates Chess and Kuromarimo to combine into Chessmarimo.','Fought Luffy and Chopper (lost).'], stats:{Strength:55,Speed:20,Durability:60,Skill:40,Intelligence:35} },
     { id:'dalton', name:'Dalton', hue:90, initials:'D', role:'GUARDIAN', epithet:'None prominent', affiliation:'Former Royal Guard of Drum, Leader of Sakura Kingdom (post-Wapol)', devil_fruit:'Ushi Ushi no Mi, Model: Bison', bounty:null, status:'royal', abilities:['Zoan; can transform into a full bison or a bison-human hybrid.','Increased strength, speed, and durability in transformations.','Uses a large spade-like blade.','Strong sense of justice.'], feats:['Protected Dr. Kureha from Wapol.',"Fought against Wapol's forces.",'Became the respected leader of the renamed Sakura Kingdom.'], stats:{Strength:70,Speed:65,Durability:70,Skill:60,Intelligence:60} }
    ]
   },
   {
    id: 'alabasta',
    title: 'Alabasta & Baroque Works',
    tagline: 'THE DESERT CONSPIRACY',
    characters: [
     { id:'ace', name:'Portgas D. Ace', hue:18, initials:'A', role:'COMMANDER', epithet:'"Fire Fist" Ace', affiliation:'Whitebeard Pirates (2nd Division Commander)', devil_fruit:'Mera Mera no Mi (Flame-Flame Fruit)', bounty:null, status:'wanted', abilities:['Logia; can create, control, and turn into fire.','Intangible against most physical attacks.','Extremely powerful fire attacks (Hiken - Fire Fist, Higan - Fire Gun).','Physically strong.'], feats:['Introduced searching for Blackbeard.','Briefly clashed with Smoker, cancelling his smoke with fire.','Showed brotherly connection to Luffy.','Destroyed several Baroque Works ships easily.',"Offered Luffy a place on Whitebeard's crew (declined)."], stats:{Strength:85,Speed:85,Durability:85,Skill:90,Intelligence:75} },
     { id:'mr5', name:'Mr. 5', hue:35, initials:'5', role:'AGENT', epithet:'None prominent', affiliation:'Baroque Works (Officer Agent)', devil_fruit:'Bomu Bomu no Mi (Bomb-Bomb Fruit)', bounty:null, status:'wanted', abilities:['Paramecia; makes his entire body and its excretions explosive.','Can flick explosive boogers (Nose Fancy Cannon).','His breath is explosive (Breeze Breath Bomb).','Immune to explosions.','Uses a flintlock revolver.'], feats:['Tasked with eliminating Princess Vivi.','Fought Luffy and Zoro at Whiskey Peak and Little Garden (lost).'], stats:{Strength:50,Speed:40,Durability:65,Skill:45,Intelligence:40} },
     { id:'missvalentine', name:'Miss Valentine', hue:55, initials:'V', role:'AGENT', epithet:'None prominent', affiliation:'Baroque Works (Officer Agent)', devil_fruit:'Kilo Kilo no Mi (Kilo-Kilo Fruit)', bounty:null, status:'wanted', abilities:['Paramecia; can freely change her body weight from 1 kilogram to 10,000 kilograms.','Uses low weight to float with her umbrella, then drastically increases weight to crush opponents (10,000 Kilo Press).'], feats:['Partnered with Mr. 5.','Fought Nami and Vivi at Whiskey Peak, later Usopp and Nami at Little Garden (lost).'], stats:{Strength:25,Speed:30,Durability:35,Skill:55,Intelligence:45} },
     { id:'mr3', name:'Mr. 3 (Galdino)', hue:170, initials:'3', role:'AGENT', epithet:'The Strategist (Self-proclaimed)', affiliation:'Baroque Works (Officer Agent)', devil_fruit:'Doru Doru no Mi (Wax-Wax Fruit)', bounty:null, status:'wanted', abilities:['Paramecia; can produce and manipulate candle wax from his body.','Wax hardens quickly into steel-like strength.','Can create wax clones (Candle Champion), restraints, keys, structures (Giant Wax Service Set).','Wax can be ignited.','Wax is vulnerable to heat/fire.'], feats:['Received orders directly from Crocodile.','Captured Zoro, Nami, Vivi, and Brogy the giant in a wax structure.','Fought Luffy, Usopp, and Karoo (lost).','Encountered Straw Hats again in Alabasta.'], stats:{Strength:30,Speed:30,Durability:40,Skill:75,Intelligence:70} },
     { id:'robin', name:'Miss All Sunday (Nico Robin)', hue:280, initials:'R', role:'VICE PRESIDENT', epithet:'Miss All Sunday', affiliation:'Baroque Works (Vice President)', devil_fruit:'Hana Hana no Mi (Flower-Flower Fruit)', bounty:null, status:'wanted', abilities:['Paramecia; can replicate and sprout parts of her body (especially arms, hands, eyes) from any surface, including other people.','Can use sprouted limbs to restrain (Clutch), attack (Slap), or observe (sprouting eyes/ears).','Highly intelligent, reads Poneglyphs (secretly).','Calm and enigmatic demeanor.'], feats:['Appeared before the Straw Hats after Whiskey Peak.','Gave the Straw Hats an Eternal Pose to a safer island (destroyed by Luffy).','Met the Straw Hats again in Alabasta (Rainbase).','Saved Luffy from drowning in quicksand near Rainbase (around ep 110).','Interacted with Crocodile, showing complex relationship.'], stats:{Strength:40,Speed:50,Durability:50,Skill:90,Intelligence:98} },
     { id:'crocodile', name:'Sir Crocodile', hue:42, initials:'☠', role:'WARLORD', epithet:'Mr. 0', affiliation:'One of the Seven Warlords of the Sea (Shichibukai), Baroque Works (President)', devil_fruit:'Suna Suna no Mi (Sand-Sand Fruit)', bounty:81000000, status:'warlord', abilities:['Logia; can create, control, and turn into sand.','Intangible against most attacks unless moisture/liquid is involved.','Can absorb moisture from anything with his right hand (Desert Spada).','Can create sandstorms (Sables), quicksand pits.','Large golden hook on his left hand (poisonous - revealed later).','Highly intelligent and manipulative strategist.'], feats:['Secretly orchestrated the Alabasta civil war.','Leader of the powerful Baroque Works organization.','Recognized as one of the Shichibukai.','Defeated Luffy easily in their first encounter by dehydrating him (around ep 110).'], stats:{Strength:80,Speed:75,Durability:90,Skill:95,Intelligence:95} },
     { id:'vivi', name:'Nefertari Vivi', hue:190, initials:'V', role:'PRINCESS', epithet:'Miss Wednesday (former)', affiliation:'Princess of Alabasta Kingdom, Straw Hat Pirates (temporary)', devil_fruit:'None', bounty:null, status:'royal', abilities:['Uses Peacock Slashers (Kujakki Slashers) - small blades attached to strings on her fingers.','Highly dedicated to her country and people.','Brave and determined.','Rides Karoo, her Super Spot-Billed Duck companion.'], feats:['Infiltrated Baroque Works as Miss Wednesday.','Traveled with the Straw Hats towards Alabasta.','Attempted to stop the civil war.','Fought alongside Straw Hats against Baroque Works agents.'], stats:{Strength:25,Speed:40,Durability:35,Skill:50,Intelligence:70} }
    ]
   },
   {
    id: 'skypiea',
    title: 'Skypiea & Upper Yard',
    tagline: 'ISLAND IN THE SKY',
    characters: [
     { id:'enel', name:'Enel', hue:50, initials:'E', role:'GOD', epithet:'God of Skypiea', affiliation:'Skypiea', devil_fruit:'Goro Goro no Mi (Rumble-Rumble Fruit)', bounty:null, status:'rogue', abilities:['Logia; can create, control, and turn into lightning, granting flight and intangibility.','Produces massive bursts of electricity (El Thor / Raigo).','Can observe the island through electrical networks.','His lightning is lethal to most unless countered by rubber, Impact Dials, or Sea Prism Stone.'], feats:['Ruled the entire Skypiea civilization with absolute divine authority.','Defeated the Shandia warriors with overwhelming power.','Nearly killed Luffy until Luffy landed chance hits with a rejected Impact Dial.','Launched into the sea after Luffy deflected his own Raigo back into his face.'], stats:{Strength:88,Speed:92,Durability:85,Skill:95,Intelligence:92} },
     { id:'wiper', name:'Wiper', hue:0, initials:'W', role:'WARRIOR', epithet:'Shandia\'s Vengeance', affiliation:'Shandia', devil_fruit:'None', bounty:null, status:'royal', abilities:['Master hand-to-hand combatant and swordsman wielding the Burn Blade.','Burn Blade contains a Flame Dial, allowing him to cut steel and cauterize wounds.','Possesses superhuman strength and pain tolerance.','Driven by inherited vengeance against Enel.'], feats:['Led the Shandia raid on Upper Yard to reclaim their homeland.','Fought against the four Priests of Upper Yard.','Nearly destroyed Enel\'s Ark Maxim with a Reject Dial blow.'], stats:{Strength:80,Speed:90,Durability:70,Skill:88,Intelligence:55} },
     { id:'ganfall', name:'Gan Fall', hue:100, initials:'GF', role:'KNIGHT', epithet:'Former God of Skypiea', affiliation:'Skypiea (exiled)', devil_fruit:'None', bounty:null, status:'royal', abilities:['Skilled swordsman and aerial combatant.','Rides the winged mount Shiro Momonga (White Jackal).','Highly resilient and strategic thinker.','Protected Angel Island during Enel\'s purge.'], feats:['Fought as the former God of Skypiea before Enel\'s takeover.','Allied with the Straw Hats upon their arrival.','Helped navigate the White Sea and Upper Yard.'], stats:{Strength:75,Speed:70,Durability:70,Skill:85,Intelligence:65} },
     { id:'aisa', name:'Aisa', hue:300, initials:'A', role:'PROPHETESS', epithet:'Shandia Oracle', affiliation:'Shandia', devil_fruit:'None', bounty:null, status:'royal', abilities:['Possesses Observation Haki (Mantra), sensing presences across great distances.','Carries a ring equipped with Impact Dials for defense.','Spiritually connected to her ancestors.','Calm and perceptive despite her youth.'], feats:['Guided the Straw Hats through the Skypiea trials.','Foresaw Enel\'s destructive plans.','Helped awaken the giants\' will in the final battle.'], stats:{Strength:20,Speed:50,Durability:30,Skill:40,Intelligence:70} },
     { id:'ohm', name:'Ohm', hue:30, initials:'O', role:'PRIEST', epithet:'Green Mantra', affiliation:'Enel\'s Guards', devil_fruit:'None', bounty:null, status:'rogue', abilities:['Wields a massive iron staff with lethal force.','Possesses Mantra for close-quarters prediction.','Can manipulate the jungle rain systems via Earth Dials.','Immense physical strength and reach.'], feats:['Guarded the vestibule of Upper Yard for centuries.','Battled Zoro to a near standstill before falling.','Controlled the environmental traps of the jungle.'], stats:{Strength:85,Speed:60,Durability:80,Skill:90,Intelligence:70} },
     { id:'shura', name:'Shura', hue:120, initials:'SH', role:'PRIEST', epithet:'Forest\'s Scythe', affiliation:'Enel\'s Guards', devil_fruit:'None', bounty:null, status:'rogue', abilities:['Master dual-wielder of the huge linked "Heavenly Pendulum" blades.','Exceptional aerial mobility with a winged mount.','Deadly precise Mantra perception.','Master of jungle ambush tactics.'], feats:['Patrolled the forest of Upper Yard.','Fought Usopp, Nami, and Chopper in trios.','Nearly eliminated intruders with razor-sharp traps.'], stats:{Strength:78,Speed:82,Durability:70,Skill:88,Intelligence:72} }
    ]
   }
  ],
  fruits: [
   { name:'Gomu Gomu no Mi', type:'Paramecia', user:'Monkey D. Luffy', hue:355, description:"Grants the user's body the properties of rubber, allowing stretching and immunity to blunt force and electricity." },
   { name:'Bara Bara no Mi', type:'Paramecia', user:'Buggy', hue:0, description:'Allows the user to split their body into pieces and control them independently (except feet). Grants immunity to cutting/slashing attacks.' },
   { name:'Sube Sube no Mi', type:'Paramecia', user:'Alvida', hue:300, description:"Makes the user's body extremely slippery, causing attacks and objects to slide off. Also caused a significant change in the user's appearance." },
   { name:'Hito Hito no Mi', type:'Zoan', user:'Tony Tony Chopper', hue:330, description:'Allows an animal who eats it to gain human intelligence and the ability to transform into a human or human-hybrid form.' },
   { name:'Hana Hana no Mi', type:'Paramecia', user:'Miss All Sunday (Nico Robin)', hue:280, description:'Allows the user to replicate and sprout parts of their body (like arms, eyes) from any surface.' },
   { name:'Goro Goro no Mi', type:'Logia', user:'Enel', hue:50, description:'Allows the user to create, control, and transform into lightning, granting intangibility and devastating electrical attacks.' }
  ]
 };