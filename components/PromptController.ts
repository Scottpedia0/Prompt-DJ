/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import './WeightKnob.ts';
import type { WeightKnob } from './WeightKnob.ts';

import type { MidiDispatcher } from '../utils/MidiDispatcher.ts';
import type { Prompt, ControlChange } from '../types.ts';

@customElement('prompt-controller')
export class PromptController extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .prompt {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start; /* Align top */
      gap: 12px;
      position: relative;
      background: rgba(18, 18, 24, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px 8px;
      box-sizing: border-box;
      transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
      backdrop-filter: blur(4px);
    }

    /* Active State */
    .prompt.active {
      background: rgba(22, 22, 28, 0.9);
      border-color: var(--accent-color, #fff);
      box-shadow: 0 0 15px var(--accent-glow, rgba(255,255,255,0.1));
    }

    weight-knob {
      /* Fixed size handled in component, allow it to just sit here */
      margin-top: 8px;
    }
    
    .midi-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #555;
      background: rgba(0, 0, 0, 0.3);
      padding: 3px 6px;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s;
      text-transform: uppercase;
    }
    
    .midi-badge:hover {
        color: #ddd;
    }

    .learn-mode .midi-badge {
      color: #ff9800;
      background: rgba(255, 152, 0, 0.15);
      box-shadow: 0 0 8px rgba(255, 152, 0, 0.3);
      animation: pulse 1s infinite;
    }
    
    .prompt.active .midi-badge {
        color: var(--accent-color);
        background: var(--accent-glow);
    }

    @keyframes pulse { 50% { opacity: 0.5; } }

    #text {
      font-family: 'Google Sans', 'Inter', sans-serif;
      font-weight: 500;
      font-size: 13px;
      line-height: 1.4;
      width: 90%;
      padding: 4px;
      text-align: center;
      outline: none;
      color: #999;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      transition: all 0.2s ease;
      
      /* Make sure it sits nicely below knob */
      max-height: 3em; 
      overflow: hidden;
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    
    .prompt.active #text {
        color: #fff;
        text-shadow: 0 0 8px rgba(0,0,0,0.6);
        font-weight: 600;
    }

    #text:hover {
      color: #ccc;
      background: rgba(255,255,255,0.05);
    }

    #text:focus {
      background: #000;
      color: #fff;
      border-color: #444;
      position: absolute;
      bottom: 8px;
      left: 5%;
      width: 90%;
      z-index: 20;
      max-height: none;
      -webkit-line-clamp: unset;
      box-shadow: 0 4px 12px rgba(0,0,0,0.8);
    }
    
    #text:empty::before {
      content: 'Empty Slot';
      color: #333;
      font-style: italic;
      font-weight: 400;
    }

    :host([filtered]) {
      opacity: 0.5;
      filter: grayscale(100%);
    }
    :host([filtered]) #text {
        text-decoration: line-through;
        color: #ff4136;
    }
  `;

  @property({ type: String }) promptId = '';
  @property({ type: String }) text = '';
  @property({ type: Number }) weight = 0;
  @property({ type: String }) color = '#ffffff';
  @property({ type: Boolean, reflect: true }) filtered = false;

  @property({ type: Number }) cc = 0;
  @property({ type: Number }) channel = 0;

  @property({ type: Boolean }) learnMode = false;
  @property({ type: Boolean }) showCC = false;

  @query('weight-knob') private weightInput!: WeightKnob;
  @query('#text') private textInput!: HTMLInputElement;

  @property({ type: Object })
  midiDispatcher: MidiDispatcher | null = null;

  @property({ type: Number }) audioLevel = 0;

  private lastValidText!: string;

  connectedCallback() {
    super.connectedCallback();
    this.midiDispatcher?.addEventListener('cc-message', (e: Event) => {
      const customEvent = e as CustomEvent<ControlChange>;
      const { channel, cc, value } = customEvent.detail;
      if (this.learnMode) {
        this.cc = cc;
        this.channel = channel;
        this.learnMode = false;
        this.dispatchPromptChange();
      } else if (cc === this.cc) {
        this.weight = (value / 127) * 2;
        this.dispatchPromptChange();
      }
    });
  }

  firstUpdated() {
    this.textInput.setAttribute('contenteditable', 'plaintext-only');
    this.textInput.textContent = this.text;
    this.lastValidText = this.text;
  }

  update(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('showCC') && !this.showCC) {
      this.learnMode = false;
    }
    if (changedProperties.has('text') && this.textInput) {
      if (document.activeElement !== this.textInput) {
          this.textInput.textContent = this.text;
      }
    }
    super.update(changedProperties);
  }

  private dispatchPromptChange() {
    (this as unknown as HTMLElement).dispatchEvent(
      new CustomEvent<Prompt>('prompt-changed', {
        detail: {
          promptId: this.promptId,
          text: this.text,
          weight: this.weight,
          cc: this.cc,
          color: this.color,
        },
      }),
    );
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.textInput.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.resetText();
      this.textInput.blur();
    }
  }

  private resetText() {
    this.text = this.lastValidText;
    this.textInput.textContent = this.lastValidText;
  }

  private async updateText() {
    const newText = this.textInput.textContent?.trim();
    if (!newText) {
      this.text = '';
      this.lastValidText = '';
    } else {
      this.text = newText;
      this.lastValidText = newText;
    }
    this.dispatchPromptChange();
    this.textInput.scrollLeft = 0;
  }

  private onFocus() {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(this.textInput);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private updateWeight() {
    this.weight = this.weightInput.value;
    this.dispatchPromptChange();
  }

  private toggleLearnMode() {
    this.learnMode = !this.learnMode;
  }

  render() {
    const isActive = this.weight > 0;
    const classes = classMap({
      'prompt': true,
      'active': isActive,
      'learn-mode': this.learnMode,
    });
    
    // Dynamic styles for the neon glow
    const styles = `
        --accent-color: ${this.color};
        --accent-glow: ${this.color}40;
    `;

    return html`<div class=${classes} style=${styles}>
      <div class="midi-badge" @click=${this.toggleLearnMode}>
        ${this.learnMode ? 'Lrn' : `CC ${this.cc}`}
      </div>
      
      <weight-knob
        id="weight"
        value=${this.weight}
        color=${this.filtered ? '#888' : this.color}
        audioLevel=${this.filtered || !isActive ? 0 : this.audioLevel}
        @input=${this.updateWeight}></weight-knob>
        
      <span
        id="text"
        spellcheck="false"
        @focus=${this.onFocus}
        @keydown=${this.onKeyDown}
        @blur=${this.updateText}></span>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prompt-controller': PromptController;
  }
}