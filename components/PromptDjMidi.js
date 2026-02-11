/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';

import { throttle } from '../utils/throttle.js';

import './PromptController.js';
import './PlayPauseButton.js';
import './AdvancedSettings.js';
import { MidiDispatcher } from '../utils/MidiDispatcher.js';

const DEFAULT_SCENE_NAME = 'Default';

const DEFAULT_SCENES = {
  [DEFAULT_SCENE_NAME]: [
    ['prompt-0', { promptId: 'prompt-0', text: 'irish fiddle with banging toms', weight: 1, cc: 0, color: '#3dffab' }],
    ['prompt-1', { promptId: 'prompt-1', text: 'Tribal drum circle', weight: 1, cc: 1, color: '#ffdd28' }],
    ['prompt-2', { promptId: 'prompt-2', text: 'Punk Bass', weight: 1, cc: 2, color: '#ff25f6' }],
    ['prompt-3', { promptId: 'prompt-3', text: 'Aggressive 808', weight: 0, cc: 3, color: '#9900ff' }],
    ['prompt-4', { promptId: 'prompt-4', text: 'Bossa Nova', weight: 0, cc: 4, color: '#9900ff' }],
    ['prompt-5', { promptId: 'prompt-5', text: 'Chillwave', weight: 0, cc: 5, color: '#5200ff' }],
    ['prompt-6', { promptId: 'prompt-6', text: 'Drum and Bass', weight: 0, cc: 6, color: '#ff25f6' }],
    ['prompt-7', { promptId: 'prompt-7', text: 'Shoegaze', weight: 0, cc: 7, color: '#ffdd28' }]
  ],
  'Ambient Textures': [
    ['prompt-0', { promptId: 'prompt-0', text: 'Lush pads', weight: 1, cc: 0, color: '#3dffab' }],
    ['prompt-1', { promptId: 'prompt-1', text: 'Gentle rain', weight: 0, cc: 1, color: '#28a2ff' }],
    ['prompt-2', { promptId: 'prompt-2', text: 'Distant choir', weight: 0, cc: 2, color: '#ff25f6' }],
    ['prompt-3', { promptId: 'prompt-3', text: 'Slowly evolving drone', weight: 1, cc: 3, color: '#9900ff' }],
    ['prompt-4', { promptId: 'prompt-4', text: 'Glassy synth textures', weight: 0, cc: 4, color: '#9900ff' }],
    ['prompt-5', { promptId: 'prompt-5', text: 'Deep sub bass', weight: 1, cc: 5, color: '#5200ff' }],
    ['prompt-6', { promptId: 'prompt-6', text: 'Breathy flute melody', weight: 0, cc: 6, color: '#ff25f6' }],
    ['prompt-7', { promptId: 'prompt-7', text: 'Soft static crackle', weight: 0, cc: 7, color: '#ffdd28' }]
  ],
  'Synthwave Sunset': [
    ['prompt-0', { promptId: 'prompt-0', text: 'Gated reverb snare', weight: 1, cc: 0, color: '#3dffab' }],
    ['prompt-1', { promptId: 'prompt-1', text: 'Driving bassline', weight: 1, cc: 1, color: '#ffdd28' }],
    ['prompt-2', { promptId: 'prompt-2', text: 'LinnDrum tom fills', weight: 0, cc: 2, color: '#ff25f6' }],
    ['prompt-3', { promptId: 'prompt-3', text: 'Analog synth brass stabs', weight: 0, cc: 3, color: '#9900ff' }],
    ['prompt-4', { promptId: 'prompt-4', text: 'Dreamy Juno-60 pads', weight: 1, cc: 4, color: '#9900ff' }],
    ['prompt-5', { promptId: 'prompt-5', text: 'Electric guitar solo', weight: 0, cc: 5, color: '#5200ff' }],
    ['prompt-6', { promptId: 'prompt-6', text: 'Arpeggiated synth lead', weight: 0, cc: 6, color: '#ff25f6' }],
    ['prompt-7', { promptId: 'prompt-7', text: 'Dark synthwave atmosphere', weight: 0, cc: 7, color: '#ffdd28' }]
  ],
  'Orchestral Tension': [
    ['prompt-0', { promptId: 'prompt-0', text: 'Pizzicato strings', weight: 1, cc: 0, color: '#3dffab' }],
    ['prompt-1', { promptId: 'prompt-1', text: 'Tense string ostinato', weight: 1, cc: 1, color: '#ffdd28' }],
    ['prompt-2', { promptId: 'prompt-2', text: 'Looming low brass', weight: 0, cc: 2, color: '#ff25f6' }],
    ['prompt-3', { promptId: 'prompt-3', text: 'Timpani rolls', weight: 0, cc: 3, color: '#9900ff' }],
    ['prompt-4', { promptId: 'prompt-4', text: 'Ominous cellos', weight: 1, cc: 4, color: '#9900ff' }],
    ['prompt-5', { promptId: 'prompt-5', text: 'High suspenseful violins', weight: 0, cc: 5, color: '#5200ff' }],
    ['prompt-6', { promptId: 'prompt-6', text: 'War drums', weight: 0, cc: 6, color: '#ff25f6' }],
    ['prompt-7', { promptId: 'prompt-7', text: 'French horn melody', weight: 0, cc: 7, color: '#ffdd28' }]
  ]
}

