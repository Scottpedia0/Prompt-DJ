/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import type { PlaybackState, Prompt } from '../types.ts';
import { type AudioChunk, GoogleGenAI, type LiveMusicFilteredPrompt, type LiveMusicServerMessage, type LiveMusicSession, LiveMusicGenerationConfig } from '@google/genai';
import { decode, decodeAudioData } from './audio.ts';
import { throttle } from './throttle.ts';

export type RecordingState = { isRecording: boolean, isProcessing: boolean };

export class LiveMusicHelper extends EventTarget {

  private ai: GoogleGenAI;
  private model: string;

  private session: LiveMusicSession | null = null;
  private sessionPromise: Promise<LiveMusicSession> | null = null;

  private connectionError = true;
  private intentionalStop = false;

  private filteredPrompts = new Set<string>();
  private nextStartTime = 0;
  private bufferTime = 2;

  public readonly audioContext: AudioContext;
  public extraDestination: AudioNode | null = null;

  private outputNode: GainNode;
  private playbackState: PlaybackState = 'stopped';
  private isRecording = false;

  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private mediaStreamDestination: MediaStreamAudioDestinationNode;

  private prompts: Map<string, Prompt>;
  private currentConfig: LiveMusicGenerationConfig = { temperature: 1.0 };

  constructor(ai: GoogleGenAI, model: string) {
    super();
    this.ai = ai;
    this.model = model;
    this.prompts = new Map();
    this.audioContext = new AudioContext({ sampleRate: 48000 });
    this.outputNode = this.audioContext.createGain();
    this.mediaStreamDestination = this.audioContext.createMediaStreamDestination();
  }

  public async setConfig(config: LiveMusicGenerationConfig) {
      this.currentConfig = config;
      if (this.session) {
          try {
              await this.session.setMusicGenerationConfig({ config: this.currentConfig });
          } catch (e: any) {
              console.warn('Failed to update music config', e);
          }
      }
  }

  private getSession(): Promise<LiveMusicSession> {
    if (!this.sessionPromise) this.sessionPromise = this.connect();
    return this.sessionPromise;
  }

  private async connect(): Promise<LiveMusicSession> {
    this.sessionPromise = this.ai.live.music.connect({
      model: this.model,
      callbacks: {
        onmessage: async (e: LiveMusicServerMessage) => {
          if (e.setupComplete) {
            this.connectionError = false;
          }
          if (e.filteredPrompt) {
            this.filteredPrompts = new Set([...this.filteredPrompts, e.filteredPrompt.text!])
            this.dispatchEvent(new CustomEvent<LiveMusicFilteredPrompt>('filtered-prompt', { detail: e.filteredPrompt }));
          }
          if (e.serverContent?.audioChunks) {
            await this.processAudioChunks(e.serverContent.audioChunks);
          }
        },
        onerror: () => {
          this.connectionError = true;
          this.stop();
          this.dispatchEvent(new CustomEvent('error', { detail: 'Connection error, please restart audio.' }));
        },
        onclose: () => {
          if (!this.intentionalStop) {
            // Unexpected close (timeout or error), attempt reconnect
            this.dispatchEvent(new CustomEvent('info', { detail: 'Session refreshed.' }));
            this.session = null;
            this.sessionPromise = null;
            this.nextStartTime = 0;
            this.play();
          } else {
            // User initiated close or valid stop
            this.connectionError = true;
            this.session = null;
            this.sessionPromise = null;
            // State is already handled by stop()
          }
        },
      },
    });
    return this.sessionPromise;
  }

  private setPlaybackState(state: PlaybackState) {
    this.playbackState = state;
    this.dispatchEvent(new CustomEvent('playback-state-changed', { detail: state }));
  }

