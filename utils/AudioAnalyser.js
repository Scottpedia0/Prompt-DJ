/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/** Simple class for getting the current audio level. */
export class AudioAnalyser extends EventTarget {
  constructor(context) {
    super();
    this.node = context.createAnalyser();
    this.node.smoothingTimeConstant = 0;
    this.freqData = new Uint8Array(this.node.frequencyBinCount);
    this.loop = this.loop.bind(this);
    this.rafId = null;
    this.start = this.loop;
  }
  getCurrentLevel() {
    this.node.getByteFrequencyData(this.freqData);
    const avg = this.freqData.reduce((a, b) => a + b, 0) / this.freqData.length;
    return avg / 0xff;
  }
  loop() {
    this.rafId = requestAnimationFrame(this.loop);
    const level = this.getCurrentLevel();
    this.dispatchEvent(new CustomEvent('audio-level-changed', { detail: level }));
  }
  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
