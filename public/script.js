document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const initForm = document.getElementById('init-form');
  const gameContainer = document.getElementById('game-container');
  const gameOverScreen = document.getElementById('game-over');
  const worldSettingInput = document.getElementById('world-setting');
  const characterDescInput = document.getElementById('character-description');
  const initBtn = document.getElementById('init-btn');
  const actionInput = document.getElementById('action-input');
  const actionBtn = document.getElementById('action-btn');
  const restartBtn = document.querySelector('.restart-btn');

  // Player elements
  const playerName = document.getElementById('player-name');
  const playerBackground = document.getElementById('player-background');
  const playerGender = document.getElementById('player-gender');
  const playerAge = document.getElementById('player-age');
  const playerAppearance = document.getElementById('player-appearance');
  const playerHealth = document.getElementById('player-health');
  const healthBar = document.getElementById('health-bar');
  const playerLevel = document.getElementById('player-level');
  const levelValue = document.getElementById('level-value');
  const levelProgress = document.getElementById('level-progress');
  const playerLuck = document.getElementById('player-luck');
  const tagsContainer = document.getElementById('tags-container');
  const equipmentContainer = document.getElementById('equipment-container');

  // Scene elements
  const sceneLocation = document.getElementById('scene-location');
  const sceneTime = document.getElementById('scene-time');
  const sceneWeather = document.getElementById('scene-weather');
  const sceneTerrain = document.getElementById('scene-terrain');
  const sceneDescription = document.getElementById('scene-description');
  const interactiveItems = document.getElementById('interactive-items');
  const interactiveCreatures = document.getElementById('interactive-creatures');

  // Log elements
  const currentPlot = document.getElementById('current-plot');
  const actionLog = document.getElementById('action-log');
  const fullPlot = document.getElementById('full-plot');
  const tabs = document.querySelectorAll('.tab');

  // Game state
  let gameState = {
    gameOver: false
  };

  // Initialize game
  initBtn.addEventListener('click', async () => {
    const worldSetting = worldSettingInput.value.trim();
    const characterDescription = characterDescInput.value.trim();

    if (!worldSetting || !characterDescription) {
      alert('Please fill in both fields');
      return;
    }

    // Show loading state
    initBtn.innerHTML = '<div class="loader"></div> Initializing...';
    initBtn.disabled = true;

    try {
      const response = await fetch('/api/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          worldSetting,
          characterDescription
        })
      });

      const data = await response.json();
      if (response.ok) {
        gameState = data.state;
        initForm.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        updateUI();
      } else {
        throw new Error(data.error || 'Initialization failed');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error(error);
    } finally {
      initBtn.innerHTML = 'Start Adventure';
      initBtn.disabled = false;
    }
  });

  // Submit action
  actionBtn.addEventListener('click', submitAction);
  actionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitAction();
  });

  async function submitAction() {
    const action = actionInput.value.trim();
    if (!action || gameState.gameOver) return;

    // Show loading state
    actionBtn.innerHTML = '<div class="loader"></div> Processing...';
    actionBtn.disabled = true;
    actionInput.disabled = true;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: action
        })
      });

      const data = await response.json();
      if (response.ok) {
        gameState = data.state;
        updateUI();
        actionInput.value = '';

        if (gameState.gameOver) {
          document.getElementById('game-over-message').textContent =
            "You have succumbed to your injuries. Your journey ends here.";
          gameOverScreen.classList.remove('hidden');
        }
      } else {
        throw new Error(data.error || 'Action processing failed');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error(error);
    } finally {
      actionBtn.innerHTML = 'Submit Action';
      actionBtn.disabled = false;
      actionInput.disabled = false;
      actionInput.focus();
    }
  }

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      currentPlot.classList.add('hidden');
      actionLog.classList.add('hidden');
      fullPlot.classList.add('hidden');

      document.getElementById(`${tab.dataset.tab}-plot`).classList.remove('hidden');
    });
  });

  // Restart game
  restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    gameContainer.classList.add('hidden');
    initForm.classList.remove('hidden');
  });

  // Update UI with current game state
  function updateUI() {
    if (!gameState.playerInfo) return;

    // Update player info
    const player = gameState.playerInfo;
    playerName.textContent = player.name;
    playerBackground.textContent = player.background;
    playerGender.textContent = player.gender;
    playerAge.textContent = player.age;
    playerAppearance.textContent = player.appearance;

    // Health bar
    playerHealth.textContent = `${player.health}%`;
    healthBar.style.width = `${player.health}%`;
    healthBar.className = 'health-bar ';
    if (player.health > 70) healthBar.classList.add('health-high');
    else if (player.health > 30) healthBar.classList.add('health-medium');
    else healthBar.classList.add('health-low');

    // Life form level
    const levelInfo = LIFE_TIERS.find(tier => tier.level === player.lifeFormLevel);
    playerLevel.textContent = `Level ${player.lifeFormLevel}: ${levelInfo.name}`;
    levelValue.textContent = `${player.lifeFormLevel}/10`;
    levelProgress.style.width = `${player.lifeFormLevel * 10}%`;

    // Luck
    playerLuck.textContent = `${Math.round(player.luck * 100)}%`;

    // Tags
    tagsContainer.innerHTML = '';
    player.tag.forEach(tag => {
      const tagElement = document.createElement('div');
      tagElement.className = 'tag';
      tagElement.textContent = tag;
      tagsContainer.appendChild(tagElement);
    });

    // Equipment
    equipmentContainer.innerHTML = '';
    gameState.playerEquipment.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'equipment-item';

      // Determine icon based on type
      let icon = '📦';
      if (item.type === 'Equipment') icon = '⚔️';
      if (item.type === 'Consumable') icon = '🍖';

      itemElement.innerHTML = `
                    <div class="equipment-icon">${icon}</div>
                    <div class="equipment-info">
                        <h4>${item.name}</h4>
                        <p>${item.description}</p>
                    </div>
                `;
      equipmentContainer.appendChild(itemElement);
    });

    // Update current scene
    const currentScene = gameState.scenes[gameState.scenes.length - 1];
    sceneLocation.textContent = currentScene.location;
    sceneTime.textContent = currentScene.time;
    sceneWeather.textContent = currentScene.weather;
    sceneTerrain.textContent = currentScene.terrain;
    sceneDescription.textContent = currentScene.description;

    // Interactive items
    interactiveItems.innerHTML = '';
    currentScene.interactiveItems.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'interactive-item';

      itemElement.innerHTML = `
                    <div class="interactive-header">
                        <h4>${item.name}</h4>
                        <span class="interactive-type">${item.type}</span>
                    </div>
                    <p>${item.description}</p>
                `;
      interactiveItems.appendChild(itemElement);
    });

    // Interactive creatures
    interactiveCreatures.innerHTML = '';
    currentScene.interactiveCreatures.forEach(creature => {
      const creatureElement = document.createElement('div');
      creatureElement.className = 'interactive-item';

      // Determine health status
      let healthClass = 'status-high';
      if (creature.health <= 70) healthClass = 'status-medium';
      if (creature.health <= 30) healthClass = 'status-low';

      // Faction class
      const factionClass = `faction-${creature.type.toLowerCase()}`;

      creatureElement.innerHTML = `
                    <div class="interactive-header">
                        <h4 class="${factionClass}">${creature.name}</h4>
                        <div class="health-indicator">
                            <span class="status-dot ${healthClass}"></span>
                            <span>${creature.health}%</span>
                        </div>
                    </div>
                    <p><span class="${factionClass}">${creature.type}</span> • Level ${creature.lifeFormLevel}</p>
                    <p>${creature.behavior}, ${creature.description}</p>
                `;
      interactiveCreatures.appendChild(creatureElement);
    });

    // Update logs
    currentPlot.innerHTML = `<p>${currentScene.plot}</p>`;

    // Update action log
    actionLog.innerHTML = '';
    gameState.history.slice().reverse().forEach(entry => {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      logEntry.innerHTML = `<div class="log-action">${entry.split('\n')[0]}</div>
                                     <div class="log-outcome">${entry.split('\n').slice(1).join('<br>')}</div>`;
      actionLog.appendChild(logEntry);
    });

    // Update full plot
    fullPlot.innerHTML = '';
    gameState.plotRecords.forEach(plot => {
      const plotEntry = document.createElement('div');
      plotEntry.className = 'log-entry';
      plotEntry.innerHTML = `<p>${plot}</p>`;
      fullPlot.appendChild(plotEntry);
    });

    // Auto-scroll logs to bottom
    document.querySelector('.tab-content').scrollTop = document.querySelector('.tab-content').scrollHeight;
  }

  // Life tiers constant
  const LIFE_TIERS = [
    { level: 0, name: "Weakling", description: "Severely ill elder/newborn chick" },
    { level: 1, name: "Average Person", description: "Ordinary citizen" },
    { level: 2, name: "Marine", description: "Special forces soldier" },
    { level: 3, name: "Human Peak", description: "Bruce Lee/Mike Tyson" },
    { level: 4, name: "Mild Superhuman", description: "Batman" },
    { level: 5, name: "Moderate Superhuman", description: "Spider-Man/Storm" },
    { level: 6, name: "Advanced Superhuman", description: "Magneto" },
    { level: 7, name: "Master Superhuman", description: "Professor X" },
    { level: 8, name: "Solar System Human", description: "Captain Marvel" },
    { level: 9, name: "Galactic Human", description: "Superman" },
    { level: 10, name: "Cosmic Entity", description: "Dr. Manhattan" },
  ];

  // Check game state periodically
  setInterval(() => {
    if (gameState.gameOver && !gameOverScreen.classList.contains('hidden')) {
      document.getElementById('game-over-message').textContent =
        "You have succumbed to your injuries. Your journey ends here.";
      gameOverScreen.classList.remove('hidden');
    }
  }, 5000);
});