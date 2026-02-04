/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { throttle } from '../utils/throttle';

import './PromptController';
import './PlayPauseButton';
import type { PlaybackState, Prompt } from '../types';
import { MidiDispatcher } from '../utils/MidiDispatcher';

const DEFAULT_SCENE_NAME = 'Default';

type Scene = [string, Prompt][];

const DEFAULT_SCENES: Record<string, Scene> = {
  [DEFAULT_SCENE_NAME]: [
    ['prompt-0', { promptId: 'prompt-0', text: 'irish fiddle with banging toms', weight: 1, cc: 0, color: '#3dffab' }],
    ['prompt-1', { promptId: 'prompt-1', text: 'Tribal drum circle', weight: 1, cc: 1, color: '#ffdd28' }],
    ['prompt-2', { promptId: 'prompt-2', text: 'Punk Bass', weight: 1, cc: 2, color: '#ff25f6' }],
    ['prompt-3', { promptId: 'prompt-3', text: 'Aggressive 808', weight: 0, cc: 3, color: '#9900ff' }],
    ['prompt-4', { promptId: 'prompt-4', text: 'Bossa Nova', weight: 0, cc: 4, color: '#9900ff' }],
    ['prompt-5', { promptId: 'prompt-5', text: 'Chillwave', weight: 0, cc: 5, color: '#5200ff' }],
    ['prompt-6', { promptId: 'prompt-6', text: 'Drum and Bass', weight: 0, cc: 6, color: '#ff25f6' }],
    ['prompt-7', { promptId: 'prompt-7', text: 'Shoegaze', weight: 0, cc: 7, color: '#ffdd28' }],
    ['prompt-8', { promptId: 'prompt-8', text: 'Funk', weight: 0, cc: 8, color: '#2af6de' }],
    ['prompt-9', { promptId: 'prompt-9', text: 'Chiptune', weight: 0, cc: 9, color: '#9900ff' }],
    ['prompt-10', { promptId: 'prompt-10', text: 'Lush Strings', weight: 0, cc: 10, color: '#3dffab' }],
    ['prompt-11', { promptId: 'prompt-11', text: 'Sparkling Arpeggios', weight: 0, cc: 11, color: '#d8ff3e' }],
    ['prompt-12', { promptId: 'prompt-12', text: 'Staccato Rhythms', weight: 0, cc: 12, color: '#d9b2ff' }],
    ['prompt-13', { promptId: 'prompt-13', text: 'Dubstep', weight: 0, cc: 13, color: '#ffdd28' }],
    ['prompt-14', { promptId: 'prompt-14', text: 'K Pop', weight: 0, cc: 14, color: '#ff25f6' }],
    ['prompt-15', { promptId: 'prompt-15', text: 'Thrash', weight: 0, cc: 15, color: '#d9b2ff' }],
    ['build-up', { promptId: 'build-up', text: 'Increase intensity, add layers and complexity', weight: 0, cc: 16, color: '#ff851b' }],
    ['breakdown', { promptId: 'breakdown', text: 'Decrease intensity and tempo, remove layers', weight: 0, cc: 17, color: '#0074d9' }]
  ],
  'Ambient Textures': [
    ['prompt-0', { promptId: 'prompt-0', text: 'Lush pads', weight: 1, cc: 0, color: '#3dffab' }],
    ['prompt-1', { promptId: 'prompt-1', text: 'Gentle rain', weight: 0, cc: 1, color: '#28a2ff' }],
    ['prompt-2', { promptId: 'prompt-2', text: 'Distant choir', weight: 0, cc: 2, color: '#ff25f6' }],
    ['prompt-3', { promptId: 'prompt-3', text: 'Slowly evolving drone', weight: 1, cc: 3, color: '#9900ff' }],
    ['prompt-4', { promptId: 'prompt-4', text: 'Glassy synth textures', weight: 0, cc: 4, color: '#9900ff' }],
    ['prompt-5', { promptId: 'prompt-5', text: 'Deep sub bass', weight: 1, cc: 5, color: '#5200ff' }],
    ['prompt-6', { promptId: 'prompt-6', text: 'Breathy flute melody', weight: 0, cc: 6, color: '#ff25f6' }],
    ['prompt-7', { promptId: 'prompt-7', text: 'Soft static crackle', weight: 0, cc: 7, color: '#ffdd28' }],
    ['prompt-8', { promptId: 'prompt-8', text: 'Kalimba melody', weight: 0, cc: 8, color: '#2af6de' }],
    ['prompt-9', { promptId: 'prompt-9', text: 'Singing bowls', weight: 0, cc: 9, color: '#9900ff' }],
    ['prompt-10', { promptId: 'prompt-10', text: 'Echoing piano notes', weight: 0, cc: 10, color: '#3dffab' }],
    ['prompt-11', { promptId: 'prompt-11', text: 'Warm vinyl hiss', weight: 0, cc: 11, color: '#d8ff3e' }],
    ['prompt-12', { promptId: 'prompt-12', text: 'Reverse cymbal swells', weight: 0, cc: 12, color: '#d9b2ff' }],
    ['prompt-13', { promptId: 'prompt-13', text: 'Bowed double bass', weight: 0, cc: 13, color: '#ffdd28' }],
    ['prompt-14', { promptId: 'prompt-14', text: 'Glacial synth strings', weight: 0, cc: 14, color: '#ff25f6' }],
    ['prompt-15', { promptId: 'prompt-15', text: 'Wind chimes', weight: 0, cc: 15, color: '#d9b2ff' }],
    ['build-up', { promptId: 'build-up', text: 'Increase intensity, add layers and complexity', weight: 0, cc: 16, color: '#ff851b' }],
    ['breakdown', { promptId: 'breakdown', text: 'Decrease intensity and tempo, remove layers', weight: 0, cc: 17, color: '#0074d9' }]
  ],
  'Synthwave Sunset': [
    ['prompt-0', { promptId: 'prompt-0', text: 'Gated reverb snare', weight: 1, cc: 0, color: '#3dffab' }],
    ['prompt-1', { promptId: 'prompt-1', text: 'Driving bassline', weight: 1, cc: 1, color: '#ffdd28' }],
    ['prompt-2', { promptId: 'prompt-2', text: 'LinnDrum tom fills', weight: 0, cc: 2, color: '#ff25f6' }],
    ['prompt-3', { promptId: 'prompt-3', text: 'Analog synth brass stabs', weight: 0, cc: 3, color: '#9900ff' }],
    ['prompt-4', { promptId: 'prompt-4', text: 'Dreamy Juno-60 pads', weight: 1, cc: 4, color: '#9900ff' }],
    ['prompt-5', { promptId: 'prompt-5', text: 'Electric guitar solo', weight: 0, cc: 5, color: '#5200ff' }],
    ['prompt-6', { promptId: 'prompt-6', text: 'Arpeggiated synth lead', weight: 0, cc: 6, color: '#ff25f6' }],
    ['prompt-7', { promptId: 'prompt-7', text: 'Dark synthwave atmosphere', weight: 0, cc: 7, color: '#ffdd28' }],
    ['prompt-8', { promptId: 'prompt-8', text: '808 Cowbell', weight: 0, cc: 8, color: '#2af6de' }],
    ['prompt-9', { promptId: 'prompt-9', text: 'FM synthesis bass', weight: 0, cc: 9, color: '#9900ff' }],
    ['prompt-10', { promptId: 'prompt-10', text: 'Saxophone solo', weight: 0, cc: 10, color: '#3dffab' }],
    ['prompt-11', { promptId: 'prompt-11', text: 'Sparkling synth bell', weight: 0, cc: 11, color: '#d8ff3e' }],
    ['prompt-12', { promptId: 'prompt-12', text: 'Synth choir "ahh"', weight: 0, cc: 12, color: '#d9b2ff' }],
    ['prompt-13', { promptId: 'prompt-13', text: 'Chugging guitar riff', weight: 0, cc: 13, color: '#ffdd28' }],
    ['prompt-14', { promptId: 'prompt-14', text: 'Fairlight CMI orchestra hit', weight: 0, cc: 14, color: '#ff25f6' }],
    ['prompt-15', { promptId: 'prompt-15', text: 'Roland TR-808 kick', weight: 1, cc: 15, color: '#d9b2ff' }],
    ['build-up', { promptId: 'build-up', text: 'Increase intensity, add layers and complexity', weight: 0, cc: 16, color: '#ff851b' }],
    ['breakdown', { promptId: 'breakdown', text: 'Decrease intensity and tempo, remove layers', weight: 0, cc: 17, color: '#0074d9' }]
  ],
  'Orchestral Tension': [
    ['prompt-0', { promptId: 'prompt-0', text: 'Pizzicato strings', weight: 1, cc: 0, color: '#3dffab' }],
    ['prompt-1', { promptId: 'prompt-1', text: 'Tense string ostinato', weight: 1, cc: 1, color: '#ffdd28' }],
    ['prompt-2', { promptId: 'prompt-2', text: 'Looming low brass', weight: 0, cc: 2, color: '#ff25f6' }],
    ['prompt-3', { promptId: 'prompt-3', text: 'Timpani rolls', weight: 0, cc: 3, color: '#9900ff' }],
    ['prompt-4', { promptId: 'prompt-4', text: 'Ominous cellos', weight: 1, cc: 4, color: '#9900ff' }],
    ['prompt-5', { promptId: 'prompt-5', text: 'High suspenseful violins', weight: 0, cc: 5, color: '#5200ff' }],
    ['prompt-6', { promptId: 'prompt-6', text: 'War drums', weight: 0, cc: 6, color: '#ff25f6' }],
    ['prompt-7', { promptId: 'prompt-7', text: 'French horn melody', weight: 0, cc: 7, color: '#ffdd28' }],
    ['prompt-8', { promptId: 'prompt-8', text: 'Crescendo cymbal swells', weight: 0, cc: 8, color: '#2af6de' }],
    ['prompt-9', { promptId: 'prompt-9', text: 'Choir singing staccato', weight: 0, cc: 9, color: '#9900ff' }],
    ['prompt-10', { promptId: 'prompt-10', text: 'Tremolo strings', weight: 0, cc: 10, color: '#3dffab' }],
    ['prompt-11', { promptId: 'prompt-11', text: 'Low piano notes', weight: 0, cc: 11, color: '#d8ff3e' }],
    ['prompt-12', { promptId: 'prompt-12', text: 'Aggressive brass section', weight: 0, cc: 12, color: '#d9b2ff' }],
    ['prompt-13', { promptId: 'prompt-13', text: 'Military snare drum', weight: 0, cc: 13, color: '#ffdd28' }],
    ['prompt-14', { promptId: 'prompt-14', text: 'Harp glissando', weight: 0, cc: 14, color: '#ff25f6' }],
    ['prompt-15', { promptId: 'prompt-15', text: 'Deep contrabass drone', weight: 0, cc: 15, color: '#d9b2ff' }],
    ['build-up', { promptId: 'build-up', text: 'Increase intensity, add layers and complexity', weight: 0, cc: 16, color: '#ff851b' }],
    ['breakdown', { promptId: 'breakdown', text: 'Decrease intensity and tempo, remove layers', weight: 0, cc: 17, color: '#0074d9' }]
  ]
}