const LOCAL_STORAGE_KEY = 'promptDjMidiScenes_v4';

export class PromptDjMidi extends LitElement {
  static get properties() {
    return {
      prompts: { state: true },
      showMidi: { type: Boolean },
      playbackState: { type: String },
      isRecording: { type: Boolean },
      isProcessingRecording: { type: Boolean },
      audioLevel: { state: true },
      midiInputIds: { state: true },
      activeMidiInputId: { state: true },
      scenes: { state: true },
      activeSceneName: { state: true },
      filteredPrompts: { type: Object },
      chatProcessing: { state: true },
      bpm: { state: true },
      bpmAuto: { state: true },
      density: { state: true },
      densityAuto: { state: true },
      brightness: { state: true },
      brightnessAuto: { state: true },
      temperature: { state: true },
      topK: { state: true },
      muteBass: { state: true },
      muteDrums: { state: true }
    };
  }

  static get styles() {
    return css`
    :host {
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      position: relative;
      background: #08080c;
      color: #e2e2f0;
      font-family: 'Google Sans', sans-serif;
      overflow: hidden; /* Prevent body scroll */
    }
    #background {
      will-change: background-image;
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      z-index: 0;
      background: #08080c;
      opacity: 0.7;
    }
    
    #app-container {
        flex: 1;
        display: flex;
        flex-direction: row; /* Sidebar layout */
        position: relative;
        z-index: 1;
        height: 100%;
        overflow: hidden;
    }

    #main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center; /* Vertically center grid */
      align-items: center;
      padding: 80px 20px 100px 20px;
      overflow-y: auto;
      position: relative;
    }
    
    #grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-auto-rows: 240px; /* Fixed row height for better look */
      gap: 24px;
      width: 100%;
      max-width: 1000px;
    }
    
    prompt-controller {
      width: 100%;
      height: 100%;
    }
    
    /* Top Toolbar */
    #top-buttons {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      display: flex;
      gap: 12px;
      align-items: center;
      z-index: 10;
      background: rgba(13, 13, 20, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 99px;
      border: 1px solid rgba(255,255,255,0.08);
      white-space: nowrap;
      overflow-x: auto;
      max-width: 95vw;
    }
    
    /* Hide scrollbar on top buttons */
    #top-buttons::-webkit-scrollbar { display: none; }

    .control-group {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    
    .divider {
      width: 1px;
      height: 16px;
      background: rgba(255,255,255,0.15);
      margin: 0 6px;
    }

    /* Buttons & Selects */
    button, select {
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      color: #888;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      padding: 6px 12px;
      cursor: pointer;
      transition: all 0.2s;
      outline: none;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    button:hover, select:hover {
      color: #fff;
      background: rgba(255,255,255,0.05);
    }
    
    button.active {
      color: #a0ff00;
      border-color: #a0ff00;
      background: rgba(160, 255, 0, 0.1);
    }

    select {
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      padding-right: 24px;
      appearance: none;
    }

    button.icon-btn {
      width: 32px;
      height: 32px;
      padding: 0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    button.recording.active {
      color: #ff2848;
      border-color: #ff2848;
      background: rgba(255, 40, 72, 0.1);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(255, 40, 72, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(255, 40, 72, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 40, 72, 0); }
    }

    /* Bottom Bar */
    .bottom-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%; /* Spans full width of main content, not sidebar */
      height: 80px;
      background: linear-gradient(to top, rgba(8, 8, 12, 1) 0%, rgba(8, 8, 12, 0.8) 100%);
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 20px;
      z-index: 20;
      backdrop-filter: blur(10px);
    }

    play-pause-button {
      width: 56px;
      height: 56px;
      flex-shrink: 0;
    }

    .chat-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      background: #08080c;
      border: 1px solid #252538;
      border-radius: 12px;
      padding: 0 16px;
      height: 48px;
      transition: border-color 0.2s;
      max-width: 800px;
    }
    
    .chat-wrap:focus-within {
      border-color: #666;
    }

    .chat-in {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      color: #fff;
      font-family: inherit;
      font-size: 14px;
    }
    
    .chat-in::placeholder {
      color: #444;
    }

    .chat-go {
      color: #666;
      font-size: 16px;
      padding: 4px 8px;
    }
    
    .chat-go:hover {
      color: #a0ff00;
    }
    
    .chat-processing {
        color: #a0ff00;
        font-size: 11px;
        margin-right: 8px;
        animation: blink 1s infinite;
        white-space: nowrap;
    }
    
    @keyframes blink { 50% { opacity: 0.5; } }
    
    /* Right Sidebar container style */
    advanced-settings {
      z-index: 100;
    }

    @media (max-width: 800px) {
        #grid {
            grid-template-columns: repeat(2, 1fr);
            grid-auto-rows: 200px;
        }
    }
  `;
  }

