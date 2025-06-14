require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const GAME_FILE = path.resolve(__dirname, 'game_state.json');
const getGameState = () => JSON.parse(fs.readFileSync(GAME_FILE, 'utf-8'));
const saveGameState = (data) => fs.writeFileSync(GAME_FILE, JSON.stringify(data, null, 2));
const API_RES = path.resolve(__dirname, 'response.log');

const getResponse = () => JSON.parse(fs.readFileSync(API_RES, 'utf-8'));
const saveResponse = (data, label = 'response') => {
  const entry = {
    label: label,
    timestamp: new Date().toISOString(),
    data: data
  };
  const logLine = JSON.stringify(entry, null, 2) + '\n---\n';
  fs.appendFileSync(API_RES, logLine, 'utf8');
};

const LOG_FILE = path.resolve(__dirname, 'debug_log.txt');

const LIFE_TIERS = [
  {
    "level": 0,
    "name": "Fragile Life",
    "description": "Barely conscious or critically unstable lifeforms, including newborns, the mortally wounded, or shut-down machines."
  },
  {
    "level": 1,
    "name": "Common Entity",
    "description": "Ordinary individuals or organisms with basic awareness and minimal threat potential. Civilians, small animals, or simple drones."
  },
  {
    "level": 2,
    "name": "Trained Operative",
    "description": "Beings with trained skills or enhanced instinct, capable of handling moderate threats. Soldiers, predators, scout drones."
  },
  {
    "level": 3,
    "name": "Elite Organic",
    "description": "Individuals at peak organic performance—top athletes, enhanced animals, or specialized units with refined capabilities."
  },
  {
    "level": 4,
    "name": "Supernatural Threshold",
    "description": "Lifeforms who surpass natural limits through mutation, magic, or advanced technology. Low-tier superhumans, mutants, spellcasters."
  },
  {
    "level": 5,
    "name": "Area Influencer",
    "description": "Capable of changing the dynamics of a battlefield or controlling large-scale zones. City-scale threats or high-level operatives."
  },
  {
    "level": 6,
    "name": "Domain Controller",
    "description": "Powerful entities able to manipulate ecosystems, manipulate energy, or command armies. Hive queens, high mages, tactical AI cores."
  },
  {
    "level": 7,
    "name": "Planet-Level Being",
    "description": "Beings whose actions affect planetary systems, political powers, or ecological balance. Warlords, planetary AI, titanic beasts."
  },
  {
    "level": 8,
    "name": "Stellar Entity",
    "description": "Entities wielding star-level energy, moving freely between worlds. Star gods, solar forgers, deep space overlords."
  },
  {
    "level": 9,
    "name": "Galactic Architect",
    "description": "Capable of constructing, reshaping, or erasing galactic-scale structures or civilizations. Galaxy minds, ancient precursors."
  },
  {
    "level": 10,
    "name": "Conceptual God",
    "description": "Abstract-level existence that manipulates reality, laws of nature, or metaphysical constructs. Time gods, cosmic consciousness, embodiment of entropy."
  }
];


function logDebugInfo(info) {
  const time = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${time}] ${info}\n`);
}
function addId(arr, name) {
  return arr.map(item => ({
    ...item,
    [name]: Date.now() + '-' + Math.floor(Math.random() * 1000)
  }));
}

// Initialization endpoint
app.post('/api/init', async (req, res) => {
  const { worldSetting, characterDescription } = req.body;
  let gameState, worldState, eleState;
  try {
    const promptWorld = `
Forget all my previous questions.
You are a world-building assistant. Your task is to help refine and complete a fictional universe by ensuring its internal logic, cultural depth, and thematic consistency.

Input:
- World_Setting: "${worldSetting}"
- Player_Background: "${characterDescription}"
- LIFE_TIERS:${JSON.stringify(LIFE_TIERS)}

Your tasks:
1. Analyze the given <worldSetting> and <playerBackground>.
2. Generate a fully realized world description that includes:
   - Core Cosmology: The structure of the world or universe, including supernatural rules or scientific foundations.
   - Historical Timeline: Major eras, cataclysms, or evolutionary developments that shaped this world.
   - Societal Structures: Political systems, economic patterns, religious institutions, social hierarchies.
   - Key Factions & Powers: Important players (kingdoms, companies, cults, rebel AI, etc.) and their motivations.
   - Cultural Logic: Norms, taboos, technologies, philosophies, and linguistic traits.
   - Consistency Audit: Identify and resolve any contradictions, implausibilities, or narrative loopholes.
   - (Optional) Expansion Hooks: Optional additions or alternate interpretations that can enrich gameplay or narrative branching.

