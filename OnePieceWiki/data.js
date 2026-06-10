/* ============================================================
   GRAND LINE ARCHIVE — DATA FILE
   ============================================================
   Edit THIS file to reshape the entire site. index.html never
   needs to change.

   SCHEMA
   ------
   window.WIKI_DATA = {
     site: {
       title:    string  (hero title, letter-animated)
       tagline:  string  (italic line under title)
       badge:    string  (small mono label above title)
       footer:   string  (footer credit line)
     },
     groups: [           (each group = one section on the page)
       {
         id:      string (unique, no spaces)
         title:   string (section heading)
         tagline: string (small label next to heading)
         characters: [ Character, ... ]
       }
     ],
     fruits: [ Fruit, ... ]
   }

   Character = {
     id:          unique string
     name:        display name
     hue:         0-360, drives the crest/theme color of the card
     initials:    1-2 chars shown inside the medallion crest
     role:        small caps tag on card front
     epithet:     italic nickname
     affiliation: shown in dossier
     devil_fruit: string or 'None'
     bounty:      number or null  (null shows "UNDISCLOSED")
     status:      'wanted' | 'marine' | 'royal' | 'warlord' | 'rogue'
                  (controls the wanted-poster stamp)
     abilities:   [strings]
     feats:       [strings]
     stats:       { Strength, Speed, Durability, Skill, Intelligence } 0-100
   }

   Fruit = {
     name, type ('Paramecia'|'Logia'|'Zoan'), user,
     hue (orb color), description
   }

   TO ADD A NEW SAGA (example, uncomment and fill in):
   ---------------------------------------------------
   // {
   //   id: 'skypiea',
   //   title: 'Skypiea Saga',
   //   tagline: 'ISLAND IN THE SKY',
   //   characters: [
   //     { id:'enel', name:'Enel', hue:50, initials:'E', role:'GOD',
   //       epithet:'God of Skypiea', affiliation:'Skypiea',
   //       devil_fruit:'Goro Goro no Mi', bounty:null, status:'rogue',
   //       abilities:['Logia; lightning.'], feats:['Ruled Upper Yard.'],
   //       stats:{Strength:85,Speed:95,Durability:70,Skill:90,Intelligence:80} }
   //   ]
   // }
   ============================================================ */

