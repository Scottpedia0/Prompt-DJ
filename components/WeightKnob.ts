/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

const MIN_HALO_SCALE = 1;
const MAX_HALO_SCALE = 2;
const HALO_LEVEL_MODIFIER = 1;

@customElement('weight-knob')
export class WeightKnob extends LitElement {
  static styles = css`
    :host {
      cursor: ns-resize;
      position: relative;
      width: 100px; /* Smaller fixed width */
      height: 100px;
      flex-shrink: 0;
      touch-action: none;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    #halo {
      position: absolute;
      z-index: -1;
      width: 60px; /* Match inner circle roughly */
      height: 60px;
      border-radius: 50%;
      mix-blend-mode: screen;
      will-change: transform;
      opacity: 0.6;
    }
    .hit-area {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        z-index: 10;
    }
  `;

  @property({ type: Number }) value = 0;
  @property({ type: String }) color = '#000';
  @property({ type: Number }) audioLevel = 0;

  private dragStartPos = 0;
  private dragStartValue = 0;

  constructor() {
    super();
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
  }

  private handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    this.dragStartPos = e.clientY;
    this.dragStartValue = this.value;
    document.body.classList.add('dragging');
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  private handlePointerMove(e: PointerEvent) {
    const delta = this.dragStartPos - e.clientY;
    this.value = this.dragStartValue + delta * 0.01;
    this.value = Math.max(0, Math.min(2, this.value));
    (this as unknown as HTMLElement).dispatchEvent(new CustomEvent<number>('input', { detail: this.value }));
  }

  private handlePointerUp() {
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    document.body.classList.remove('dragging');
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY;
    this.value = this.value + delta * -0.0025;
    this.value = Math.max(0, Math.min(2, this.value));
    (this as unknown as HTMLElement).dispatchEvent(new CustomEvent<number>('input', { detail: this.value }));
  }

  private describeArc(
    centerX: number,
    centerY: number,
    startAngle: number,
    endAngle: number,
    radius: number,
  ): string {
    const startX = centerX + radius * Math.cos(startAngle);
    const startY = centerY + radius * Math.sin(startAngle);
    const endX = centerX + radius * Math.cos(endAngle);
    const endY = centerY + radius * Math.sin(endAngle);

    const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';

    return (
      `M ${startX} ${startY}` +
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
    );
  }

  render() {
    const rotationRange = Math.PI * 2 * 0.75;
    const minRot = -rotationRange / 2 - Math.PI / 2;
    const maxRot = rotationRange / 2 - Math.PI / 2;
    const rot = minRot + (this.value / 2) * (maxRot - minRot);
    const dotStyle = styleMap({
      transform: `translate(50px, 50px) rotate(${rot}rad)`,
    });

    let scale = (this.value / 2) * (MAX_HALO_SCALE - MIN_HALO_SCALE);
    scale += MIN_HALO_SCALE;
    scale += this.audioLevel * HALO_LEVEL_MODIFIER;

    const haloStyle = styleMap({
      display: this.value > 0 ? 'block' : 'none',
      background: this.color,
      transform: `scale(${scale})`,
    });

    // Drawing on 100x100 coord system
    return html`
      <div class="hit-area" @pointerdown=${this.handlePointerDown} @wheel=${this.handleWheel}></div>
      <div id="halo" style=${haloStyle}></div>
      
      <svg viewBox="0 0 100 100">
        <!-- Background Track -->
        <path
          d=${this.describeArc(50, 50, minRot, maxRot, 38)}
          fill="none"
          stroke="#333"
          stroke-width="4"
          stroke-linecap="round" />
          
        <!-- Active Value Arc -->
        <path
          d=${this.describeArc(50, 50, minRot, rot, 38)}
          fill="none"
          stroke="#fff"
          stroke-width="4"
          stroke-linecap="round" />
          
        <!-- Thumb Dot -->
        <g style=${dotStyle}>
           <circle cx="38" cy="0" r="4" fill="#fff" />
        </g>
        
        <!-- Center Cap -->
        <circle cx="50" cy="50" r="10" fill="#222" stroke="#444" stroke-width="1" />
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'weight-knob': WeightKnob;
  }
}