3. Based on the final world you've created, select some or all from the given <LIFE_TIERS> that could plausibly exist in this world — including not only human beings, but also zombies, mutants, evolved species, AI entities, and any other forms of sentient or semi-sentient life. 
Do not limit interpretation of lifeform levels to human scaling only. Consider how each level could manifest through different entity types in this world (e.g., zombies at level 1~3, mutant beasts at level 4~6, rogue AI at level 7+, etc).
4. Extend and refine the <Player_Background> strictly within its original scope. Do not invent unrelated settings, powers, or timelines. Focus on enhancing the emotional depth, motivation, and plausible background details that support effective storytelling.
Important Output Instructions:
- Return the result in a strict JSON object format, as shown below.
- !!! Attention: All text values should match the tone and language of the <World_Setting> (e.g., if the World_Setting is in Chinese, all text values should be in Chinese).
- Do NOT include any commentary, explanation, or Markdown — return ONLY the JSON object.

Output format:
{
  "worldSet": "",//A detailed and coherent world description covering all the elements above, should be text
  "worldLife": [
    {
      "level": Integer,
      "name": "Name of the lifeform tier",
      "description": "Its meaning in the context of this world"
    },
    ...
  ],
  "playerBackground": "The extend upon the <Player_Background> logically to support effective storytelling."
}`;
    const responseWorld = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: promptWorld }],
        temperature: 0.7
      })
    });
    const worldData = await responseWorld.json();
    try {
      worldState = JSON.parse(worldData.choices[0].message.content);
    } catch (e) {
      const cleaned1 = worldData.choices[0].message.content
        .replace(/```json|```/g, '')
        .trim();
      worldState = JSON.parse(cleaned1);
    }
    saveResponse(worldState, "responseWorld");


    const promptElement = `
  You are a narrative game system assistant.
The following object defines a refined fictional universe. It contains:
- worldSet: A full world description
- worldLife: The lifeform lists that may plausibly exist in that world
- playerBackground: A description of the player's background
Use this information as the authoritative reference for all world logic, background consistency, and cultural tone.

Reference Object:
<--- Begin Reference Object --->
worldSet:${worldState.worldSet}, 
worldLife:${worldState.worldLife}, 
playerBackground:${worldState.playerBackground}
<--- End Reference Object --->

Task:
Now, based on this world and its rules, perform the following:
1. Generate a main character, an opening scene, items, Creatures
2. Ensure that all output content strictly aligns with the cultural logic, technological level, tone, and internal consistency of the reference world.
3. Where applicable, use relevant elements from the provided worldLife tiers<worldLife> to determine the strength/role/status of characters, creatures, or factions.


Important Output Instructions:
- Return the result in a strict JSON object format, as shown below.
- !!! Attention: All text values should match the tone and language of <worldState.worldSet> (e.g., if worldset(from the reference) is in Chinese, all text values should be in Chinese).
- Do NOT include any commentary, explanation, or Markdown — return ONLY the JSON object.