window.WIKI_DATA = {

  site: {
    title: "GRAND LINE ARCHIVE",
    tagline: "Records of pirates, marines & cursed fruits — chronicled to Episode 109",
    badge: "⊹ LOG POSE SET · EAST BLUE → ALABASTA ⊹",
    footer: "Grand Line Archive · © Libertas 🕊️ · All rights reserved"
  },

  groups: [

    {
      id: 'crew',
      title: 'The Straw Hat Crew',
      tagline: 'MAIN CREW · THE GOING MERRY',
      characters: [
        { id:'luffy', name:'Monkey D. Luffy', hue:355, initials:'L', role:'CAPTAIN', epithet:'Straw Hat Luffy', affiliation:'Straw Hat Pirates (Captain)', devil_fruit:'Gomu Gomu no Mi (Rubber Human)', bounty:30000000, status:'wanted',
          abilities:['Body made of rubber: Immune to blunt attacks (bullets, punches), electricity (mostly).','Can stretch limbs for attacks like Gomu Gomu no Pistol, Bazooka, Gatling, Rocket.','High tolerance for pain and immense willpower.'],
          feats:['Defeated Alvida, Captain Morgan, Buggy the Clown, Captain Kuro, Don Krieg, Arlong.','Defeated Wapol on Drum Island.','Infiltrated Whiskey Peak.','Survived encounter with Mr. 3 on Little Garden.','Declared war on Crocodile & began fight (around ep 110).'],
          stats:{Strength:80,Speed:65,Durability:90,Skill:60,Intelligence:30} },
        { id:'zoro', name:'Roronoa Zoro', hue:140, initials:'Z', role:'SWORDSMAN', epithet:'Pirate Hunter Zoro', affiliation:'Straw Hat Pirates (Swordsman)', devil_fruit:'None', bounty:null, status:'wanted',
          abilities:['Master of Santoryu (Three Sword Style).','Incredible strength, endurance, and tolerance for pain.','Known techniques: Oni Giri, Tora Gari, Santoryu Ogi: Sanzen Sekai (briefly shown vs Mihawk).','Poor sense of direction.'],
          feats:['Defeated Captain Morgan, Cabaji, Nyaban Brothers (Siam & Buchi), Hatchan.','Survived a devastating blow from Dracule Mihawk.','Defeated Mr. 5 (Baroque Works Officer).','Defeated numerous Baroque Works Millions/Billions.','Learned to cut steel (vs Mr. 1 Daz Bonez around ep 118, but foundations laid earlier).'],
          stats:{Strength:85,Speed:70,Durability:85,Skill:90,Intelligence:40} },
        { id:'nami', name:'Nami', hue:28, initials:'N', role:'NAVIGATOR', epithet:'Cat Burglar Nami', affiliation:'Straw Hat Pirates (Navigator)', devil_fruit:'None', bounty:null, status:'wanted',
          abilities:['Exceptional Navigator and Cartographer, can sense weather changes.','Skilled thief and pickpocket.','Uses a three-section Bo Staff for self-defense.','Acquired early version of Clima-Tact from Usopp (Alabasta arc, around ep 100+).','High intelligence and cunning.'],
          feats:['Stole treasure from Buggy.','Tricked and robbed various pirates.','Created maps of areas visited.','Successfully navigated the Straw Hats through treacherous waters.','Fought Miss Valentine alongside Vivi (Whiskey Peak).','Started learning to use the Clima-Tact (vs Miss Doublefinger happens later).'],
          stats:{Strength:30,Speed:50,Durability:40,Skill:60,Intelligence:95} },
        { id:'usopp', name:'Usopp', hue:48, initials:'U', role:'SNIPER', epithet:'"God" Usopp (Self-proclaimed)', affiliation:'Straw Hat Pirates (Sniper)', devil_fruit:'None', bounty:null, status:'wanted',
          abilities:['Incredibly skilled Sniper/Marksman, uses a slingshot (Kabuto) with various ammo (lead stars, rotten eggs, smoke stars, explosive stars - Kayaku Boshi).','Compulsive liar, tells tall tales.','Inventive, creates gadgets and weapons (like Clima-Tact for Nami).','Surprisingly fast runner when scared.'],
          feats:['Defended Kaya and Syrup Village (defeated Jango partially, Chu).','Helped Nami defeat Miss Valentine.','Fought Mr. 5 & Miss Valentine team with Karoo (Little Garden).',"Key shot against Mr. 3's wax structure (Little Garden).","Created Nami's Clima-Tact."],
          stats:{Strength:35,Speed:60,Durability:45,Skill:85,Intelligence:70} },
        { id:'sanji', name:'Sanji', hue:210, initials:'S', role:'COOK', epithet:'Black Leg Sanji', affiliation:'Straw Hat Pirates (Cook)', devil_fruit:'None', bounty:null, status:'wanted',
          abilities:['Master of the "Black Leg Style", fighting only with powerful kicks.','Superb Chef, knowledgeable about ingredients.','Keen intellect, often perceptive and strategic.','Strong sense of chivalry, refuses to harm women.','Known techniques: Collier, Épaule, Côtelette, Selle, Poitrine, Gigot, Mouton Shot.'],
          feats:['Defeated Pearl and fought Don Krieg at the Baratie.','Defeated Kuroobi of the Arlong Pirates.','Dealt with Baroque Works agents at Whiskey Peak.','Adopted "Mr. Prince" alias, outsmarted Crocodile temporarily at Rainbase (around ep 110).'],
          stats:{Strength:75,Speed:80,Durability:70,Skill:80,Intelligence:75} },
        { id:'chopper', name:'Tony Tony Chopper', hue:330, initials:'C', role:'DOCTOR', epithet:'Cotton Candy Lover Chopper', affiliation:'Straw Hat Pirates (Doctor)', devil_fruit:'Hito Hito no Mi (Human-Human Fruit)', bounty:null, status:'wanted',
          abilities:['Zoan Devil Fruit user; reindeer who ate the Human-Human fruit.','Can transform between Walk Point (reindeer), Brain Point (small hybrid), Heavy Point (humanoid).','Developed Rumble Ball drug to access additional transformations (Jumping, Arm, Guard, Horn Points - usage started, mastery developed later).','Skilled Doctor.','Can understand and talk to animals.'],
          feats:['Assisted in defeating Wapol and his subordinates.',"Treated Nami's illness on Drum Island.",'Joined the Straw Hat Pirates.','Began using Rumble Ball transformations in Alabasta.'],
          stats:{Strength:70,Speed:60,Durability:65,Skill:80,Intelligence:85} }
      ]
    },

    {
      id: 'eastblue',
      title: 'East Blue & Loguetown',
      tagline: 'WHERE THE VOYAGE BEGAN',
      characters: [
        { id:'buggy', name:'Buggy', hue:0, initials:'B', role:'PIRATE CAPTAIN', epithet:'Buggy the Clown', affiliation:'Buggy Pirates (Captain)', devil_fruit:'Bara Bara no Mi (Chop-Chop Fruit)', bounty:15000000, status:'wanted',
          abilities:['Paramecia; can split his body into pieces and control them levitating (feet must stay grounded or nearby).','Immune to slashing/cutting attacks.','Uses knives and "Buggy Balls" (powerful cannonballs).'],
          feats:['Terrorized Orange Town.','Fought Luffy (lost).',"Escaped capture in Loguetown (with Alvida's help).",'Briefly encountered Ace in Alabasta (searching for Luffy).'],
          stats:{Strength:40,Speed:30,Durability:30,Skill:50,Intelligence:45} },
        { id:'alvida', name:'Alvida', hue:300, initials:'A', role:'PIRATE', epithet:'"Iron Mace" Alvida', affiliation:'Alvida Pirates (former Captain), Buggy and Alvida Alliance', devil_fruit:'Sube Sube no Mi (Slip-Slip Fruit)', bounty:5000000, status:'wanted',
          abilities:['Paramecia; makes her body extremely slippery.','Attacks and objects slide off her skin.','Transformed her appearance.','Can "skate" on surfaces.','Carries iron mace.'],
          feats:['First antagonist Luffy defeated (pre-fruit).','Tracked Luffy to Loguetown.','Allied with Buggy.','Helped Buggy escape Smoker in Loguetown.'],
          stats:{Strength:35,Speed:60,Durability:75,Skill:30,Intelligence:40} },
        { id:'smoker', name:'Smoker', hue:200, initials:'SM', role:'MARINE', epithet:'"White Chase" Smoker', affiliation:'Marines (Captain, Loguetown Base → pursuing Straw Hats)', devil_fruit:'Moku Moku no Mi (Plume-Plume Fruit)', bounty:null, status:'marine',
          abilities:['Logia; can create, control, and turn into smoke.','Intangible against most non-elemental/Sea Prism Stone attacks.','Can capture opponents with smoke (White Out).','Uses a large Jitte tipped with Sea Prism Stone (Kairoseki).'],
          feats:['Easily captured Buggy and Alvida (temporarily).','Cornered and almost captured Luffy multiple times in Loguetown.','Followed the Straw Hats into the Grand Line.','Fought Portgas D. Ace briefly in Nanohana, Alabasta.'],
          stats:{Strength:75,Speed:70,Durability:80,Skill:80,Intelligence:70} }
      ]
    },

    {
      id: 'drum',
      title: 'Drum Island',
      tagline: 'THE WINTER KINGDOM',
      characters: [
        { id:'wapol', name:'Wapol', hue:265, initials:'W', role:'TYRANT', epithet:'Tin-Plate Wapol', affiliation:'Former King of Drum Kingdom', devil_fruit:'Baku Baku no Mi (Munch-Munch Fruit)', bounty:null, status:'rogue',
          abilities:['Paramecia; can eat anything (wood, metal, cannons, people).','Can merge consumed objects into his body or create new things (Wapol House, Baku Baku Factory).','Wide, metal-reinforced jaw.'],
          feats:['Tyrannical ruler of Drum Island.','Ate his subordinates Chess and Kuromarimo to combine into Chessmarimo.','Fought Luffy and Chopper (lost).'],
          stats:{Strength:55,Speed:20,Durability:60,Skill:40,Intelligence:35} },
        { id:'dalton', name:'Dalton', hue:90, initials:'D', role:'GUARDIAN', epithet:'None prominent', affiliation:'Former Royal Guard of Drum, Leader of Sakura Kingdom (post-Wapol)', devil_fruit:'Ushi Ushi no Mi, Model: Bison', bounty:null, status:'royal',
          abilities:['Zoan; can transform into a full bison or a bison-human hybrid.','Increased strength, speed, and durability in transformations.','Uses a large spade-like blade.','Strong sense of justice.'],
          feats:['Protected Dr. Kureha from Wapol.',"Fought against Wapol's forces.",'Became the respected leader of the renamed Sakura Kingdom.'],
          stats:{Strength:70,Speed:65,Durability:70,Skill:60,Intelligence:60} }
      ]
    },

    {
      id: 'alabasta',
      title: 'Alabasta & Baroque Works',
      tagline: 'THE DESERT CONSPIRACY',
      characters: [
        { id:'ace', name:'Portgas D. Ace', hue:18, initials:'A', role:'COMMANDER', epithet:'"Fire Fist" Ace', affiliation:'Whitebeard Pirates (2nd Division Commander)', devil_fruit:'Mera Mera no Mi (Flame-Flame Fruit)', bounty:null, status:'wanted',
          abilities:['Logia; can create, control, and turn into fire.','Intangible against most physical attacks.','Extremely powerful fire attacks (Hiken - Fire Fist, Higan - Fire Gun).','Physically strong.'],
          feats:['Introduced searching for Blackbeard.','Briefly clashed with Smoker, cancelling his smoke with fire.','Showed brotherly connection to Luffy.','Destroyed several Baroque Works ships easily.',"Offered Luffy a place on Whitebeard's crew (declined)."],
          stats:{Strength:85,Speed:85,Durability:85,Skill:90,Intelligence:75} },
        { id:'mr5', name:'Mr. 5', hue:35, initials:'5', role:'AGENT', epithet:'None prominent', affiliation:'Baroque Works (Officer Agent)', devil_fruit:'Bomu Bomu no Mi (Bomb-Bomb Fruit)', bounty:null, status:'wanted',
          abilities:['Paramecia; makes his entire body and its excretions explosive.','Can flick explosive boogers (Nose Fancy Cannon).','His breath is explosive (Breeze Breath Bomb).','Immune to explosions.','Uses a flintlock revolver.'],
          feats:['Tasked with eliminating Princess Vivi.','Fought Luffy and Zoro at Whiskey Peak and Little Garden (lost).'],
          stats:{Strength:50,Speed:40,Durability:65,Skill:45,Intelligence:40} },
        { id:'missvalentine', name:'Miss Valentine', hue:55, initials:'V', role:'AGENT', epithet:'None prominent', affiliation:'Baroque Works (Officer Agent)', devil_fruit:'Kilo Kilo no Mi (Kilo-Kilo Fruit)', bounty:null, status:'wanted',
          abilities:['Paramecia; can freely change her body weight from 1 kilogram to 10,000 kilograms.','Uses low weight to float with her umbrella, then drastically increases weight to crush opponents (10,000 Kilo Press).'],
          feats:['Partnered with Mr. 5.','Fought Nami and Vivi at Whiskey Peak, later Usopp and Nami at Little Garden (lost).'],
          stats:{Strength:25,Speed:30,Durability:35,Skill:55,Intelligence:45} },
        { id:'mr3', name:'Mr. 3 (Galdino)', hue:170, initials:'3', role:'AGENT', epithet:'The Strategist (Self-proclaimed)', affiliation:'Baroque Works (Officer Agent)', devil_fruit:'Doru Doru no Mi (Wax-Wax Fruit)', bounty:null, status:'wanted',
          abilities:['Paramecia; can produce and manipulate candle wax from his body.','Wax hardens quickly into steel-like strength.','Can create wax clones (Candle Champion), restraints, keys, structures (Giant Wax Service Set).','Wax can be ignited.','Wax is vulnerable to heat/fire.'],
          feats:['Received orders directly from Crocodile.','Captured Zoro, Nami, Vivi, and Brogy the giant in a wax structure.','Fought Luffy, Usopp, and Karoo (lost).','Encountered Straw Hats again in Alabasta.'],
          stats:{Strength:30,Speed:30,Durability:40,Skill:75,Intelligence:70} },
        { id:'robin', name:'Miss All Sunday (Nico Robin)', hue:280, initials:'R', role:'VICE PRESIDENT', epithet:'Miss All Sunday', affiliation:'Baroque Works (Vice President)', devil_fruit:'Hana Hana no Mi (Flower-Flower Fruit)', bounty:null, status:'wanted',
          abilities:['Paramecia; can replicate and sprout parts of her body (especially arms, hands, eyes) from any surface, including other people.','Can use sprouted limbs to restrain (Clutch), attack (Slap), or observe (sprouting eyes/ears).','Highly intelligent, reads Poneglyphs (secretly).','Calm and enigmatic demeanor.'],
          feats:['Appeared before the Straw Hats after Whiskey Peak.','Gave the Straw Hats an Eternal Pose to a safer island (destroyed by Luffy).','Met the Straw Hats again in Alabasta (Rainbase).','Saved Luffy from drowning in quicksand near Rainbase (around ep 110).','Interacted with Crocodile, showing complex relationship.'],
          stats:{Strength:40,Speed:50,Durability:50,Skill:90,Intelligence:98} },
        { id:'crocodile', name:'Sir Crocodile', hue:42, initials:'☠', role:'WARLORD', epithet:'Mr. 0', affiliation:'One of the Seven Warlords of the Sea (Shichibukai), Baroque Works (President)', devil_fruit:'Suna Suna no Mi (Sand-Sand Fruit)', bounty:81000000, status:'warlord',
          abilities:['Logia; can create, control, and turn into sand.','Intangible against most attacks unless moisture/liquid is involved.','Can absorb moisture from anything with his right hand (Desert Spada).','Can create sandstorms (Sables), quicksand pits.','Large golden hook on his left hand (poisonous - revealed later).','Highly intelligent and manipulative strategist.'],
          feats:['Secretly orchestrated the Alabasta civil war.','Leader of the powerful Baroque Works organization.','Recognized as one of the Shichibukai.','Defeated Luffy easily in their first encounter by dehydrating him (around ep 110).'],
          stats:{Strength:80,Speed:75,Durability:90,Skill:95,Intelligence:95} },
        { id:'vivi', name:'Nefertari Vivi', hue:190, initials:'V', role:'PRINCESS', epithet:'Miss Wednesday (former)', affiliation:'Princess of Alabasta Kingdom, Straw Hat Pirates (temporary)', devil_fruit:'None', bounty:null, status:'royal',
          abilities:['Uses Peacock Slashers (Kujakki Slashers) - small blades attached to strings on her fingers.','Highly dedicated to her country and people.','Brave and determined.','Rides Karoo, her Super Spot-Billed Duck companion.'],
          feats:['Infiltrated Baroque Works as Miss Wednesday.','Traveled with the Straw Hats towards Alabasta.','Attempted to stop the civil war.','Fought alongside Straw Hats against Baroque Works agents.'],
          stats:{Strength:25,Speed:40,Durability:35,Skill:50,Intelligence:70} }
      ]
    }

  ],

  fruits: [
    { name:'Gomu Gomu no Mi', type:'Paramecia', user:'Monkey D. Luffy', hue:355, description:"Grants the user's body the properties of rubber, allowing stretching and immunity to blunt force and electricity." },
    { name:'Bara Bara no Mi', type:'Paramecia', user:'Buggy', hue:0, description:'Allows the user to split their body into pieces and control them independently (except feet). Grants immunity to cutting/slashing attacks.' },
    { name:'Sube Sube no Mi', type:'Paramecia', user:'Alvida', hue:300, description:"Makes the user's body extremely slippery, causing attacks and objects to slide off. Also caused a significant change in the user's appearance." },
    { name:'Moku Moku no Mi', type:'Logia', user:'Smoker', hue:200, description:'Allows the user to create, control, and transform into smoke, granting intangibility against most non-Sea Prism Stone attacks.' },
    { name:'Mera Mera no Mi', type:'Logia', user:'Portgas D. Ace', hue:18, description:'Allows the user to create, control, and transform into fire, granting intangibility and powerful pyrokinetic attacks.' },
    { name:'Baku Baku no Mi', type:'Paramecia', user:'Wapol', hue:265, description:'Allows the user to eat virtually anything and incorporate it into their body or merge eaten things.' },
    { name:'Hito Hito no Mi', type:'Zoan', user:'Tony Tony Chopper', hue:330, description:'Allows an animal who eats it to gain human intelligence and the ability to transform into a human or human-hybrid form.' },
    { name:'Ushi Ushi no Mi, Model: Bison', type:'Zoan', user:'Dalton', hue:90, description:'Allows the user to transform into a full bison or a bison-human hybrid, gaining enhanced strength and durability.' },
    { name:'Bomu Bomu no Mi', type:'Paramecia', user:'Mr. 5', hue:35, description:"Makes the user's entire body and bodily fluids explosive, granting immunity to explosions." },
    { name:'Kilo Kilo no Mi', type:'Paramecia', user:'Miss Valentine', hue:55, description:'Allows the user to change their body weight between 1 and 10,000 kilograms without changing size.' },
    { name:'Doru Doru no Mi', type:'Paramecia', user:'Mr. 3', hue:170, description:'Allows the user to produce and manipulate candle wax, which can harden to steel-like strength but is weak to fire/heat.' },
    { name:'Hana Hana no Mi', type:'Paramecia', user:'Miss All Sunday (Nico Robin)', hue:280, description:'Allows the user to replicate and sprout parts of their body (like arms, eyes) from any surface.' },
    { name:'Suna Suna no Mi', type:'Logia', user:'Sir Crocodile', hue:42, description:'Allows the user to create, control, and transform into sand. Can absorb moisture. Weakness to liquids known by ep 110.' }
  ]
};