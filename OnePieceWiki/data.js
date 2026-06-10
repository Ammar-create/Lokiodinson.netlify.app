/* ============================================================
   GRAND LINE ARCHIVE — DATA FILE
   ============================================================
   Edit THIS file to reshape the entire site. index.html never
   needs to change.

   CURRENT COVERAGE
   ----------------
   This file covers One Piece anime events up to the END OF THE
   SKYPIEA ARC, around Episode 195.

   Included timeline:
   - East Blue
   - Loguetown
   - Reverse Mountain / early Grand Line context
   - Drum Island
   - Alabasta
   - Jaya
   - Skypiea

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

   TO ADD A NEW SAGA / ARC
   -----------------------
   1. Add a new object inside the groups array.
   2. Give it a unique id with no spaces.
   3. Add title, tagline, and characters.
   4. Every character needs:
      - unique id
      - name
      - hue
      - initials
      - role
      - epithet
      - affiliation
      - devil_fruit
      - bounty
      - status
      - abilities
      - feats
      - stats

   Example:
   --------
   {
     id: 'water7',
     title: 'Water 7',
     tagline: 'THE CITY OF WATER',
     characters: [
       {
         id:'franky',
         name:'Franky',
         hue:190,
         initials:'F',
         role:'SHIPWRIGHT',
         epithet:'Cyborg Franky',
         affiliation:'Franky Family',
         devil_fruit:'None',
         bounty:null,
         status:'rogue',
         abilities:[
           'Cyborg body with hidden weapons.',
           'Superhuman strength.',
           'Uses cola as fuel.'
         ],
         feats:[
           'Led the Franky Family.',
           'Clashed with the Straw Hat Pirates.'
         ],
         stats:{
           Strength:80,
           Speed:60,
           Durability:85,
           Skill:75,
           Intelligence:75
         }
       }
     ]
   }

   TO ADD A NEW DEVIL FRUIT
   ------------------------
   Add a new object inside the fruits array:

   {
     name:'Fruit Name',
     type:'Paramecia',
     user:'Current User',
     hue:120,
     description:'Short explanation of the power.'
   }

   NOTES
   -----
   - Do not duplicate ids.
   - Bounty should be a number, not a string.
   - If bounty is unknown, use null.
   - If the character has no Devil Fruit, use 'None'.
   - Keep spoilers limited to the current coverage point.
   - This file intentionally avoids post-Skypiea revelations.
   ============================================================ */