Output format:
{
  "playerInfo": {
    "name": "",
    "gender": "",
    "age": Number,
    "background": "",//Copy from <playerBackground>
    "appearance": "",//Appropriate physical description in line with the <playerBackground> 
    "health": 100, 
    "lifeFormLevel":Number //  select a level based on the decription in the given <worldLife> that best aligns with <playerBackground>.(eg, if If it were an ordinary person, it would be 1.)
    "tag": ["",...] // Summary of player traits that may affect plot and action success rates, such as 'computer expert' or 'physically weak'. Tags should reflect abilities or conditions, not personality traits."
    "luck": Float(0~1) // 0.5 = average, 0.8 = lucky, 0.2 = unlucky
  },

  "playerEquipment": [
    {
      "name": "...",
      "type": "StoryItem / Equipment / Consumable",
      "description": "How this item helps the player",
    }
  ],

  "scenes": [
    {
      "sceneId": 0,
      "location": "" // Player's location, e.g., Office/Deep Forest,
      "description": "//the environment and background(briefly explaining why the protagonist is present here) of the location above
      "time": "Approximate time, e.g., Dusk",
      "weather": "",
      "terrain": "",
      "plot": ""// Initial plot events, try to provide some clues or set some goals to guide the player. The plot should happen at the location above.
      "interactiveItems": [//Exclude any items that already exist in playerEquipment
        {
          "name": "...",
          "type": "StoryItem / Equipment / Consumable",
          "description": "How this item helps the player",
        }
      ],

      "interactiveCreatures": [ 
      // All creatures currently present in this scene that may interact with the player.
      // Must be split into two categories using "visibleToPlayer": true (player discovered), false (currently hidden or unknown).
      // Rules:
      // 1. Include only creatures physically located in this scene.
      // 2. Include creatures regardless of their behavior (friendly, hostile, unknown), as long as interaction is possible within narrative logic.
      // 3. If a creature is not been discovered by the player (e.g. hiding, in the shadows, in another room), set "visibleToPlayer": false.
      // 4. Each creature name must be unique. For generic types, append a letter (e.g., "Zombie A", "Mutant B").
      // 5. The creature's lifeFormLevel must conform to <lifeform> and the <worldSet> tone.
      // 6. Behavior must align with current world logic and scene context.
        {
        "name": "",                         // e.g., "Zombie A", "Nurse Clara"
        "gender": "Male / Female / Other",
        "age": Number,
        "type": "NPC / Enemy / Unknown",   // NPC = neutral/friendly; Enemy = hostile; Unknown = unclear intent
        "fate": Float(0~1),                // Probability of interaction with the player in the current scene
        "appearance": "Brief description of the creature's look",
        "behavior": "Friendly / Hostile / Neutral / Unknown",
        "description": "Creature's brief background or narrative significance",
        "lifeFormLevel": Integer(0~10),    // 
        "health": Integer(0~100),          // Current health percentage
        "visibleToPlayer": true / false    // true = player discovers the creature now; false = hidden or not yet discovered
        }
      ]
    }
  ]
}`;
    const responseElement = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [{ role: 'user', content: promptElement }],
        temperature: 0.7
      })
    });
    const eleData = await responseElement.json();
    try {

      eleState = JSON.parse(eleData.choices[0].message.content);
    } catch (e) {
      const cleaned2 = eleData.choices[0].message.content
        .replace(/```json|```/g, '')
        .trim();
      eleState = JSON.parse(cleaned2);
    }
    saveResponse(eleState, "responseElement");


    gameState = { ...worldState, ...eleState };
    gameState.gameOver = false;
    gameState.history = [];
    gameState.plotRecords = [];
    gameState.plotRecords.push(`${gameState.scenes[0].plot}`);
    gameState.playerEquipment = addId(gameState.playerEquipment, "itemId");
    gameState.scenes[0].interactiveItems = addId(gameState.scenes[0].interactiveItems, "itemId");
    gameState.scenes[0].interactiveCreatures = addId(gameState.scenes[0].interactiveCreatures, "creatureId");
    saveGameState(gameState);
    let resData = JSON.parse(JSON.stringify(gameState));
    resData.scenes[0].interactiveCreatures = resData.scenes[0].interactiveCreatures.filter(bio => bio.visibleToPlayer === true);
    res.json({ message: "Initialization successful", state: resData });
  } catch (error) {
    console.error('Initialization failed:', error.message);
    res.status(500).json({ error: 'Initialization failed', details: error.message });
  }
});

// Action execution endpoint
app.post('/api/generate', async (req, res) => {
  const game = getGameState();
  const { playerInfo, scenes, history, playerEquipment, plotRecords, worldSet, worldLife } = game;
  const interactiveItems = scenes[scenes.length - 1].interactiveItems || [];
  const interactiveCreatures = scenes[scenes.length - 1].interactiveCreatures || [];
  const previousScene = {};
  let outcomeText = "";

  for (let key in scenes[scenes.length - 1]) {
    if (key !== "plot" && key !== "interactiveItems" && key !== "interactiveCreatures" && key !== "activeCreatures") {
      previousScene[key] = scenes[scenes.length - 1][key];
    }
  }
  let levelUpInfo = '';
  if (!scenes[scenes.length - 1].activeCreatures) scenes[scenes.length - 1].activeCreatures = [];
  if (game.gameOver) {
    return res.status(400).json({ error: 'Game has ended' });
  }
  const { input } = req.body;
  try {
    if (!interactiveCreatures) {
      history.push(`\nNo interactive creatures present;`);
    } else {
      interactiveCreatures.forEach(creature => {
        if (creature.type === 'NPC') {
          const associate = creature.fate * playerInfo.luck * 2;
          const randomVal = Number(Math.random().toFixed(3));
          logDebugInfo(`[Active creature, NPC] associate=${associate} > random=${randomVal} ? ${associate > randomVal}`);
          if (associate > randomVal) {

            scenes[scenes.length - 1].activeCreatures.push(creature);
            history.push(`\nYou discovered ${creature.name}`);
          }

        } else if (creature.type === 'Enemy') {
          const associate = creature.fate / (playerInfo.luck * 2);
          const randomVal = Number(Math.random().toFixed(3));
          logDebugInfo(`[Active creature, Enemy] associate=${associate} > random=${randomVal} ? ${associate > randomVal}`);
          if (associate > randomVal) {

            scenes[scenes.length - 1].activeCreatures.push(creature);
            history.push(`\nYou discovered ${creature.name}`);
          }
        } else if (creature.type === 'Unknown') {
          const associate = creature.fate;
          const randomVal = Number(Math.random().toFixed(3));
          logDebugInfo(`[Active creature, Unknown] associate=${associate} > random=${randomVal} ? ${associate > randomVal}`);
          if (associate > randomVal) {

            scenes[scenes.length - 1].activeCreatures.push(creature);
            history.push(`\nYou discovered ${creature.name}`);
          }
        }
      });
    }
    if (playerInfo.health > 0) {
      const rand = Number(Math.random().toFixed(3));
      const threshold = 1 - playerInfo.luck * 0.1;
      logDebugInfo(`[Evolution]threshold=${threshold} <= random=${rand} ? ${rand >= threshold}`);
      if (rand >= threshold) {
        if (playerInfo.lifeFormLevel < 10) {
          const oldLevel = playerInfo.lifeFormLevel;
          playerInfo.lifeFormLevel += 1;
          levelUpInfo = `Player leveled up! Life form from level ${oldLevel} to ${oldLevel + 1}`;
          outcomeText += levelUpInfo ? `\n !!!${levelUpInfo} ` : '';
          saveGameState(game);
        }
      }
    }

    let putIn = {
      worldSet,
      playerInfo,
      playerEquipment,
      worldLife,
      randomEvents: scenes[scenes.length - 1].activeCreatures || 'None',
      LastItems: interactiveItems,
      LastCreatures: interactiveCreatures,
      levelUpInfo: levelUpInfo || 'None',
      plotRecords: plotRecords.slice(-10).join('\n'),
      previousScene: previousScene,
      playerAction: input,
      playerTags: playerInfo.tag,
    }
    console.log(putIn);


    const proptProbability = `