  private async processAudioChunks(audioChunks: AudioChunk[]) {
    if (this.playbackState === 'paused' || this.playbackState === 'stopped') return;
    const audioBuffer = await decodeAudioData(
      decode(audioChunks[0].data!),
      this.audioContext,
      48000,
      2,
    );
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputNode);
    if (this.nextStartTime === 0) {
      this.nextStartTime = this.audioContext.currentTime + this.bufferTime;
      setTimeout(() => {
        this.setPlaybackState('playing');
      }, this.bufferTime * 1000);
    }
    if (this.nextStartTime < this.audioContext.currentTime) {
      this.setPlaybackState('loading');
      this.nextStartTime = 0;
      return;
    }
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }

  public get activePrompts() {
    return Array.from(this.prompts.values())
      .filter((p) => {
        return !this.filteredPrompts.has(p.text) && p.weight !== 0;
      })
  }

  public readonly setWeightedPrompts = throttle(async (prompts: Map<string, Prompt>) => {
    this.prompts = prompts;

    if (this.activePrompts.length === 0) {
      this.dispatchEvent(new CustomEvent('error', { detail: 'There needs to be one active prompt to play.' }));
      this.pause();
      return;
    }

    // store the prompts to set later if we haven't connected yet
    // there should be a user interaction before calling setWeightedPrompts
    if (!this.session) return;

    const weightedPrompts = this.activePrompts.map((p) => {
      return {text: p.text, weight: p.weight};
    });
    try {
      await this.session.setWeightedPrompts({
        weightedPrompts,
      });
    } catch (e: any) {
      this.dispatchEvent(new CustomEvent('error', { detail: e.message }));
      this.pause();
    }
  }, 200);

  public async play() {
    this.intentionalStop = false;
    this.setPlaybackState('loading');
    this.session = await this.getSession();
    
    // Use the current stored config
    await this.session.setMusicGenerationConfig({ config: this.currentConfig });

    await this.setWeightedPrompts(this.prompts);
    this.audioContext.resume();
    this.session.play();
    this.outputNode.connect(this.audioContext.destination);
    if (this.extraDestination) this.outputNode.connect(this.extraDestination);
    this.outputNode.connect(this.mediaStreamDestination);
    this.outputNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.outputNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 0.1);
  }

  public pause() {
    this.intentionalStop = true;
    if (this.isRecording) {
      this.toggleRecording();
    }
    if (this.session) this.session.pause();
    this.setPlaybackState('paused');
    this.outputNode.gain.setValueAtTime(this.outputNode.gain.value, this.audioContext.currentTime);
    this.outputNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
    this.nextStartTime = 0;
  }

  public stop() {
    this.intentionalStop = true;
    if (this.isRecording) {
      this.toggleRecording();
    }
    if (this.session) this.session.stop();
    this.setPlaybackState('stopped');
    this.outputNode.gain.setValueAtTime(this.outputNode.gain.value, this.audioContext.currentTime);
    this.outputNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
    this.nextStartTime = 0;
    this.session = null;
    this.sessionPromise = null;
  }

  public async playPause() {
    switch (this.playbackState) {
      case 'playing':
        return this.pause();
      case 'paused':
      case 'stopped':
        return this.play();
      case 'loading':
        return this.stop();
    }
  }

  private dispatchRecordingState() {
    this.dispatchEvent(new CustomEvent<RecordingState>('recording-state-changed', {
      detail: {
        isRecording: this.isRecording,
        isProcessing: this.mediaRecorder?.state === 'inactive' && this.isRecording === false && this.recordedChunks.length > 0,
      }
    }));
  }

  private processRecording() {
    const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `prompt-dj-mix-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    this.recordedChunks = [];
    this.dispatchRecordingState();
    this.dispatchEvent(new CustomEvent('recording-saved'));
  }

  private startRecording() {
    if (this.playbackState !== 'playing') {
      this.dispatchEvent(new CustomEvent('error', {detail: 'Start playing music to record.'}));
      return;
    }
    this.isRecording = true;
    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(this.mediaStreamDestination.stream, { mimeType: 'audio/webm', audioBitsPerSecond: 256000 });
    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
    this.mediaRecorder.onstop = () => {
      this.processRecording();
    };
    this.mediaRecorder.start();
    this.dispatchRecordingState();
  }

  private stopRecording() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    this.dispatchRecordingState();
  }

  public toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

}