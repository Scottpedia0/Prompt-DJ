/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { classMap } from 'lit/directives/class-map.js';

import './WeightKnob.js';

export class PromptController extends LitElement {
  static get properties() {
    return {
      promptId: { type: String },
      text: { type: String },
      weight: { type: Number },
      color: { type: String },
      filtered: { type: Boolean, reflect: true },
      cc: { type: Number },
      channel: { type: Number },
      learnMode: { type: Boolean },
      showCC: { type: Boolean },
      midiDispatcher: { type: Object },
      audioLevel: { type: Number },
    };
  }

  static get styles() {
    return css`
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
  }

  constructor() {
    super();
    this.promptId = '';
    this.text = '';
    this.weight = 0;
    this.color = '#ffffff';
    this.filtered = false;
    this.cc = 0;
    this.channel = 0;
    this.learnMode = false;
    this.showCC = false;
    this.midiDispatcher = null;
    this.audioLevel = 0;
  }

  get weightInput() {
    return this.renderRoot.querySelector('weight-knob');
  }

  get textInput() {
    return this.renderRoot.querySelector('#text');
  }

  connectedCallback() {
    super.connectedCallback();
    this.midiDispatcher?.addEventListener('cc-message', (e) => {
      const { channel, cc, value } = e.detail;
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

  update(changedProperties) {
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

  dispatchPromptChange() {
    this.dispatchEvent(
      new CustomEvent('prompt-changed', {
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

  onKeyDown(e) {
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

  resetText() {
    this.text = this.lastValidText;
    this.textInput.textContent = this.lastValidText;
  }

  async updateText() {
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

  onFocus() {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(this.textInput);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  updateWeight() {
    this.weight = this.weightInput.value;
    this.dispatchPromptChange();
  }

  toggleLearnMode() {
    this.learnMode = !this.learnMode;
  }

  render() {
    const isActive = this.weight > 0;
    const classes = classMap({
      'prompt': true,
      'active': isActive,
      'learn-mode': this.learnMode,
    });
    
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

customElements.define('prompt-controller', PromptController);