You are a narrative game system assistant.
The following object defines a refined fictional universe. It contains:
- worldSet:A full world description
- lifeTiers:The lifeform levels that may plausibly exist in that world
- playerInfo:player's detailed information
- playerEquipment:player's current equipment
- LastItems:Scene-interactive items (excluding player's equipment)
- plotRecords:Plot progression and log
- playerAction:Player's actions
- playerTags:Summary of player traits that may affect plot and action success rates
Use this information as the authoritative reference for all world logic, background consistency, and cultural tone.

Reference Object:
<--- Begin Reference Object --->
  worldSet: ${worldSet},
  lifeTiers: ${worldLife},
  playerInfo: ${playerInfo},
  playerEquipment: ${playerEquipment},
  LastItems: ${interactiveItems},
  plotRecords: ${plotRecords.slice(-10).join('\n')},
  playerAction: ${input},
  playerTags:${playerInfo.tag},
<--- End Reference Object --->

Task:
Based on the reference, generate a success probability (0~1 float) of the <playerAction> according to these criteria:

- Mandatory Pass Gates (any fail = 0 probability):
1.Physically Possible?
Does the action violate any physical laws or natural constraints? (e.g., cannot walk through walls)

2.Consistent with World?
Is the action consistent with the <worldSet>?

3.Time Consistency??
Does the action violate temporal consistency? (e.g., use smartphone in 18th century)

4.Required Items Present?
Does the action require items that the player currently holds(<playerEquipment>) or has access to(<LastItems>)?

- Evaluate the success probability (0~1 float) of the player's action as follows:
If all mandatory gates are passed, evaluate these dimensions. For each dimension, assign a value of:
1 if it benefits the success of the action,
0 if it neither helps nor hinders (or unknown),
-1 if it reduces the chance of success.
Multiply each value by its weight, sum all weighted values, then add a base value of 0.5 to get the preliminary success probability.
| Dimension                    | Weight | Description                                                                               |
| ---------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| PhysicalConditionSuitability | 0.25   | Is the action suitable given physical constraints such as terrain, space, posture, reach? |
| BehaviorFamiliarity          | 0.25   | Is the player familiar with or capable of understanding/executing this behavior?          |
| OperationalComplexity        | 0.25   | Does the action require complex skill or specific maneuvers?                              |
| TagAdjustment                | 0.25   | Are there no uncontrollable interference factors hindering the action?                    |

- Tag adjustment:
If the player has tags<playerTags> related to the action, then:
For each tag that clearly benefits the action, add 0.25 to the total success probability.
For each tag that clearly hinders the action, subtract 0.25 for each such tag.
The tag adjustment is cumulative (e.g., 2 beneficial tags add +0.5, 1 hindering tag subtracts 0.25).



Important Output Instructions:
- Return the result in a strict JSON object format, as shown below.
- !!! Attention: All text values should match the tone and language of <worldState.worldSet> (e.g., if worldset(from the reference) is in Chinese, all text values should be in Chinese).
- Do NOT include any commentary, explanation, or Markdown — return ONLY the JSON object.

Output format:
  {
  "successProbability":number,//the result above, if the action fails to pass any Mandatory Pass Gate, set "successProbability": 0, and provide an "explanation" object that summarizes the core reason and offering a hint for adjustment.
  "explanation":""//Only exists when fails to pass any Mandatory Pass Gate
}`;
    const responProbability = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: proptProbability }],
        temperature: 0.7
      })
    });
    const probabilityData = await responProbability.json();
    let probabilityState;
    try {
      probabilityState = JSON.parse(probabilityData.choices[0].message.content);
    } catch (e) {
      const cleaned3 = probabilityData.choices[0].message.content
        .replace(/```json|```/g, '')
        .trim();
      probabilityState = JSON.parse(cleaned3);
    }
    saveResponse(probabilityState, "responProbability");
    const totalRate = probabilityState.successProbability * playerInfo.luck * 2;
    const randomVal2 = Number(Math.random().toFixed(3));
    let isSuccess = false;
    isSuccess = randomVal2 < totalRate;

    const promptScene = `
    You are a narrative game system assistant.
You will be provided with a structured Reference Object that defines the current state of a fictional interactive narrative world. It contains:
- worldSet:A full world description
- lifeTiers:The lifeform levels that may plausibly exist in that world
- playerInfo:player's detailed information
- playerEquipment:player's equipment
- plotRecords:Plot progression and log
- playerAction:Player's actions
- playerTags:Summary of player traits that may affect plot and action success rates
- LastItems:Previous-Scene-interactive items (excluding player's equipment)
- randomEvents: The active creatures that cause some unexpected events in the current scene. 
- LastCreatures: All creatures currently present in previous scene and possibly still present in the current scene, including both visible and hidden entities.
- levelUpInfo: Recent level-ups by the player.
- previousScene: the environment of the previous scene.
- storyLine: a value with true/flase
Use this information as the authoritative reference for all world logic, background consistency, and cultural tone.


Reference Object:
<--- Begin Reference Object --->
  worldSet: ${worldSet},
  lifeTiers: ${worldLife},
  playerInfo: ${playerInfo},
  playerEquipment: ${playerEquipment},
  plotRecords: ${plotRecords.slice(-10).join('\n')},
  playerAction: ${input},
  playerTags:${playerInfo.tag},
  LastItems: ${interactiveItems},
  randomEvents: ${scenes[scenes.length - 1].activeCreatures || 'None'},
  LastCreatures: ${interactiveCreatures},
  levelUpInfo: ${levelUpInfo || 'None'},
  previousScene: ${previousScene},
  storyLine: ${isSuccess}

<--- End Reference Object --->

Task:
1. First, check the value of storyLine.
If storyLine is true, generate only the successScene.
If storyLine is false, generate only the failureScene.
Do not generate both scenes under any condition.
Based on the reference, return a strict JSON object as per the required format and requirements below.
2. Ensure that all output content strictly aligns with the cultural logic, technological level, tone, and internal consistency of the reference world.
3. Based on the provided worldLife tiers<lifeTiers> to determine the strength/role/status of characters, creatures, or factions.


Important Output Instructions:
- Return the result in a strict JSON object format, as shown below.
- !!! Attention: All text values should match the tone and language of <worldSet> (e.g., if worldset(from the reference) is in Chinese, all text values should be in Chinese).
- Do NOT include any commentary, explanation, or Markdown — return ONLY the JSON object.


Output format:
  {
  "successScene": [  
  // Maintain location/time/weather continuity from <previousScene>,
  // scene must include both rewardPool and penaltyPool. Note: rewardPool and penaltyPool does not cover tag(<playerTags>) gains or losses — those should be handled elsewhere.
  // Ensure that any specific item included in rewardPool or penaltyPool is not also generated in interactiveCreatures.
  // Current scene is <successScene>, meaning the player successfully performed the <playerAction>.
  // The rewardPool and penaltyPool should reflect two sources(in successScene):1. The direct consequences of the player's action; 2. The narrative developments that follow after the successful action.
    { 
      "plot": "",
      // Plot generation rules:
      // 1. If <levelUpInfo> is not empty, generate a long-form narrative that builds upon <plotRecords>,
      //    providing a logical and immersive explanation for the player's life level increase.
      // 2. Describe the outcome of <playerAction>, incorporating relevant consequences and environmental feedback.
      // 3. Continue the plot logically from previous <plotRecords>, maintaining narrative coherence and pacing.
      // 4. If a creature appears in the current plot:
      //    a) Determine whether it is a new entity not mentioned in previous <plotRecords>.
      //    b) If it is NOT new, compare against <LastCreatures> by matching the "name".
      //       If found, use its existing data to ensure consistency.
      //       If not found or it is new, generate new creature details consistent with the <worldSet> and <plotRecords>.
      // 5. If <randomEvents> is not empty, introduce one or more random events. These events must be directly related to the organisms listed in <randomEvents>.

      "newTag": [""...],
      // Tag update rules:
      // 1. Based on the current <playerTags>, recent <plotRecords>, and the newly generated <plot>, produce an updated set of player tags.
      // 2. The new tags must strictly reflect observable, objective traits or states—such as physical condition, acquired skills, or environmental effects.
      // 3. Do NOT include personality traits, emotional states, or internal attitudes (e.g., no "brave", "cowardly", "curious").
      //    a) Valid examples include: "wounded", "infected", "mechanics-trained", "radiation-exposed", "zombie-killer", "night-vision-acquired".
      // 4. Tags must align with the logical progression of the narrative, be consistent with the <worldSet>, and reflect plausible developments from the player's actions<playerAction> or experiences<plotRecords>.
      // 5. Avoid duplicating existing tags unless a significant enhancement or progression justifies it.

      "sceneId": ${scenes[scenes.length - 1].sceneId + 1},

      "location": "",
      // location update rules:
      // 1. Player's location in this scene, e.g., "Office".
      // 2. Unless the plot above necessitates a change(e.g, the player exited the office), maintain location.
      // 3. If a change in location is required by the plot, ensure it transitions logically from the plot you generated.

      "description": "",
      // Brief description of the environment and background of the current location.
      // If the location has changed, maintain logical continuity from <previousScene.description>.
  
      "time": "",
      // Current approximate time (e.g., "Dusk").
      // Unless the plot above necessitates a change, maintain time.
      // If time has changed, ensure continuity and logical progression from <previousScene.time>, and ensure consistency with the current plot context.

      "weather": "",
      // Current weather conditions (e.g., "Rainy").
      // Unless the plot above necessitates a change, maintain weather.
      // If weather has changed, maintain logical continuity from <previousScene.weather>,
      // Consistent with the ongoing plot development.

      "terrain": "",
      // Description of the terrain type (e.g., "Urban", "Forest").
      // Unless the plot above necessitates a change, maintain terrain.
      // If need to change, ensure continuity and logical transition from <previousScene.terrain>,
      // reflecting the context of the current narrative.
      // Consistent with the ongoing plot development.

      "rewardPool": [
      // rewardPool generation rules:
      // 1. Includes new items, health, information (no thins about player's tag) the player gains in this scene. For example: if the action was “pick up an item”, that item must appear in the rewardPool.
      // 2. May be empty but reasonable
        {
          "name": "String",           // Name of the benefit gained
          "type": "Health / Equipment / StoryItem / Consumable / Information / Junk",
          "description": "String",    // How this helps the player or reflects growth
          "amount": Number (if applicable) // e.g., HP Add
        }
      ],

      "penaltyPool": [
      // penaltyPool generation rules:
      // 1. Includes any cost or resource loss incurred during the action. For example: if the action was “drink poison”, and the poison was in <playerEquipment>, the poison should be removed and added to penaltyPool, along with related health loss.
      // 2. May be empty but reasonable
        {
         "name": "String",           // Name of the loss or negative effect
         "type": "Health / Equipment / StoryItem / Consumable / Information",
         "description": "String",    // How this harms or hinders the player
         "amount": Number (if applicable) // e.g., HP lost
        }
      ],

      "interactiveItems": [ 
      // interactiveItems generation rules:
      // 1. Start from the existing <LastItems> list:
      //    - Logically remove any items no longer relevant based on the newly generated <plot>.
      //    - Add any new items introduced or discovered in the current <plot>.
      // 2. For items that exist in both <LastItems> and current <plot>:
      //    - Match by "name" to reuse the original item object, preserving continuity (include "itemId").
      //    - Do NOT regenerate description or properties for reused items.
      // 3. For newly introduced items (not found in <LastItems>):
      //    - Generate new entries with "name", "type", "description".
      //    - Do NOT include "itemId" — it will be assigned by the system later.
      // 4. Item "type" must be one of: "StoryItem", "Equipment", "Consumable", "Junk".
      //    - Ensure consistency with the current <worldSet> tone and scene context.
      // 5. Item "description" should reflect how the item benefits the player or story (e.g., unlocks, heals, upgrades, or clues).
      // 6. Avoid duplicates in "name" unless intentionally designed variants (e.g., "Rusty Key A", "Rusty Key B").
      // 7. Only include items that the player can plausibly see, hold, or interact with in this scene. Hidden or unreachable items should be excluded.
       {
        "itemId": "only if reused from <LastItems>",
        "name": "Ancient Coin",
        "type": "StoryItem",
        "description": "Might be used to activate an old mechanism in the ruins."
        },...],

      "interactiveCreatures": [
      // interactiveCreatures generation rules:
      // 1. Starting from the existing <LastCreatures> list:
      //    - Logically remove any creatures that are no longer relevant based on the current plot.
      //    - Add any new creatures introduced in the current plot.
      // 2. For creatures that appear in both the previous and current plot:
      //    - Find them by matching the "name" in <LastCreatures>.
      //    - Reuse their existing data to maintain continuity.
      // 3. For newly introduced creatures not found in <LastCreatures>:
      //    - Generate new entries consistent with the <worldSet> and current plot context.
      // 3. If a creature is not visible to the player (e.g. hiding, in the shadows, in another room) on this plot right now, set "visibleToPlayer": false.
      // 4. Each creature name must be unique. For generic types, append a letter (e.g., "Zombie A", "Mutant B").
      // 5. The creature's lifeFormLevel must conform to <lifeTiers> and the <worldSet> tone.
      // 6. Behavior must align with current world logic and scene context.
        {
        "name": "",                         // e.g., "Zombie A", "Nurse Clara"
        "gender": "Male / Female / Other",
        "age": Number,
        "type": "NPC / Enemy / Unknown",   // NPC = neutral/friendly; Enemy = hostile; Unknown = unclear intent
        "fate": Float(0~1),                // Probability of interaction with the player in the current scene
        "appearance": "Brief description of the creature's look",
        "behavior": "Friendly / Hostile / Neutral / Unknown",
        "description": "Creature's brief background or narrative significance",
        "lifeFormLevel": Integer(0~10),    // 
        "health": Integer(0~100),          // Current health percentage
        "visibleToPlayer": true / false    // true = player sees the creature now; false = hidden or not yet discovered
        }
      ],
    }
  ],
  "failureScene": [ // Structure identical to successScene, sceneId: ${scenes[scenes.length - 1].sceneId + 1}
  // failureScene means the player failed to perform the <playerAction>.
  // The rewardPool and penaltyPool should reflect only the consequences of failing the action.
  //
  // rewardPool (Gains):
  // - Usually empty unless the failure itself triggers a beneficial result (e.g., unexpected information, sympathy, or item).
  //
  // penaltyPool (Losses):
  // - Includes penalties caused by the failed action, such as damage taken, item loss, or equipment degradation.
  // - For example: if the failed action was “attack zombie”, this could result in HP -20 or weapon loses.
    ...
  ],
}`;
    const responseScene = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [{ role: 'user', content: promptScene }],
        temperature: 0.7
      })
    });
    const sceneData = await responseScene.json();
    let result;
    try {
      result = JSON.parse(sceneData.choices[0].message.content);
    } catch (e) {
      const cleaned = sceneData.choices[0].message.content
        .replace(/```(?:json)?/gi, '')
        .trim();
      result = JSON.parse(cleaned);
    }
    saveResponse(result, "responseScene");

    let next = (isSuccess ? result.successScene : result.failureScene);
    logDebugInfo(`[${next[0].sceneId}.Plot Direction]totalRate=${totalRate} > random=${randomVal2} ? isSuccess=${isSuccess}`);

    next[0].interactiveItems.forEach(item => {
      if (!item.itemId) {
        item.itemId = Date.now() + '-' + Math.floor(Math.random() * 1000)
        logDebugInfo(`[${next[0].sceneId}.New Item]=${item.itemId}`);
      }
    });
    next[0].interactiveCreatures.forEach(item => {
      if (!item.creatureId) {
        item.creatureId = Date.now() + '-' + Math.floor(Math.random() * 1000)
        logDebugInfo(`[${next[0].sceneId}.New Creature]=${item.creatureId}`);
      }
    })
    if (next[0].rewardPool) {
      const reward = next[0].rewardPool;
      reward.forEach(red => {
        if (red.type === "StoryItem" || red.type === "Equipment" || red.type === "Consumable" || red.type === "Junk") {
          playerEquipment.push(red);
          outcomeText += `\n(You gained: ${red.name}, ${red.description})`;
        } else if (red.type === "Health") {
          playerInfo.health += red.amount;
          if (playerInfo.health > 100) {
            playerInfo.health = 100;
          }
          outcomeText += `\n(Your health increased by ${red.amount}, now ${playerInfo.health})`;
        } else if (red.type === "Information") {
          outcomeText += `\n(You knew: ${red.name}, ${red.description})`
        }
      });
    }
    if (next[0].penaltyPool) {
      const penalty = next[0].penaltyPool;
      penalty.forEach(pen => {
        if (pen.type === "Health" || pen.type === "StoryItem" || pen.type === "Equipment" || pen.type === "Consumable" || pen.type === "Junk") {
          outcomeText += `\n(You suffered loss: ${pen.description})`;
          if (pen.type === "Health") {
            playerInfo.health -= pen.amount;
            if (playerInfo.health <= 0) {
              outcomeText += "\nYou collapsed. Story ends...";
              game.gameOver = true;
              saveGameState(game);
            }
          } else if (pen.type === "StoryItem" || pen.type === "Equipment" || pen.type === "Consumable") {
            playerEquipment.forEach((item, index) => {
              if (item.name === pen.name) {
                outcomeText += `\n「${item.name}」was lost.`;
                playerEquipment.splice(index, 1);
              }
            });
          }
        }
      });
    }
    playerInfo.tag = next[0].newTag;

    const keysToDelete = ['newTag', 'rewardPool', 'penaltyPool'];
    for (const key of keysToDelete) {
      delete next[0][key];
    }
    // Update records
    game.scenes.push(next[0] || {});
    game.playerInfo = playerInfo;
    game.playerEquipment = playerEquipment;
    game.history.push(`> ${input} \n${outcomeText} `);
    game.plotRecords.push(`\n${next[0].plot}`);
    saveGameState(game);

    let resData = JSON.parse(JSON.stringify(game));
    resData.scenes[0].interactiveCreatures = resData.scenes[0].interactiveCreatures.filter(bio => bio.visibleToPlayer === true);
    res.json({ message: "Action processed successfully", state: resData })
  } catch (error) {
    console.error('❌ Action processing failed:', error.message);
    res.status(500).json({ error: 'Generation failed', details: error.message });
  }
});
// Get current state
app.get('/api/state', (req, res) => {
  try {
    const game = getGameState();
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read state' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});