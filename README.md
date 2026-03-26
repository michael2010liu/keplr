# Keplr — Setup Guide

## Your folder should look like this
```
keplr/
  server.js          ← the backend
  package.json       ← dependencies
  keplr-app.html     ← the app frontend
  keplr.html         ← the landing page
```

## Step 1 — Install dependencies
Open Terminal, navigate to your folder, run:
```bash
npm install
```

## Step 2 — Add your Anthropic API key
In Terminal, run this (replace with your actual key):
```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```
You can find your key at console.anthropic.com

## Step 3 — Start the server
```bash
node server.js
```
You should see:
```
  Keplr server running at http://localhost:3000
```

## Step 4 — Open the app
Open your browser and go to:
```
http://localhost:3000/keplr-app.html
```

---

## How to wire the frontend to the backend

In keplr-app.html, find the `startGeneration()` function and replace it with:

```javascript
async function startGeneration() {
  const text = document.getElementById('main-input').value.trim();
  if (!text) return;

  showView('loading-view');
  runLoadingSteps();

  try {
    const response = await fetch('http://localhost:3000/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const data = await response.json();

    if (data.error) {
      alert(data.error);
      goBack();
      return;
    }

    // data.simulation now has: title, description, variables, insights, concepts, quiz, scenarios
    // use this to populate the simulation view
    currentSimulation = data.simulation;
    showView('sim-view');
    initSim(data.simulation);

  } catch (error) {
    alert('Could not connect to server. Make sure node server.js is running.');
    goBack();
  }
}
```

---

## Notes
- The server must be running for the app to work
- Every time you open a new Terminal window you need to re-run `export ANTHROPIC_API_KEY=...`
- To avoid retyping the key every time, add it to your ~/.zshrc file
