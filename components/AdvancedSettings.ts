/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('advanced-settings')
export class AdvancedSettings extends LitElement {
  static styles = css`
    :host {
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      z-index: 90;
      pointer-events: none;
      display: flex;
      flex-direction: row;
      justify-content: flex-end;
    }

    .drawer {
      pointer-events: auto;
      height: 100%;
      width: 280px;
      background-color: rgba(12, 12, 16, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-left: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
      transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
      transform: translateX(100%);
      display: flex;
      flex-direction: column;
    }

    .drawer.open {
      transform: translateX(0);
    }

    /* Toggle Handle (Vertical Tab) */
    .handle-tab {
      pointer-events: auto;
      position: absolute;
      top: 50%;
      right: 100%; /* Outside the drawer */
      transform: translateY(-50%) translateX(100%); /* Start flush */
      width: 32px;
      height: 120px;
      background: rgba(12, 12, 16, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-right: none;
      border-radius: 8px 0 0 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      z-index: 91;
    }
    
    .drawer.open + .handle-tab, .handle-tab.active {
       right: 280px; /* Move with drawer */
       transform: translateY(-50%);
    }

    .handle-icon {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      color: #888;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      transform: rotate(180deg);
    }

    .handle-tab:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    /* Content */
    .header {
        padding: 20px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .content {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 32px;
      overflow-y: auto;
      flex: 1;
    }

    .section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-title {
      font-size: 10px;
      font-weight: 700;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .control-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #aaa;
    }

    .value-text {
      font-family: 'Roboto Mono', monospace;
      color: #a0ff00;
    }

    /* Styled Range Input */
    input[type=range] {
      -webkit-appearance: none;
      width: 100%;
      background: transparent;
      margin: 6px 0;
      cursor: pointer;
    }

    input[type=range]::-webkit-slider-runnable-track {
      width: 100%;
      height: 2px;
      background: #333;
      border-radius: 2px;
    }

    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 12px;
      width: 12px;
      border-radius: 50%;
      background: #ddd;
      margin-top: -5px;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
      transition: transform 0.1s, background 0.1s;
    }

    input[type=range]:hover::-webkit-slider-thumb {
      transform: scale(1.3);
      background: #fff;
    }
    
    input[type=range]:active::-webkit-slider-thumb {
      background: #a0ff00;
    }

    /* Inputs & Selects */
    select {
        background: #1a1a20;
        border: 1px solid #333;
        color: #eee;
        padding: 8px;
        border-radius: 4px;
        width: 100%;
        outline: none;
        font-size: 11px;
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      user-select: none;
      font-size: 12px;
      color: #ccc;
      padding: 4px 0;
    }
    
    .checkbox-row:hover { color: #fff; }

    input[type=checkbox] {
      appearance: none;
      width: 14px;
      height: 14px;
      background: #222;
      border: 1px solid #444;
      border-radius: 2px;
      position: relative;
    }

    input[type=checkbox]:checked {
      background: #a0ff00;
      border-color: #a0ff00;
    }
    
    input[type=checkbox]:checked::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 5px;
        width: 3px;
        height: 7px;
        border: solid #000;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
    }
  `;

  @property({ type: Boolean }) expanded = false;

  // Controlled Props
  @property({ type: Number }) temperature = 1.0;
  @property({ type: Number }) topK = 40;
  
  @property({ type: String }) bpm = 'Auto';
  @property({ type: Boolean }) bpmAuto = true;
  
  @property({ type: Number }) density = 0.5;
  @property({ type: Boolean }) densityAuto = true;

  @property({ type: Number }) brightness = 0.5;
  @property({ type: Boolean }) brightnessAuto = true;

  @property({ type: Boolean }) muteBass = false;
  @property({ type: Boolean }) muteDrums = false;

  @property({ type: Array }) midiInputs: string[] = [];
  @property({ type: String }) activeMidiInputId: string | null = null;
  @property({ type: Object }) midiDispatcher: any = null;

  private toggleExpanded() {
    this.expanded = !this.expanded;
  }