const LOCAL_STORAGE_KEY = 'promptDjMidiScenes';

/** The grid of prompt inputs. */
@customElement('prompt-dj-midi')
// FIX: The class should extend LitElement to be a custom element.
export class PromptDjMidi extends LitElement {
  static override styles = css`
    :host {
      height: 100%;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      position: relative;
    }
    #background {
      will-change: background-image;
      position: absolute;
      height: 100%;
      width: 100%;
      z-index: -1;
      background: #111;
    }
    #main-layout {
      display: flex;
      align-items: center;
      gap: 4vmin;
    }
    #grid {
      width: 80vmin;
      height: 80vmin;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2.5vmin;
    }
    prompt-controller {
      width: 100%;
    }
    play-pause-button {
      width: 15vmin;
      margin-bottom: 2vmin;
    }
    #top-buttons {
      position: absolute;
      top: 0;
      left: 0;
      padding: 10px;
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .control-group {
      display: flex;
      gap: 5px;
      align-items: center;
      padding: 5px;
      background: #0003;
      border-radius: 6px;
    }
    #performance-controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4vmin;
    }
    #performance-controls prompt-controller {
      width: 15vmin;
    }
    button {
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
      background: #0002;
      -webkit-font-smoothing: antialiased;
      border: 1.5px solid #fff;
      border-radius: 4px;
      user-select: none;
      padding: 3px 8px;
      min-width: 30px;
      text-align: center;
      transition: background-color 0.2s, color 0.2s;
      &:hover {
        background-color: #fff;
        color: #000;
      }
      &.active {
        background-color: #fff;
        color: #000;
      }
    }
    button[title~='Record'] {
      border-radius: 50%;
      width: 28px;
      height: 28px;
      padding: 0;
      font-size: 16px;
      line-height: 1;
    }
    button.recording {
      color: #ff4136;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(255, 65, 54, 0.5);
      }
      70% {
        box-shadow: 0 0 0 7px rgba(255, 65, 54, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(255, 65, 54, 0);
      }
    }
    button[title='How to use'] {
      border-radius: 50%;
      width: 28px;
      height: 28px;
      padding: 0;
      font-weight: bold;
      font-size: 16px;
      line-height: 1;
    }
    label {
      color: #fff;
      font-weight: 500;
      user-select: none;
    }
    select {
      font: inherit;
      padding: 3px 5px;
      background: #fff;
      color: #000;
      border-radius: 4px;
      border: 1.5px solid #fff;
      outline: none;
      cursor: pointer;
    }
  `;