window.WIKI_DATA = {

  site: {
    title: "GRAND LINE ARCHIVE",
    tagline: "Records of pirates, marines, sky warriors & cursed fruits — chronicled to the end of Skypiea",
    badge: "⊹ LOG POSE SET · EAST BLUE → ALABASTA → JAYA → SKYPIEA ⊹",
    footer: "Grand Line Archive · © Libertas 🕊️ · All rights reserved"
  },

  groups: [

    {
      id: 'crew',
      title: 'The Straw Hat Crew',
      tagline: 'MAIN CREW · THE GOING MERRY',
      characters: [
        {
          id:'luffy',
          name:'Monkey D. Luffy',
          hue:355,
          initials:'L',
          role:'CAPTAIN',
          epithet:'Straw Hat Luffy',
          affiliation:'Straw Hat Pirates (Captain)',
          devil_fruit:'Gomu Gomu no Mi (Rubber Human)',
          bounty:100000000,
          status:'wanted',
          abilities:[
            'Body made of rubber: immune to blunt attacks, bullets, punches, and electricity.',
            'Can stretch limbs for attacks like Gomu Gomu no Pistol, Bazooka, Gatling, Rocket, Rifle, and Balloon.',
            'Extreme willpower, pain tolerance, and battle instinct.',
            'Can improvise in combat even when facing enemies far stronger or smarter than him.',
            'Natural counter to Enel’s lightning due to his rubber body.'
          ],
          feats:[
            'Defeated Alvida, Captain Morgan, Buggy, Captain Kuro, Don Krieg, Arlong, and Wapol.',
            'Defeated Crocodile, one of the Seven Warlords of the Sea.',
            'Received a new bounty of 100,000,000 berries after Alabasta.',
            'Defeated Bellamy with a single punch in Mock Town.',
            'Reached Skypiea by riding the Knock Up Stream.',
            'Defeated Enel and rang the Golden Bell of Shandora.',
            'Saved Skypiea from Enel’s plan to destroy it with Raigo.'
          ],
          stats:{Strength:88,Speed:75,Durability:95,Skill:72,Intelligence:35}
        },

        {
          id:'zoro',
          name:'Roronoa Zoro',
          hue:140,
          initials:'Z',
          role:'SWORDSMAN',
          epithet:'Pirate Hunter Zoro',
          affiliation:'Straw Hat Pirates (Swordsman)',
          devil_fruit:'None',
          bounty:60000000,
          status:'wanted',
          abilities:[
            'Master of Santoryu, the Three Sword Style.',
            'Incredible physical strength, endurance, and pain tolerance.',
            'Known techniques include Oni Giri, Tora Gari, Tatsumaki, and Sanzen Sekai.',
            'Learned to cut steel during the battle with Mr. 1.',
            'Poor sense of direction.'
          ],
          feats:[
            'Defeated Captain Morgan, Cabaji, the Nyaban Brothers, Hatchan, Mr. 5, and Mr. 1 Daz Bonez.',
            'Survived a devastating wound from Dracule Mihawk.',
            'Received a bounty of 60,000,000 berries after Alabasta.',
            'Fought Braham and Ohm in Skypiea.',
            'Cut through Ohm’s Iron Cloud and defeated him.',
            'Helped protect the crew during the survival battle on Upper Yard.'
          ],
          stats:{Strength:90,Speed:75,Durability:90,Skill:93,Intelligence:42}
        },

        {
          id:'nami',
          name:'Nami',
          hue:28,
          initials:'N',
          role:'NAVIGATOR',
          epithet:'Cat Burglar Nami',
          affiliation:'Straw Hat Pirates (Navigator)',
          devil_fruit:'None',
          bounty:null,
          status:'wanted',
          abilities:[
            'Exceptional navigator and cartographer, able to sense weather changes.',
            'Skilled thief, pickpocket, negotiator, and manipulator.',
            'Uses the Clima-Tact created by Usopp.',
            'Can manipulate basic weather effects: heat balls, cool balls, thunder balls, mirages, and gusts.',
            'High intelligence, cunning, and tactical awareness.'
          ],
          feats:[
            'Helped guide the Straw Hats through the Grand Line.',
            'Defeated Miss Doublefinger using the Clima-Tact.',
            'Navigated the crew toward Jaya and helped them reach Skypiea.',
            'Survived the trials and battles of Upper Yard.',
            'Escaped Enel aboard the Maxim and helped Luffy reach him.'
          ],
          stats:{Strength:35,Speed:55,Durability:45,Skill:70,Intelligence:96}
        },

        {
          id:'usopp',
          name:'Usopp',
          hue:48,
          initials:'U',
          role:'SNIPER',
Str ()',
 devilNone                  wanted abilities using and.',
 ', fire stars, explosive stars, and trick ammunition.',
            'Inventor and mechanic createdami-T.',
Expert liar and storyteller, weapon fear.',
 ' resiliently                  :[
endedup the defeat Miss.',
 protected.',
 theieed En Maxim inside          stats:Speed,abilitySkill,75        {
 idsan         San hue,
:'',
:'',
hetBlackji affiliationaw (         ruitNone:null         wanted',
          abilities:[
            'Master of Black Leg Style, fighting only with powerful kicks.',
            'Superb chef with deep knowledge of food, nutrition, and ingredients.',
            'Sharp tactical mind, often acting independently at critical moments.',
            'Strong sense of chivalry; refuses to harm women.',
            'Known techniques include Collier, Épaule, Côtelette, Selle, Poitrine, Gigot, Mouton Shot, and Anti-Manner Kick Course.'
          ],
          feats:[
            'Defeated Pearl, Kuroobi, and Mr. 2 Bon Clay.',
            'Used the “Mr. Prince” devil_fruit:'Hito Hito no Mi (Human-Human Fruit)',
          bounty:null,
          status:'wanted',
          abilities:[
            'Zoan Devil Fruit user; reindeer who ate the Human-Human Fruit.',
            'Can transform between Walk Point, Brain Point, and Heavy Point.',
            'Uses Rumble Ball to access extra forms such as Jumping Point, Arm Point, Guard Point, and Horn Point.',
            'Skilled doctor trained by.uk.ure            and talk animalsreated            'Help defeat Mr. 4 and Miss Christmas with Usopp.',
            'Survived the ordeal Skypiea and foughtatsu.',
            'Protected the Going Merry during the sky island conflict.'
          ],
          statsDurability:70,Skill:82,Intelligence:88}
        },

        {
          id:'robin_crew',
          name:'Nico Robin',
          hue:280,
          initials:'R',
          role:'ARCHAEOLOGIST',
          epithet:'Devil Child',
          affiliation:'Straw Hat Pirates (Arout copies of her body parts from any surface, including people.',
            'Uses sprouted limbs for restraint, attacks, surveillance, and multi-directional control.',
            'Techniques include Clutch, Seis Fleur, Ocho Fleur, and Treinta Fleur forms.',
            'Can read Poneglyphs, making her extremely dangerous to the World Government.',
            'Highly intelligent, calm, analytical, and historically knowledgeable.'
          ],
          feats:[
            'Former vice president of Baroque Works under Crocodile as Miss All Sunday.',
            'Saved Luffy after his first defeat by Crocodile.',
            'Joined the Straw Hat Pirates after Alabasta.',
            'Discovered and read the Shandora Poneglyph in Skypiea.',
            'Defeated Yama, commander of Enel’s Divine Soldiers.',
            'Confirmed Gol D. Roger had reached Skypiea and left a message near the Poneglyph.'
          ],
          stats:{Strength:50,Speed:58,Durability:58,Skill:92,Intelligence:99}
        }
      ]
    },

    {
      id: 'eastblue',
      title: 'East Blue & Loguetown',
      tagline: 'WHERE THE VOYAGE BEGAN',
      characters: [
        {
          id:'buggy',
          name:'Buggy',
          hue:0,
          initials:'B',
          role:'PIRATE CAPTAIN',
          epithet:'Buggy the Clown',
          affiliation:'Buggy Pirates (Captain)',
          devil_fruit:'Bara Bara no Mi (Chop-Chop Fruit)',
          bounty:15000000,
          status:'wanted',
          abilities:[
            'Paramecia; can split his body into pieces and control them while levitating.',
            'Immune to slashing and cutting attacks.',
            'Uses knives and Buggy Balls.',
            'Feet must remain grounded or nearby for his separated         izedought Luffy and lost.',
            'Escaped capture in Loguetown with Alvida’s help.',
            'Continued hunting Luffy into the Grand Line.'
          ],
          stats:{Strength:40,Speed:30,Durability:35,Skill:50,Intelligence:45}
        },

        {
          id:'alvida',
          name:'Alvida',
          hue:300,
          initials:'A',
          role:'PIRATE',
          epithet:'Iron Mace Alvida',
          affiliation:'Alvida Pirates, Buggy and Alvida Alliance',
          devil_fruit:'Sube Sube no Mi (Slip-Slip Fruit)',
          bounty:5000000,
          status:'wanted',
          abilities:[
            'Paramecia; makes her body extremely slippery.',
            'Attacks and objects slide off her skin.',
            'Can skate smoothly across toiedHelp in ],
35Dur:SM          Fruital captured           80         Sk criminals           etown Straw in.',
 the a:{,70 ]
:: tagline',
 {
         ',
 initialsTY:'',
 ofakuM bountyrog '.',
 materialsCan B ' modifications Drum            ' 'ar.',
 defeated.'
          stats:{Strength:55,Speed:20,Durability:60,Skill:40,Intelligence:35}
        },

        {
          id:'dalton',
          name:'Dalton',
          hue:90,
          initials:'D',
          role:'GUARDIAN',
          epithet:'None prominent',
          affiliation:'Sakura Kingdom',
          devil_fruit:'Ushi Ushi no Mi, Model: Bison',
          bounty:null,
          status:'royal',
          abilities:[
            'Zoan; can transform into a full bison or a bison-human hybrid.',
            'Enhanced, durability statesUses sp bladeStrong justice the ],
:[
osed’s.',
 kingdom’s ' a Sakura Kingdom         :{,,70:elligence}
 {
k         .ha hue         ',
DOhet',
Dr Sakura         None,
:'',
            doctor.',
Ext advancedMent Ch intimidating.'
 ],
ained medicineProtected Druk ' treat.',
ed the         :{SpeedDur:elligenceab',
THEIR {
ace name:'Portgas D. Ace',
          hue:18,
          initials:'A',
          role:'COMMANDER',
          epithet:'Fire Fist Ace',
          affiliation:'Whitebeard Pirates (2nd Division Commander)',
          devil_fruit:'Mera Mera no Mi (Flame-Flame Fruit)',
          bounty:null,
          status:'wanted',
          abilities:[
            'Logia; can create, control, and transform into fire.',
           angible attacks ' attacks H and.',
 strong highly ],
 feats:[
            'Introduced searching for Blackbeard.',
            'Briefly clashed with Smoker in Nanohana.',
            'Destroyed several Baroque Works ships easily.',
            'Revealed himself as Luffy’s older brother.',
            'Gave Luffy a vivre card before continuing his hunt.'
          ],
          stats:{Strength:85,Speed:85,Durability:85,Skill:90,Intelligence:75}
        },

        {
          id:'mr5',
          name:'Mr. 5',
          hue:35,
          initials:'5',
          role:'AGENT',
          epithet:'None prominent',
          affiliation:'Baroque Works Officer Agent',
          devil_fruit:'Bomu Bomu no Mi (Bomb-Bomb Fruit)',
          bounty:null abilitiesamecia; entire and bodily substances explosive.',
            'Can flick explosiveog.',
His.',
           Imm explosions          feats:[
            'Tasked with eliminatingFuffy at 'opp, at ' Bar operations ],
:{Speed:,65Skill:Int                valMiss: initials',
 role:'AGENT',
          epithet:'None prominent',
          affiliation:'Baroque Works Officer Agent',
          devil_fruit:'Kilo Kilo no Mi (Kilo-Kilo Fruit)',
          bounty:null,
          status:'wanted',
          abilities:[
            'Paramecia; can change her body weight from 1 kilogram to 10,000 kilograms.',
            'Uses low weight to float with an umbrella.',
            'Uses high weight to crush opponents.',
            'Relies on surprise and positioning.'
          ],
          feats:[
Partner Mr.',
F and PeakF Usami at Little Garden.',
            'Was defeated during the Little Garden conflict ],
:{,30DurSkill,}
 },

mr3',
          name:' ald         oque devil_fruit:'Doru Doru no Mi (Waxax          status',
           ame candleWax into-like ' restraints,,            is fire          ',, Vivi and Bro in structure 'uffy, at.',
 appearedoque            repeatedly.'
 stats:elligence        name ()',
280:'          PRESIDENT epit:'',
 Works',
ruit HanaFlowerFlower Fruit)',
          bounty:79000000,
          status:'wanted',
          abilities            can of any ', observe limbs read            intelligent,.'
          'cod in.',
Appeared before the Straw Hats after Whiskey Peak.',
            'Saved Luffy from drowning after his first defeat by Crocodile.',
            'Refused to give Crocodile the ancient weapon information he wanted.',
            'Joined the Straw Hat Pirates after Alabasta.'
          ],
          stats:{Strength:45,Speed:55,Durability:55,Skill:90,Intelligence:98}
        },

        {
          id:'crocodile',
          name:'Sir Crocodile',
          hue:42,
          initials:'☠',
          role:'WARLORD',
          epithet:'Mr. 0',
          affiliation:'Seven Warlords of the Sea, Baroque Works President',
          devil_fruit:'Suna Suna no Mi (Sand-Sand Fruit)',
          bounty:81000000,
          status:'warlord',
          abilities:[
            'Logia; can create, control, and transform into sand.',
            'Intangible against most attacks unless moisture or liquid is involved.',
            'Can absorb moisture from living things and objects.',
            'Can create sandstorms, blades of sand, and quicksand pits.',
            'Uses a large golden hook, later revealed to contain poison.',
            'Highly intelligent and manipulative strategist.'
          ],
          feats:[
            'Secretly orchestrated the Alabasta civil war.',
            'Built and controlled Baroque Works from the shadows.',
            'Defeated Luffy multiple times before finally losing.',
            'Was exposed as a criminal and stripped of Warlord status.',
            'His defeat caused major shock across the world.'
          ],
          stats:{Strength:82,Speed:75,Durability:90,Skill:95,Intelligence:95}
        },

        {
          id:'vivi',
          name:'Nefertari Vivi',
          hue:190,
          initials:'V',
          role:'PRINCESS',
          epithet:'',
:' Alasta Kingdom',
          devil_fruit:'None',
          bounty:null,
          status:'royal',
          abilities:[
            'Uses Peacock Slashers attached to strings on her fingers.',
            'Skilled infiltrator from her time inside Baroque Works.',
            'Brave, diplomatic, and deeply loyal to her people.',
            'Rides Karoo, her Super Spot-Billed Duck companion.'
          ],
          feats:[
            'Infiltrated Baroque Works to uncover the threat to Alabasta.',
            'Traveled with the Straw Hats as an honorary companion.',
            'Attempted to stop the Alabasta civil war.',
            'Helped expose Crocodile’s conspiracy.',
            'Chose to remain in Alabasta instead of joining the Straw Hats.'
          ],
          stats:{Strength:25,Speed:40,Durability:35,Skill:50,Intelligence:75}
        },

        {
          id:'mr1',
          name:'Mr. 1 (Daz Bonez)',
          hue:205,
          initials:'1',
          role:'AGENT',
          epithet:'The Killer',
          affiliation:'Baroque Works Officer Agent',
          devil_fruit:'Supa Supa no Mi (Dice-Dice Fruit)',
          bounty:null,
          status:'wanted',
          abilities:[
            'Paramecia; can turn his body into steel blades.',
            'Body has steel-like durability.',
            'Uses slicing attacks from arms, legs, and torso.',
            'Highly disciplined and lethal assassin.'
          ],
          feats:[
            'Served as one of Crocodile’s strongest agents.',
            'Fought Zoro in Alabasta.',
            'Forced Zoro to learn how to cut steel.',
            'Was defeated by Zoro after a brutal duel.'
          ],
          stats:,Dur        },

        {
          id:'bonclay',
          name:'Mr. 2 Bon Clay',
          hue:310,
          initials:'2',
          role:'AGENT',
          epithet:'Bon Clay',
          affiliation:'Baroque Works Officer Agent',
          devil_fruit:'Mane Mane no Mi (Clone-Clone Fruit)',
          bounty:null,
          status:'wanted',
          abilities:[
            'Paramecia; can copy the appearance of anyone he touches with his right hand.',
            'Returns to his own face by touching his face with '-like agile:[
asta',
 taglineDS MOCKOWN THENO UP',
 characters [
 {
 Alliance affiliation:' Mountain',
 devil_f:'',
         :null,
 statusrog',
          abilities:[
 'illed diver underwaterager            ' b.',
 'essively for the.',
 loyalty andjou.'
          ],
          feats:[
 ' Montoland story Straw Hats Merry Knock            informationyp           ued truth Sh.'
 stats6045:SkillInt72        idblackbe          D. hue         ',
P CAP epitbe affiliationard         ruit:' at',
 bounty         ',
            powerful durableStrong dreams.',
Commands small ' are by Sk.'
                     L Town before similarDeclared’s.',
Was high.',
Later D captainbe         :{SpeedDur,,85       dingo         ixlam          hue:315,
          initials:'D',
          role:'WARLORD',
          epithet:'Heavenly Demon',
          affiliation:'Seven Warlords of the Sea',
          devil_fruit:'Unknown at this point',
          bounty:340000000,
          status:'warlord',
          abilities:[
            'Shown manipulating people’s bodies from a distance using an unrevealed ability.',
            'Extremely charismatic, cruel, and confident.',
            'Power level appears far beyond ordinary pirates.',
            'Full Devil Fruit details are not revealed by the end of Skypiea.'
          ],
          feats:[
            'Attended the Warlord meeting after Crocodile’s defeat.',
            'Displayed frightening control over others during the meeting.',
            'Commented on the coming age of piracy and shifting world order.'
          ],
          stats:{Strength:85,Speed:85,Durability:85,Skill:95,Intelligence:90}
        },

        {
          id:'kuma_jaya',
          name:'Bartholomew Kuma',
          hue:260,
          initials:'K',
          role:'WARLORD',
          epithet:'Tyrant',
          affiliation:'Seven Warlords of the Sea',
          devil_fruit:'Unknown at this point',
          bounty:296000000,
          status:'warlord',
          abilities:[
            'True abilities are not revealed by the end of Skypiea.',
            'Silent, imposing, and extremely intimidating.',
            'Recognized as one of the Seven Warlords.',
            'Appears to be far above normal pirate level.'
          ],
          feats:[
            'Attended the Warlord meeting after Crocodile’s defeat.',
            'Was introduced as a major figure in the world power balance.',
            'Observed the changing pirate era after Luffy’s rise.'
          ],
          stats:{Strength:90,Speed:75,Durability:90,Skill:85,Intelligence:82}
        }
      ]
    },

    {
      id: 'skypiea',
      title: 'Skypiea',
      tagline: 'THE ISLAND IN THE SKY',
      characters: [
        {
          id:'enel',
          name:'Enel',
          hue:50,
          initials:'E',
          role:'GOD',
          epithet:'God Enel',
          affiliation:'Skypiea / Upper Yard',
          devil_fruit:'Goro Goro no Mi (Rumble-Rumble Fruit)',
          bounty:null,
          status:'rogue',
          abilities:[
            'Logia; can create, control, and transform into lightning.',
            'Can move at lightning speed through conductive materials.',
            'Uses Mantra to sense people and attacks across large distances.',
            'Can restart his own heart with electricity.',
            'Can generate massive lightning attacks such as El Thor, Sango, and Raigo.',
            'Uses a golden staff and can reshape gold with heat.'
          ],
          feats:[
            'Ruled Skypiea as a false god.',
            'Defeated many Shandians, priests, and Straw Hats with overwhelming lightning power.',
            'Built and launched the flying ark Maxim.',
            'Attempted to destroy Skypiea with Raigo.',
            'Was defeated by Luffy, whose rubber body countered his lightning.',
            'Departed toward the Endless Vearth after his defeat.'
          ],
          stats:{Strength:88,Speed:98,Durability:78,Skill:95,Intelligence:88}
        },

        {
          id:'wyper',
          name:'Wyper',
          hue:8,
          initials:'W',
          role:'SHANDIAN WARRIOR',
          epithet:'Berserker',
          affiliation:'Shandia',
          devil_fruit:'None',
          bounty:null,
          status:'rogue',
          abilities:[
            'Powerful warrior using dials, bazookas, and close-range combat.',
            'Uses Burn Bazooka and Reject Dial.',
            'Extreme physical endurance and pain tolerance.',
            'Driven by inherited duty to reclaim Shandora.'
          ],
          feats:[
            'Led Shandian attacks against Enel’s forces.',
            'Fought Luffy, Zoro, and other survival-game participants.',
            'Used Reject Dial against Enel and temporarily stopped his heart.',
            'Survived repeated use of the dangerous Reject Dial.',
            'Witnessed the Golden Bell ring, fulfilling the Shandian dream.'
          ],
          stats:{Strength:82,Speed:72,Durability:88,Skill:80,Intelligence:65}
        },

        {
          id:'ganfall',
          name:'Gan Fall',
          hue:215,
          initials:'GF',
          role:'SKY KNIGHT',
          epithet:'The Knight of the Sky',
          affiliation:'Former God of Skypiea',
          devil_fruit:'None',
          bounty:null,
          status:'royal',
          abilities:[
            'Experienced aerial combatant riding Pierre.',
            'Uses a lance and impact-based techniques.',
            'Knowledgeable about Skypiea, dials, and Upper Yard.',
            'Pierre can transform due to the Uma Uma no Mi.'
          ],
          feats:[
            'Former ruler of Skypiea before Enel took power.',
            'Helped the Straw Hats understand the sky island.',
            'Fought in the survival game on Upper Yard.',
            'Was later restored as Skypiea’s leader after Enel’s defeat.'
          ],
          stats:{Strength:65,Speed:70,Durability:65,Skill:78,Intelligence:80}
        },

        {
          id:'conis',
          name:'Conis',
          hue:190,
          initials:'C',
          role:'SKY ISLANDER',
          epithet:'None prominent',
          affiliation:'Angel Island',
          devil_fruit:'None',
          bounty:null,
          status:'royal',
          abilities:[
            'Can operate sky island technology and dials.',
            'Kind, honest, and brave despite lacking major combat power.',
            'Plays the harp.',
            'Knows the customs and dangers of Skypiea.'
          ],
          feats:[
            'Guided the Straw Hats after their arrival in Skypiea.',
            'Warned them about the laws and danger of Enel.',
            'Publicly defied Enel despite the risk of divine punishment.',
            'Helped evacuate Angel Island before Enel’s attack.'
          ],
          stats:{Strength:15,Speed:35,Durability:35,Skill:45,Intelligence:70}
        },

        {
          id:'aisa',
          name:'Aisa',
          hue:340,
          initials:'A',
          role:'SHANDIAN CHILD',
          epithet:'None prominent',
          affiliation:'Shandia',
          devil_fruit:'None',
          bounty:null,
          status:'rogue',
          abilities:[
            'Born with Mantra, allowing her to sense voices and presences.',
            'Can detect when people are defeated or disappear.',
            'Brave despite being a child.',
            'Strong emotional link to the Shandian struggle.'
          ],
          feats:[
            'Sensed the battles and disappearances during Enel’s survival game.',
            'Helped Nami and Luffy during the conflict.',
            'Witnessed the crisis over Skypiea and the fall of Enel.',
            'Survived the war over Upper Yard.'
          ],
          stats:{Strength:10,Speed:35,Durability:30,Skill:45,Intelligence:60}
        },

        {
          id:'ohm',
          name:'Ohm',
          hue:75,
          initials:'O',
          role:'PRIEST',
          epithet:'Skybreeder Ohm',
          affiliation:'Enel’s Priests',
          devil_fruit:'None',
          bounty:null,
          status:'rogue',
          abilities:[
            'Uses Mantra to predict movements.',
            'Uses the Iron Cloud sword, Eisen Whip.',
            'Controls a large dog named Holy.',
            'Cold, fatalistic combat style.'
          ],
          feats:[
            'Served as one of Enel’s four priests.',
            'Guarded the Ordeal of Iron.',
            'Fought Zoro, Wyper, Gan Fall, and others.',
            'Was defeated by Zoro.'
          ],
          stats:{Strength:68,Speed:70,Durability:65,Skill:82,Intelligence:70}
        },

        {
          id:'shura',
          name:'Shura',
          hue:12,
          initials:'S',
          role:'PRIEST',
          epithet:'Sky Rider Shura',
          affiliation:'Enel’s Priests',
          devil_fruit:'None',
          bounty:null,
          status:'rogue',
          abilities:[
            'Uses Mantra.',
            'Uses a Heat Javelin enhanced with a Heat Dial.',
            'Rides the giant bird Fuza.',
            'Specializes in aerial attacks.'
          ],
          feats:[
            'Served as one of Enel’s four priests.',
            'Guarded the Ordeal of String.',
            'Defeated Gan Fall during the Upper Yard conflict.',
            'Was defeated by Wyper.'
          ],
          stats:{Strength:70,Speed:78,Durability:62,Skill:78,Intelligence:62}
        },

        {
          id:'satori',
          name:'Satori',
          hue:305,
          initials:'S',
          role:'PRIEST',
          epithet:'Satori of the Forest',
          affiliation:'Enel’s Priests',
          devil_fruit:'None',
          bounty:null,
          status:'rogue',
          abilities:[
            'Uses Mantra to predict attacks.',
            'Uses Impact Dials hidden in his palms.',
            'Controls surprise cloud traps and floating spheres.',
            'Tricky and unpredictable fighting style.'
          ],
          feats:[
            'Guarded the Ordeal of Balls.',
            'Fought Luffy, Sanji, and Usopp.',
            'Used Mantra and traps to overwhelm the crew at first.',
            'Was defeated after the Straw Hats adapted to his tricks.'
          ],
          stats:{Strength:58,Speed:65,Durability:58,Skill:75,Intelligence:68}
        },

        {
          id:'gedatsu',
          name:'Gedatsu',
          hue:230,
          initials:'G',
          role:'PRIEST',
          epithet:'Gedatsu of the Swamp',
          affiliation:'Enel’s Priests',
          devil_fruit:'None',
          bounty:null,
          status:'rogue',
          abilities:[
            'Uses Mantra.',
            'Uses Jet Dials for sudden movement.',
            'Uses Swamp Clouds to trap enemies.',
            'Physically capable but extremely absent-minded.'
          ],
          feats:[
            'Guarded the Ordeal of Swamp.',
            'Fought Chopper on Upper Yard.',
            'Nearly overwhelmed Chopper with speed and traps.',
            'Was defeated by Chopper.'
          ],
          stats:{Strength:65,Speed:80,Durability:60,Skill:70,Intelligence:25}
        },

        {
          id:'yama',
          name:'Yama',
          hue:35,
          initials:'Y',
          role:'COMMANDER',
          epithet:'Commander of the Divine Soldiers',
          affiliation:'Enel’s Divine Soldiers',
          devil_fruit:'None',
          bounty:null,
          status:'rogue',
          abilities:[
            'Large body and immense physical strength.',
            'Commands Enel’s Divine Soldiers.',
            'Uses brute force and destructive charges.',
            'Durable but lacks refined technique.'
          ],
          feats:[
            'Commanded Enel’s Divine Soldiers on Upper Yard.',
            'Threatened the ruins of Shandora through reckless destruction.',
            'Fought Nico Robin.',
            'Was defeated by Robin after damaging the sacred ruins.'
 stats,Durability:75,Skill:45,Intelligence:35}
        },

        {
          id:'noland',
          name:'Mont Blanc Noland',
          hue:100,
          initials:'N',
          role:'EXPLORER',
          epithet:'The Liar Noland',
          affiliation:'Lvneel Kingdom',
          devil_fruit:'None',
          bounty:null,
          status:'rogue',
          abilities:[
            'Legendary explorer and botanist.',
            'Powerful physical fighter.',
            'Skilled navigator and advent            his.'
:[
 Sh the K '            branded liar the ],
:{Strength:80,Speed:70:'         ara          affiliation:'Shandia',
None:[
            'Legendary Shandian warrior.',
            'Immense physical strength and courage.',
            'Expert spear fighter.',
            'Deeply devoted to his people and traditions.'
          ],
          feats:[
            'Protected Shandora centuries before the main story.',
            'Befriended Mont Blanc Noland after initially opposing him.',
            'Promised to ring the Golden Bell so Noland could find Shandora again.',
            'Died before seeing the promise fulfilled.'
          ],
          stats:{Strength:88,:: ]
   omu type user',
:" rubber bullets },

 Mi',
 hueAllows into and     :' Mi',
      type:'Paramecia',
      user:'Alvida',
      hue:300,
      description:"Makes the user's body extremely slippery, causing attacks and objects to slide off."
    },

    {
      name:'Moku Moku no Mi',
      type:'Logia',
      user:'Smoker',
      hue:200,
      description:'Allows the user to create, control into smoke, granting intangibility against most Stone nameeraera Mi',
 typeLog',
      user:'Portgas D. Ace',
: the transform powerfuletic attacks.'
    },

    {
Baku no Mi',
     :'Parame',
      user:'Wapol',
      hue:265,
      description:'Allows the user to eat virtually anything and incorporate consumed objects or beings into their body.'
    },

    {
      name:'Hito Hito no Mi',
      type:'Zoan',
      user:'Tony Tony Chopper',
      hue:330,
      description:'Allows an animal who eats it to gain human intelligence and transform into human or forms    {
 U no Mi, Model: Bison user,
 full gainingPar },

 noParMiss:':'Doru Doru no Mi',
      type:'Paramecia',
      user:'Mr. 3',
      hue:170,
      description:'Allows the user to produce and manipulate candle wax, which can harden to steel-like strength but is weak to heat and fire.'
    },

    {
      name:'Hana Hana no Mi',
      type:'Paramecia',
     :',
 to body,          Sir42 control can by name Micia:'azz)',
      hue:205,
      description:'Allows the user to turn their body into steel blades, granting cutting attacks and steel-like durability.'
    },

    {
      name:'Mane Mane no Mi',
      type:'Paramecia',
      user:'Mr. 2 Bon Clay',
      hue:310,
      description:'Allows the user to copy the appearance of anyone they touch with their right hand and return to normal with their left hand.'
    {
 no Mi     ParBellamy',
25,
Allows body attacks and compressed {
Goro Goro no Mi type',
      to lightning attacks attacks.'
            Uma:'',
      user:'Pierre hue     :', bird, into horse-like form, functioning as a winged horse mount.'
    }
  ]
};