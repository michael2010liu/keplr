require('dotenv').config();
// ─────────────────────────────────────────────
//  Keplr — Backend Server
//  Run: node server.js
//  Endpoint: POST /generate
// ─────────────────────────────────────────────

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors');

const app = express();
const PORT = 3000;

// ── MIDDLEWARE ──
app.use(cors());                    // allows your HTML file to call this server
app.use(express.json());            // parses incoming JSON from the frontend
app.use(express.static('.'));       // serves your HTML files from the same folder

// ── ANTHROPIC CLIENT ──
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,  // set this in your terminal before running
});

// ─────────────────────────────────────────────
//  THE PROMPT
//  This is the core of the whole product.
//  Tweak this until simulations feel right.
// ─────────────────────────────────────────────
function buildPrompt(userText) {
  return `You are Keplr, an educational simulation engine. Your job is to read source material and extract a structured simulation that a student can interact with to build intuition.

Given the source material below, return a JSON object with this EXACT structure. Return ONLY the JSON — no explanation, no markdown, no backticks.

{
  "title": "Short title for this concept (max 6 words)",
  "subject": "The subject area, e.g. AP Biology, AP Chemistry, College Physics",
  "description": "One sentence describing what the student will explore (max 20 words)",
  "variables": [
    {
      "id": "unique_id",
      "label": "Human-readable label",
      "unit": "Unit of measurement, e.g. M, m/s, °C",
      "min": 0,
      "max": 100,
      "default": 50,
      "description": "What this variable represents in one sentence"
    }
  ],
  "insights": [
    {
      "condition": "A short description of when this insight fires, e.g. 'when variable_a is much greater than variable_b'",
      "text": "The insight text shown to the student. Use plain language. Explain the why, not just the what. Max 2 sentences."
    }
  ],
  "concepts": [
    {
      "term": "Key term from the source",
      "definition": "Plain language definition, max 1 sentence"
    }
  ],
  "quiz": [
    {
      "question": "A question that tests real understanding, not memorization",
      "options": ["option A", "option B", "option C", "option D"],
      "correct": 0,
      "explanation": "Why the correct answer is right. Connect it to the simulation the student just used."
    }
  ],
  "scenarios": [
    {
      "label": "Scenario name",
      "description": "One line — what real-world situation does this represent?",
      "values": { "variable_id": value }
    }
  ]
}

Rules:
- variables: include 2-3 variables maximum. More than 3 is overwhelming.
- insights: write 4-6 insights covering different states of the simulation (equilibrium, extremes, interesting midpoints)
- concepts: extract 4-6 key terms directly from the source material
- quiz: write 3-4 questions. Make them application questions, not definition recall.
- scenarios: write 3-4 real-world scenarios that map to specific variable values
- All numbers (min, max, default, values) must be actual numbers, not strings
- The "correct" field in quiz must be the index (0-3) of the correct option in the options array

Source material:
${userText}`;
}

// ─────────────────────────────────────────────
//  POST /generate
//  Frontend sends: { text: "user's pasted content" }
//  Backend returns: { simulation: { ...structured data } }
// ─────────────────────────────────────────────
app.post('/generate', async (req, res) => {
  const { text } = req.body;

  // basic validation
  if (!text || text.trim().length < 10) {
    return res.status(400).json({ error: 'Please provide some source material.' });
  }

  if (text.trim().length > 10000) {
    return res.status(400).json({ error: 'Text too long. Please paste a shorter excerpt (under 10,000 characters).' });
  }

  try {
    console.log(`\n[Keplr] Generating simulation for: "${text.slice(0, 60)}..."`);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: buildPrompt(text),
        },
      ],
    });

    const rawText = message.content[0].text;

    // safely parse the JSON Claude returns
    let simulation;
    try {
      simulation = JSON.parse(rawText);
    } catch (parseError) {
      // sometimes Claude adds a tiny bit of text before/after — strip it
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        simulation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Claude returned invalid JSON. Try rephrasing your input.');
      }
    }

    console.log(`[Keplr] ✓ Generated: "${simulation.title}"`);
    res.json({ simulation });

  } catch (error) {
    console.error('[Keplr] Error:', error.message);
    res.status(500).json({
      error: error.message || 'Something went wrong generating the simulation.',
    });
  }
});

// ── HEALTH CHECK ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', product: 'Keplr' });
});

// ── START ──
app.listen(PORT, () => {
  console.log(`\n  Keplr server running at http://localhost:${PORT}`);
  console.log(`  Open keplr-app.html in your browser to use the app\n`);
});