  @state() private prompts = new Map<string, Prompt>();
  private midiDispatcher: MidiDispatcher;

  @property({ type: Boolean }) private showMidi = false;
  @property({ type: String }) public playbackState: PlaybackState = 'stopped';
  @property({ type: Boolean }) public isRecording = false;
  @property({ type: Boolean }) public isProcessingRecording = false;
  @state() public audioLevel = 0;
  @state() private midiInputIds: string[] = [];
  @state() private activeMidiInputId: string | null = null;
  @state() private buildUpPrompt!: Prompt;
  @state() private breakdownPrompt!: Prompt;
  
  @state() private scenes: Record<string, Scene> = {};
  @state() private activeSceneName = '';

  @property({ type: Object })
  private filteredPrompts = new Set<string>();

  constructor() {
    super();
    this.midiDispatcher = new MidiDispatcher();
    this.loadScenesFromStorage();
    this.loadScene(this.activeSceneName);
  }

  private loadScenesFromStorage() {
    const storedScenes = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedScenes) {
      this.scenes = JSON.parse(storedScenes);
    } else {
      this.scenes = DEFAULT_SCENES;
      this.saveScenesToStorage();
    }
    this.activeSceneName = Object.keys(this.scenes)[0] || DEFAULT_SCENE_NAME;
  }

  private saveScenesToStorage() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.scenes));
  }
  
  private loadScene(name: string) {
    const sceneData = this.scenes[name];
    if (!sceneData) return;

    const allPromptsMap = new Map(sceneData);
    const newGridPrompts = new Map<string, Prompt>();
    
    allPromptsMap.forEach((prompt, id) => {
      if (id === 'build-up') {
        this.buildUpPrompt = prompt;
      } else if (id === 'breakdown') {
        this.breakdownPrompt = prompt;
      } else {
        newGridPrompts.set(id, prompt);
      }
    });

    this.prompts = newGridPrompts;
    this.activeSceneName = name;
    this.dispatchEvent(new CustomEvent('prompts-changed', { detail: allPromptsMap }));
  }

  private saveScene() {
    const name = prompt('Enter scene name:', this.activeSceneName);
    if (!name) return;

    if (this.scenes[name] && !confirm(`A scene named "${name}" already exists. Overwrite it?`)) {
      return;
    }
    
    this.scenes[name] = Array.from(this.allPrompts.entries());
    this.activeSceneName = name;
    this.saveScenesToStorage();
    this.requestUpdate(); // To update the select dropdown
  }
  
  private deleteScene() {
    if (!this.scenes[this.activeSceneName]) return;
    if (!confirm(`Are you sure you want to delete the scene "${this.activeSceneName}"?`)) {
      return;
    }

    delete this.scenes[this.activeSceneName];
    this.saveScenesToStorage();
    
    const nextSceneName = Object.keys(this.scenes)[0] || DEFAULT_SCENE_NAME;
    this.loadScene(nextSceneName);
  }

  private handleSceneChange(e: Event) {
    const newSceneName = (e.target as HTMLSelectElement).value;
    this.loadScene(newSceneName);
  }

  get allPrompts(): Map<string, Prompt> {
    const all = new Map(this.prompts);
    if (this.buildUpPrompt) all.set(this.buildUpPrompt.promptId, this.buildUpPrompt);
    if (this.breakdownPrompt) all.set(this.breakdownPrompt.promptId, this.breakdownPrompt);
    return all;
  }

  private handlePromptChanged(e: CustomEvent<Prompt>) {
    const detail = e.detail;
    const { promptId } = detail;
    const prompt = this.prompts.get(promptId);

    if (!prompt) return;

    const newPrompts = new Map(this.prompts);
    newPrompts.set(promptId, detail);
    this.prompts = newPrompts;

    this.dispatchEvent(new CustomEvent('prompts-changed', { detail: this.allPrompts }));
  }

  private handlePerformancePromptChanged(e: CustomEvent<Prompt>) {
    const detail = e.detail;
    if (detail.promptId === 'build-up') {
      this.buildUpPrompt = detail;
    } else if (detail.promptId === 'breakdown') {
      this.breakdownPrompt = detail;
    }
    this.dispatchEvent(new CustomEvent('prompts-changed', { detail: this.allPrompts }));
  }

  /** Generates radial gradients for each prompt based on weight and color. */
  private readonly makeBackground = throttle(
    () => {
      const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

      const MAX_WEIGHT = 0.5;
      const MAX_ALPHA = 0.6;

      const bg: string[] = [];

      [...this.allPrompts.values()].forEach((p, i) => {
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
    30, // don't re-render more than once every XXms
  );

  private toggleShowMidi() {
    return this.setShowMidi(!this.showMidi);
  }

  public async setShowMidi(show: boolean) {
    this.showMidi = show;
    if (!this.showMidi) return;
    try {
      const inputIds = await this.midiDispatcher.getMidiAccess();
      this.midiInputIds = inputIds;
      this.activeMidiInputId = this.midiDispatcher.activeMidiInputId;
    } catch (e: any) {
      this.dispatchEvent(new CustomEvent('error', {detail: e.message}));
    }
  }

  private handleMidiInputChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const newMidiId = selectElement.value;
    this.activeMidiInputId = newMidiId;
    this.midiDispatcher.activeMidiInputId = newMidiId;
  }

  private playPause() {
    this.dispatchEvent(new CustomEvent('play-pause'));
  }

  public addFilteredPrompt(prompt: string) {
    this.filteredPrompts = new Set([...this.filteredPrompts, prompt]);
  }

  private showInfo() {
    this.dispatchEvent(new CustomEvent('show-info'));
  }

  private resetPrompts() {
      this.loadScene(DEFAULT_SCENE_NAME);
  }

  private clearAllPrompts() {
      const newPrompts = new Map(this.prompts);
      for (const prompt of newPrompts.values()) {
          prompt.text = '';
          prompt.weight = 0;
      }
      this.prompts = newPrompts;
      this.buildUpPrompt.weight = 0;
      this.breakdownPrompt.weight = 0;
      this.dispatchEvent(new CustomEvent('prompts-changed', { detail: this.allPrompts }));
  }

  private toggleRecording() {
    this.dispatchEvent(new CustomEvent('toggle-recording'));
  }

  override render() {
    const bg = styleMap({
      backgroundImage: this.makeBackground(),
    });

    return html`<div id="background" style=${bg}></div>
      <div id="top-buttons">
        <div class="control-group">
          <button @click=${this.showInfo} title="How to use">?</button>
          <button
            @click=${this.toggleRecording}
            class=${this.isRecording ? 'recording' : ''}
            ?disabled=${this.isProcessingRecording}
            title=${this.isRecording ? 'Stop recording' : 'Record audio output'}
          >
            ${this.isProcessingRecording ? '...' : this.isRecording ? '■' : '●'}
          </button>
        </div>
        <div class="control-group">
          <label for="scene-select">Scene</label>
          <select id="scene-select" .value=${this.activeSceneName} @change=${this.handleSceneChange}>
            ${Object.keys(this.scenes).map(name => html`<option value=${name}>${name}</option>`)}
          </select>
          <button @click=${this.saveScene}>Save</button>
          <button @click=${this.deleteScene}>Delete</button>
        </div>
        <div class="control-group">
          <button @click=${this.resetPrompts}>Reset</button>
          <button @click=${this.clearAllPrompts}>Clear All</button>
        </div>
        <div class="control-group">
          <button
            @click=${this.toggleShowMidi}
            class=${this.showMidi ? 'active' : ''}
            >MIDI</button
          >
          <select
            @change=${this.handleMidiInputChange}
            .value=${this.activeMidiInputId || ''}
            style=${this.showMidi ? '' : 'visibility: hidden'}>
            ${this.midiInputIds.length > 0
        ? this.midiInputIds.map(
          (id) =>
            html`<option value=${id}>
                    ${this.midiDispatcher.getDeviceName(id)}
                  </option>`,
        )
        : html`<option value="">No devices found</option>`}
          </select>
        </div>
      </div>
      <div id="main-layout">
        <div id="performance-controls">
            <play-pause-button .playbackState=${this.playbackState} @click=${this.playPause}></play-pause-button>
            <prompt-controller
              promptId=${this.buildUpPrompt.promptId}
              cc=${this.buildUpPrompt.cc}
              text=${this.buildUpPrompt.text}
              weight=${this.buildUpPrompt.weight}
              color=${this.buildUpPrompt.color}
              .midiDispatcher=${this.midiDispatcher}
              .showCC=${this.showMidi}
              audioLevel=${this.audioLevel}
              @prompt-changed=${this.handlePerformancePromptChanged}>
            </prompt-controller>
            <prompt-controller
              promptId=${this.breakdownPrompt.promptId}
              cc=${this.breakdownPrompt.cc}
              text=${this.breakdownPrompt.text}
              weight=${this.breakdownPrompt.weight}
              color=${this.breakdownPrompt.color}
              .midiDispatcher=${this.midiDispatcher}
              .showCC=${this.showMidi}
              audioLevel=${this.audioLevel}
              @prompt-changed=${this.handlePerformancePromptChanged}>
            </prompt-controller>
        </div>
        <div id="grid">${this.renderPrompts()}</div>
      </div>`;
  }

  private renderPrompts() {
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
