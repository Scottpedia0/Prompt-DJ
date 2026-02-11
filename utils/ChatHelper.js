/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from '@google/genai';

export class ChatHelper {

  constructor(ai, model = 'gemini-3-flash-preview') {
    this.ai = ai;
    this.model = model;
  }

  async sendCommand(text, currentPrompts, currentBpm) {
    const promptList = currentPrompts.map(p => `"${p.text}" (vol: ${p.weight.toFixed(1)})`).join(', ');
    const bpmInfo = currentBpm === 'Auto' ? 'Auto' : `${currentBpm} BPM`;
    
    const systemPrompt = `
      You are an expert Music Producer AI controlling a generative music engine (Lyria).
      The user speaks in high-level genres (e.g., "50s surf", "techno", "classical") or Stylistic Parameters.
      
      **PARAMETER CONTROL IS CRITICAL**:
      Users often want to change the *feel* without adding instruments. Use 'adjust_settings' for this.
      - **"Make it darker"** -> adjust_settings("brightness", "0.2")
      - **"Make it brighter"** -> adjust_settings("brightness", "0.8")
      - **"More intense/busy/dense"** -> adjust_settings("density", "0.9")
      - **"Simpler/sparse/minimal"** -> adjust_settings("density", "0.2")
      - **"Go wild/experimental"** -> adjust_settings("temperature", "1.5")
      - **"Make it consistent/stable"** -> adjust_settings("temperature", "0.6")
      - **"Faster"** -> set_tempo(current + 20)
      - **"Slower"** -> set_tempo(current - 20)
      - **"No Drums"** -> adjust_settings("muteDrums", "true")

      **RULES FOR STEMS**:
      1. **Volume Management**: Use strong weights (0.9 - 1.0) for primary instruments.
      2. **Archetypes**: Be specific (e.g. "Upright Bass", "808 Kick").
      3. **Labels**: Keep description text SHORT (Max 5-6 words).
      4. **Context**: Match instruments to the genre.
      5. **Clear All**: If the genre changes completely, clear all previous stems first.

      Current Mix State:
      - Active Stems: [${promptList}]
      - Tempo: ${bpmInfo}

      Available Tools:
      - add_prompt(text: string, weight: number): Add a stem.
      - remove_prompt(text: string): Remove a stem matching text.
      - clear_all(): Clear everything. Use this when changing genres.
      - set_tempo(bpm: number): Set BPM.
      - adjust_settings(setting: string, value: string): Global settings.
         - 'density' (0.0-1.0)
         - 'brightness' (0.0-1.0)
         - 'temperature' (0.0-2.0)
         - 'muteBass' (true/false)
         - 'muteDrums' (true/false)

      EXAMPLES:
      
      User: "Make it 50s Surf"
      -> clear_all()
      -> add_prompt("Surf Rock Fender Jaguar Reverb", 1.0)
      -> add_prompt("Fast 50s Acoustic Drums", 1.0)
      -> add_prompt("Clean Precision Bass", 1.0)
      -> set_tempo(160)
      -> adjust_settings("brightness", "0.8")

      User: "Make it darker and slower"
      -> adjust_settings("brightness", "0.3")
      -> set_tempo(80)

      User: "Go crazy with it"
      -> adjust_settings("temperature", "1.6")
      -> adjust_settings("density", "0.9")
    `;

    const tools = [{
      functionDeclarations: [
        {
          name: 'add_prompt',
          description: 'Add a specific instrument stem to the mix.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: 'Short descriptive instrument name (max 6 words).' },
              weight: { type: Type.NUMBER, description: 'Volume (0.0 to 1.0).' }
            },
            required: ['text']
          }
        },
        {
          name: 'remove_prompt',
          description: 'Remove a prompt matching the description.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: 'The text to match for removal.' }
            },
            required: ['text']
          }
        },
        {
          name: 'clear_all',
          description: 'Clear all active prompts. Mandatory when switching genres.',
          parameters: {
            type: Type.OBJECT,
            properties: {},
          }
        },
        {
          name: 'set_tempo',
          description: 'Set the music tempo in BPM.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              bpm: { type: Type.NUMBER, description: 'The new BPM value.' }
            },
            required: ['bpm']
          }
        },
        {
          name: 'adjust_settings',
          description: 'Adjust global music settings.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              setting: { type: Type.STRING, description: 'density, brightness, temperature, muteBass, muteDrums' },
              value: { type: Type.STRING, description: 'Value for the setting' } 
            },
            required: ['setting', 'value']
          }
        }
      ]
    }];

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\nUser Request: ' + text }] }
        ],
        config: {
          tools: tools,
          temperature: 1.0, 
        }
      });

      const actions = [];
      const calls = response.functionCalls;

      if (calls) {
        for (const call of calls) {
          if (call.name === 'add_prompt') {
            const args = call.args;
            let w = args.weight ?? 1.0;
            if (w < 0.2) w = 0.5; 
            actions.push({ type: 'addPrompt', data: { text: args.text, weight: w } });
          } else if (call.name === 'remove_prompt') {
            const args = call.args;
            actions.push({ type: 'removePrompt', data: { text: args.text } });
          } else if (call.name === 'clear_all') {
            actions.push({ type: 'clearAll' });
          } else if (call.name === 'set_tempo') {
            const args = call.args;
            actions.push({ type: 'setBpm', data: { bpm: args.bpm } });
          } else if (call.name === 'adjust_settings') {
            const args = call.args;
            // Handle value types roughly
            let val = args.value;
            if (args.setting.startsWith('mute')) {
                val = val === 'true' || val === true;
            } else {
                val = Number(val);
            }
            actions.push({ type: 'setGlobal', data: { key: args.setting, value: val } });
          }
        }
      }
      
      return actions;

    } catch (e) {
      console.error('ChatHelper Error:', e);
      return [];
    }
  }
}