  private handleMidiChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.emitChange('midi-input-changed', select.value);
  }
  
  private getDeviceName(id: string) {
    return this.midiDispatcher?.getDeviceName(id) || id;
  }

  private emitChange(key: string, value: any) {
      (this as unknown as HTMLElement).dispatchEvent(new CustomEvent('setting-changed', {
          detail: { key, value }
      }));
  }

  render() {
    return html`
      <div class="drawer ${this.expanded ? 'open' : ''}">
        <div class="header">Studio Settings</div>
        <div class="content">
          
          <!-- Musical -->
          <div class="section">
            <div class="section-title">Global Controls</div>

            <div class="control-row">
              <div class="label-row"><span>BPM</span></div>
              <div style="display: flex; gap: 8px; align-items: center;">
                 <span class="value-text" style="flex: 1; text-align: right; margin-right: 8px;">
                    ${this.bpmAuto ? 'AUTO' : this.bpm}
                 </span>
                 <label class="checkbox-row">
                    <input type="checkbox" ?checked=${this.bpmAuto} @change=${(e: any) => this.emitChange('bpmAuto', e.target.checked)}> Auto
                 </label>
              </div>
            </div>

            <div class="control-row">
              <div class="label-row">
                <span>Density</span>
                <span class="value-text">${this.densityAuto ? 'AUTO' : Math.round(this.density * 100) + '%'}</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" .value=${this.density} ?disabled=${this.densityAuto} @input=${(e: any) => this.emitChange('density', parseFloat(e.target.value))}>
              <label class="checkbox-row" style="justify-content: flex-end;">
                  <input type="checkbox" ?checked=${this.densityAuto} @change=${(e: any) => this.emitChange('densityAuto', e.target.checked)}> Auto
              </label>
            </div>

            <div class="control-row">
              <div class="label-row">
                <span>Brightness</span>
                <span class="value-text">${this.brightnessAuto ? 'AUTO' : Math.round(this.brightness * 100) + '%'}</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" .value=${this.brightness} ?disabled=${this.brightnessAuto} @input=${(e: any) => this.emitChange('brightness', parseFloat(e.target.value))}>
              <label class="checkbox-row" style="justify-content: flex-end;">
                  <input type="checkbox" ?checked=${this.brightnessAuto} @change=${(e: any) => this.emitChange('brightnessAuto', e.target.checked)}> Auto
              </label>
            </div>
          </div>

          <!-- Mutes -->
          <div class="section">
             <div class="section-title">Mix Actions</div>
             <label class="checkbox-row">
                <input type="checkbox" ?checked=${this.muteBass} @change=${(e: any) => this.emitChange('muteBass', e.target.checked)}>
                Mute Bass Frequencies
             </label>
             <label class="checkbox-row">
                <input type="checkbox" ?checked=${this.muteDrums} @change=${(e: any) => this.emitChange('muteDrums', e.target.checked)}>
                Mute Percussion
             </label>
          </div>

          <!-- AI Config -->
          <div class="section">
            <div class="section-title">Generation Config</div>
            <div class="control-row">
              <div class="label-row">
                <span>Creativity (Temp)</span>
                <span class="value-text">${this.temperature}</span>
              </div>
              <input type="range" min="0" max="2" step="0.1" .value=${this.temperature} @input=${(e: any) => this.emitChange('temperature', parseFloat(e.target.value))}>
            </div>
          </div>

          <!-- MIDI -->
          <div class="section">
            <div class="section-title">Hardware</div>
            <select @change=${this.handleMidiChange} .value=${this.activeMidiInputId || ''}>
                 <option value="" disabled selected>Select MIDI Controller</option>
                 ${this.midiInputs.length > 0 
                    ? this.midiInputs.map(id => html`<option value=${id}>${this.getDeviceName(id)}</option>`)
                    : html`<option value="" disabled>No devices found</option>`
                 }
            </select>
          </div>

        </div>
      </div>
      
      <div class="handle-tab ${this.expanded ? 'active' : ''}" @click=${this.toggleExpanded}>
         <div class="handle-icon">Settings</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'advanced-settings': AdvancedSettings;
  }
}
