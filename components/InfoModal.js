/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';

export class InfoModal extends LitElement {
  static get properties() {
    return {
      showing: { state: true }
    };
  }

  static get styles() {
    return css`
    :host {
      --transition-duration: 0.3s;
    }
    .backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 10;
      opacity: 0;
      transition: opacity var(--transition-duration) ease;
      pointer-events: none;
    }
    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      background-color: #222;
      color: #fff;
      padding: 2em;
      border-radius: 12px;
      width: min(500px, 90vw);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      border: 1px solid #444;
      z-index: 11;
      opacity: 0;
      transition: opacity var(--transition-duration) ease, transform var(--transition-duration) ease;
      pointer-events: none;
    }
    :host([showing]) .backdrop,
    :host([showing]) .modal {
      opacity: 1;
      pointer-events: auto;
    }
    :host([showing]) .modal {
        transform: translate(-50%, -50%) scale(1);
    }
    h2 {
      margin-top: 0;
      font-weight: 500;
      font-size: 1.5rem;
    }
    p, li {
      line-height: 1.6;
      color: #ccc;
    }
    ul {
      padding-left: 20px;
    }
    button {
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      color: #000;
      background: #fff;
      border: none;
      border-radius: 6px;
      padding: 0.75em 1.5em;
      margin-top: 1.5em;
      float: right;
      transition: background-color 0.2s;
    }
    button:hover {
        background-color: #ddd;
    }
  `;
  }

  constructor() {
    super();
    this.showing = false;
  }

  show() {
    this.showing = true;
    this.toggleAttribute('showing', true);
  }

  hide() {
    this.showing = false;
    this.toggleAttribute('showing', false);
  }

  render() {
    return html`
      <div class="backdrop" @click=${this.hide}></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Welcome to Prompt DJ!</h2>
        <p>Create generative music in real-time. Here's how to get started:</p>
        <ul>
            <li>Press the <strong>Play</strong> button to start and stop the music.</li>
            <li>Turn the <strong>knobs</strong> by dragging them up/down with your mouse or using the scroll wheel.</li>
            <li>Click any <strong>text label</strong> (e.g., "Bossa Nova") to write your own prompt.</li>
            <li>Use the <strong>MIDI</strong> button to connect a MIDI controller for hands-on control.</li>
        </ul>
        <button @click=${this.hide}>Got It!</button>
      </div>
    `;
  }
}

customElements.define('info-modal', InfoModal);
