# llm_text_adventure
A game demo
# llm_text_adventure
A game demo

# LLM Text Adventure Game — Technical Guide

## Overview

This is an AI-powered immersive text adventure game. Players provide a world setting and character background, and the AI dynamically generates a unique game world and storyline. Players can freely explore, interact, and make choices that drive the story forward.

---

## Quick Start

### 1. Environment Setup

- Please install [Node.js](https://nodejs.org), preferably the latest LTS version.

### 2. Get the Project Files

- Clone the repository using Git:

  ```bash
  git clone https://github.com/your-username/llm-text-adventure-game.git
  cd llm-text-adventure-game
  ```

- Or download the ZIP archive from GitHub, extract it, and open the project folder.

### 3. Install Dependencies

Inside the project folder, run:

```bash
npm install
```

---

## Configure Your AI API Key

1. Register and obtain an API Key:

   - Visit [https://platform.deepseek.com](https://platform.deepseek.com) and create an account.
   - After logging in, go to the "API Keys" section and create a new key. Copy your API Key.

2. Create a `.env` file in the project root (if not present).

3. Add your API Key to the `.env` file like this:

   ```
   API_KEY=your_DeepSeek_API_Key
   ```

   Example:

   ```
   API_KEY=ds-1234567890abcdef
   ```

---

## Run the Game

In the project folder, start the server by running:

```bash
node server.js
```

Open your browser and visit:

```
http://localhost:3000
```

You can now start playing the text adventure game.

---

## Notes

- Keep the terminal open while playing; closing it will stop the game server.
- Make sure Node.js and dependencies are properly installed.
- Verify that your API Key is correctly set in the `.env` file.

---

Enjoy your adventure!