  constructor() {
    super();
    this.prompts = new Map();
    this.showMidi = false;
    this.playbackState = 'stopped';
    this.isRecording = false;
    this.isProcessingRecording = false;
    this.audioLevel = 0;
    this.midiInputIds = [];
    this.activeMidiInputId = null;
    this.scenes = {};
    this.activeSceneName = '';
    this.filteredPrompts = new Set();
    this.chatProcessing = false;
    this.bpm = 120;
    this.bpmAuto = true;
    this.density = 0.5;
    this.densityAuto = true;
    this.brightness = 0.5;
    this.brightnessAuto = true;
    this.temperature = 1.0;
    this.topK = 40;
    this.muteBass = false;
    this.muteDrums = false;
    
    this.makeBackground = throttle(
      () => {
        const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
        const MAX_WEIGHT = 0.5;
        const MAX_ALPHA = 0.6;
        const bg = [];

        [...this.prompts.values()].forEach((p, i) => {
          const alphaPct = clamp01(p.weight / MAX_WEIGHT) * MAX_ALPHA;
          const alpha = Math.round(alphaPct * 0xff)
            .toString(16)
            .padStart(2, '0');

          const stop = p.weight / 2;
          const x = (i % 4) / 3;
          const y = Math.floor(i / 4) / 3;
          const s = `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${p.color}${alpha} 0px, ${p.color}00 ${stop * 100}%)`;
          bg.push(s);
        });

        return bg.join(', ');
      },
      30
    );

    this.midiDispatcher = new MidiDispatcher();
    this.loadScenesFromStorage();
    this.loadScene(this.activeSceneName);
    this.initializeMidi();
  }

  get chatInput() {
    return this.renderRoot.querySelector('.chat-in');
  }

  // --- Public API for AI Control ---
  
  performActions(actions) {
      let promptsChanged = false;
      let configChanged = false;
      
      const newPrompts = new Map(this.prompts);

      for (const action of actions) {
          if (action.type === 'clearAll') {
              for (const prompt of newPrompts.values()) {
                  prompt.text = '';
                  prompt.weight = 0;
              }
              promptsChanged = true;
          } else if (action.type === 'addPrompt') {
              let targetId = '';
              const { text, weight } = action.data;
              
              for (let i = 0; i < 8; i++) {
                  const id = `prompt-${i}`;
                  const p = newPrompts.get(id);
                  if (p && p.weight === 0 && !p.text) {
                      targetId = id;
                      break;
                  }
              }
              if (!targetId) {
                  for (let i = 0; i < 8; i++) {
                      const id = `prompt-${i}`;
                      const p = newPrompts.get(id);
                      if (p && p.weight === 0) {
                          targetId = id;
                          break;
                      }
                  }
              }
              if (!targetId) {
                  targetId = `prompt-${Math.floor(Math.random() * 8)}`;
              }

              const colors = ['#3dffab', '#ffdd28', '#ff25f6', '#9900ff', '#5200ff', '#28a2ff'];
              const color = colors[Math.floor(Math.random() * colors.length)];

              const newPrompt = {
                  promptId: targetId,
                  text: text,
                  weight: weight,
                  cc: parseInt(targetId.split('-')[1]),
                  color: color
              };
              newPrompts.set(targetId, newPrompt);
              promptsChanged = true;

          } else if (action.type === 'removePrompt') {
              const textFragment = action.data.text;
              for (const [id, p] of newPrompts.entries()) {
                  if (p.text.toLowerCase().includes(textFragment.toLowerCase()) && p.weight > 0) {
                      p.weight = 0;
                      promptsChanged = true;
                  }
              }
          } else if (action.type === 'setBpm') {
              this.bpm = action.data.bpm;
              this.bpmAuto = false;
              promptsChanged = true;
          } else if (action.type === 'setGlobal') {
              const { key, value } = action.data;
              if (this[key] !== undefined) {
                  this[key] = value;
                  if (key === 'bpm') this.bpmAuto = false;
                  if (key === 'density') this.densityAuto = false;
                  if (key === 'brightness') this.brightnessAuto = false;
                  promptsChanged = true;
                  if (key === 'temperature') configChanged = true;
              }
          }
      }

      if (promptsChanged) {
          this.prompts = newPrompts;
          this.dispatchPromptsChanged();
      }
      
      if (configChanged) {
          this.dispatchConfigChanged();
      }
  }
  
  addPrompt(text, weight = 0.8) {
      this.performActions([{type: 'addPrompt', data: { text, weight }}]);
  }

  removePrompt(textFragment) {
      this.performActions([{type: 'removePrompt', data: { text: textFragment }}]);
  }

  clearAll() {
      this.performActions([{type: 'clearAll', data: {}}]);
  }
  
  setGlobalParameter(key, value) {
      this.performActions([{type: 'setGlobal', data: { key, value }}]);
  }

  setBpm(bpm) {
      this.performActions([{type: 'setBpm', data: { bpm }}]);
  }

  // --- End Public API ---

  async initializeMidi() {
    try {
        const inputIds = await this.midiDispatcher.getMidiAccess();
        this.midiInputIds = inputIds;
        this.activeMidiInputId = this.midiDispatcher.activeMidiInputId;
        if (inputIds.length > 0) {
            this.showMidi = true;
        }
    } catch (e) {
        console.log("MIDI access not available yet.");
    }
  }

  async toggleShowMidi() {
    if (!this.showMidi) {
        await this.initializeMidi();
    }
    this.showMidi = !this.showMidi;
  }

  loadScenesFromStorage() {
    const storedScenes = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedScenes) {
      this.scenes = JSON.parse(storedScenes);
    } else {
      this.scenes = DEFAULT_SCENES;
      this.saveScenesToStorage();
    }
    this.activeSceneName = Object.keys(this.scenes)[0] || DEFAULT_SCENE_NAME;
  }

  saveScenesToStorage() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.scenes));
  }
  
  loadScene(name) {
    const sceneData = this.scenes[name];
    if (!sceneData) return;

    const allPromptsMap = new Map(sceneData);
    const newGridPrompts = new Map();
    
    allPromptsMap.forEach((prompt, id) => {
      newGridPrompts.set(id, prompt);
    });

    this.prompts = newGridPrompts;
    this.activeSceneName = name;
    
    this.bpmAuto = true;
    this.densityAuto = true;
    this.brightnessAuto = true;
    
    this.dispatchEvent(new CustomEvent('prompts-changed', { detail: this.audioPrompts }));
  }

  saveScene() {
    const name = prompt('Enter scene name:', this.activeSceneName);
    if (!name) return;

    if (this.scenes[name] && !confirm(`A scene named "${name}" already exists. Overwrite it?`)) {
      return;
    }
    
    this.scenes[name] = Array.from(this.prompts.entries());
    this.activeSceneName = name;
    this.saveScenesToStorage();
    this.requestUpdate(); 
  }
  
  deleteScene() {
    if (!this.scenes[this.activeSceneName]) return;
    if (!confirm(`Are you sure you want to delete the scene "${this.activeSceneName}"?`)) {
      return;
    }

    delete this.scenes[this.activeSceneName];
    this.saveScenesToStorage();
    
    const nextSceneName = Object.keys(this.scenes)[0] || DEFAULT_SCENE_NAME;
    this.loadScene(nextSceneName);
  }

  handleSceneChange(e) {
    const newSceneName = e.target.value;
    this.loadScene(newSceneName);
  }

  get allPrompts() {
    return new Map(this.prompts);
  }
  
  get audioPrompts() {
      const all = new Map(this.prompts);
      
      if (!this.bpmAuto) {
          all.set('bpm-control', {
              promptId: 'bpm-control',
              text: `Tempo: ${this.bpm} bpm`,
              weight: 1.0,
              cc: -1,
              color: '#000000'
          });
      }

      if (!this.densityAuto) {
          if (this.density > 0.6) {
              const weight = (this.density - 0.5) * 2;
              all.set('density-high', {
                  promptId: 'density-high',
                  text: 'High density, busy texture, complex layers',
                  weight: weight,
                  cc: -1,
                  color: '#000000'
              });
          } else if (this.density < 0.4) {
              const weight = (0.5 - this.density) * 2;
              all.set('density-low', {
                  promptId: 'density-low',
                  text: 'Sparse, minimal, simple texture',
                  weight: weight,
                  cc: -1,
                  color: '#000000'
              });
          }
      }

      if (!this.brightnessAuto) {
          if (this.brightness > 0.6) {
              const weight = (this.brightness - 0.5) * 2;
              all.set('bright', {
                  promptId: 'bright',
                  text: 'Bright, sharp, clear timber',
                  weight: weight,
                  cc: -1,
                  color: '#000000'
              });
          } else if (this.brightness < 0.4) {
              const weight = (0.5 - this.brightness) * 2;
              all.set('dark', {
                  promptId: 'dark',
                  text: 'Dark, warm, muffled timber',
                  weight: weight,
                  cc: -1,
                  color: '#000000'
              });
          }
      }

      if (this.muteBass) {
           all.set('mute-bass', {
              promptId: 'mute-bass',
              text: 'No bass, remove bass frequencies',
              weight: 1.0,
              cc: -1,
              color: '#000000'
          });
      }
      if (this.muteDrums) {
           all.set('mute-drums', {
              promptId: 'mute-drums',
              text: 'No drums, no percussion, ambient only',
              weight: 1.0,
              cc: -1,
              color: '#000000'
          });
      }

      return all;
  }

  dispatchPromptsChanged() {
      this.dispatchEvent(new CustomEvent('prompts-changed', { detail: this.audioPrompts }));
  }
  
  dispatchConfigChanged() {
      this.dispatchEvent(new CustomEvent('config-changed', { 
          detail: { temperature: this.temperature } 
      }));
  }

  handlePromptChanged(e) {
    const detail = e.detail;
    const { promptId } = detail;
    const prompt = this.prompts.get(promptId);

    if (!prompt) return;

    const newPrompts = new Map(this.prompts);
    newPrompts.set(promptId, detail);
    this.prompts = newPrompts;

    this.dispatchPromptsChanged();
  }

  handleMidiInputChange(event) {
    const newMidiId = event.detail;
    this.activeMidiInputId = newMidiId;
    this.midiDispatcher.activeMidiInputId = newMidiId;
    this.showMidi = true;
  }
  
  handleSettingChange(event) {
      const { key, value } = event.detail;
      this[key] = value;
      this.dispatchPromptsChanged();
      
      if (key === 'temperature') {
          this.dispatchConfigChanged();
      }
  }

  playPause() {
    this.dispatchEvent(new CustomEvent('play-pause'));
  }

  addFilteredPrompt(prompt) {
    this.filteredPrompts = new Set([...this.filteredPrompts, prompt]);
  }

  showInfo() {
    this.dispatchEvent(new CustomEvent('show-info'));
  }

  resetPrompts() {
      this.loadScene(DEFAULT_SCENE_NAME);
      this.dispatchEvent(new CustomEvent('reset-audio'));
  }

  clearAllPrompts() {
      const newPrompts = new Map(this.prompts);
      for (const prompt of newPrompts.values()) {
          prompt.text = '';
          prompt.weight = 0;
      }
      this.prompts = newPrompts;
      this.dispatchPromptsChanged();
  }

  toggleRecording() {
    this.dispatchEvent(new CustomEvent('toggle-recording'));
  }

  handleChatKey(e) {
      if (e.key === 'Enter') {
          this.submitChat();
      }
  }

  async setChatProcessing(processing) {
      this.chatProcessing = processing;
  }

  submitChat() {
      const text = this.chatInput.value.trim();
      if (!text) return;
      
      this.chatInput.value = '';
      this.chatProcessing = true;
      
      setTimeout(() => {
          if (this.chatProcessing) {
              this.chatProcessing = false;
          }
      }, 12000);
      
      this.dispatchEvent(new CustomEvent('chat-command', { 
          detail: { text } 
      }));
  }

  render() {
    const bg = styleMap({
      backgroundImage: this.makeBackground(),
    });

    return html`<div id="background" style=${bg}></div>
      <div id="top-buttons">
        <div class="control-group">
          <button @click=${this.showInfo} class="icon-btn" title="How to use">?</button>
          <button
            @click=${this.toggleRecording}
            class="icon-btn ${this.isRecording ? 'recording active' : 'recording'}"
            ?disabled=${this.isProcessingRecording}
            title=${this.isRecording ? 'Stop recording' : 'Record audio output'}
          >
            ${this.isProcessingRecording ? '...' : '●'}
          </button>
        </div>

        <div class="divider"></div>

        <div class="control-group">
          <select id="scene-select" .value=${this.activeSceneName} @change=${this.handleSceneChange}>
            ${Object.keys(this.scenes).map(name => html`<option value=${name}>${name}</option>`)}
          </select>
          <button @click=${this.saveScene}>Save</button>
          <button @click=${this.deleteScene}>Del</button>
        </div>

        <div class="divider"></div>

        <div class="control-group">
          <button @click=${this.resetPrompts} title="Hard Reset Audio & UI">Reset</button>
          <button @click=${this.clearAllPrompts}>Clear</button>
        </div>

        <div class="divider"></div>

        <div class="control-group">
          <button 
             @click=${this.toggleShowMidi} 
             class=${this.showMidi ? 'active' : ''}
             title="Visualise MIDI CC mappings"
          >MIDI</button>
        </div>
      </div>

      <div id="app-container">
        <div id="main-content">
            <div id="grid">${this.renderPrompts()}</div>
            
            <div class="bottom-bar">
                <play-pause-button .playbackState=${this.playbackState} @click=${this.playPause}></play-pause-button>
                
                <div class="chat-wrap">
                    ${this.chatProcessing ? html`<span class="chat-processing">AI working...</span>` : ''}
                    <input class="chat-in" type="text" placeholder="Tell AI to add drums, change bpm, etc..." @keydown=${this.handleChatKey}>
                    <button class="chat-go" @click=${this.submitChat}>↵</button>
                </div>
            </div>
        </div>

        <advanced-settings 
            .midiInputs=${this.midiInputIds}
            .activeMidiInputId=${this.activeMidiInputId}
            .midiDispatcher=${this.midiDispatcher}
            @midi-input-changed=${this.handleMidiInputChange}
            @setting-changed=${this.handleSettingChange}
            
            .bpm=${this.bpmAuto ? 'Auto' : this.bpm.toString()}
            .bpmAuto=${this.bpmAuto}
            .temperature=${this.temperature}
            .topK=${this.topK}
            .density=${this.density}
            .densityAuto=${this.densityAuto}
            .brightness=${this.brightness}
            .brightnessAuto=${this.brightnessAuto}
            .muteBass=${this.muteBass}
            .muteDrums=${this.muteDrums}
        ></advanced-settings>
      </div>
      `;
  }

  renderPrompts() {
    return [...this.prompts.values()].map((prompt) => {
      return html`<prompt-controller
        promptId=${prompt.promptId}
        ?filtered=${this.filteredPrompts.has(prompt.text)}
        cc=${prompt.cc}
        text=${prompt.text}
        weight=${prompt.weight}
        color=${prompt.color}
        .midiDispatcher=${this.midiDispatcher}
        .showCC=${this.showMidi}
        audioLevel=${this.audioLevel}
        @prompt-changed=${this.handlePromptChanged}>
      </prompt-controller>`;
    });
  }
}

customElements.define('prompt-dj-midi', PromptDjMidi);