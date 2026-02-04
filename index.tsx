/**
 * @fileoverview Control real time music with a MIDI controller
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlaybackState, Prompt } from './types';
import { GoogleGenAI, LiveMusicFilteredPrompt } from '@google/genai';
import { PromptDjMidi } from './components/PromptDjMidi';
import { ToastMessage } from './components/ToastMessage';
import { LiveMusicHelper } from './utils/LiveMusicHelper';
import { AudioAnalyser } from './utils/AudioAnalyser';
import './components/InfoModal';
import type { InfoModal } from './components/InfoModal';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, apiVersion: 'v1alpha' });
const model = 'models/lyria-realtime-exp';

function main() {
  const pdjMidi = new PromptDjMidi() as PromptDjMidi & HTMLElement;
  document.body.appendChild(pdjMidi);

  const infoModal = document.createElement('info-modal') as InfoModal & HTMLElement;
  document.body.appendChild(infoModal);

  if (!localStorage.getItem('promptDjMidiVisited')) {
    infoModal.show();
    localStorage.setItem('promptDjMidiVisited', 'true');
  }

  pdjMidi.addEventListener('show-info', () => {
    infoModal.show();
  });

  const toastMessage = new ToastMessage() as ToastMessage & HTMLElement;
  document.body.appendChild(toastMessage);

  const liveMusicHelper = new LiveMusicHelper(ai, model);
  liveMusicHelper.setWeightedPrompts(pdjMidi.allPrompts);

  const audioAnalyser = new AudioAnalyser(liveMusicHelper.audioContext);
  liveMusicHelper.extraDestination = audioAnalyser.node;

  pdjMidi.addEventListener('prompts-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<Map<string, Prompt>>;
    const prompts = customEvent.detail;
    liveMusicHelper.setWeightedPrompts(prompts);
  }));

  pdjMidi.addEventListener('play-pause', () => {
    liveMusicHelper.playPause();
  });

  pdjMidi.addEventListener('toggle-recording', () => {
    liveMusicHelper.toggleRecording();
  });

  liveMusicHelper.addEventListener('recording-state-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<{isRecording: boolean, isProcessing: boolean}>;
    const { isRecording, isProcessing } = customEvent.detail;
    pdjMidi.isRecording = isRecording;
    pdjMidi.isProcessingRecording = isProcessing;
  }));

  liveMusicHelper.addEventListener('recording-saved', (() => {
    toastMessage.show('Recording saved!');
  }));

  liveMusicHelper.addEventListener('playback-state-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<PlaybackState>;
    const playbackState = customEvent.detail;
    pdjMidi.playbackState = playbackState;
    playbackState === 'playing' ? audioAnalyser.start() : audioAnalyser.stop();
  }));

  liveMusicHelper.addEventListener('filtered-prompt', ((e: Event) => {
    const customEvent = e as CustomEvent<LiveMusicFilteredPrompt>;
    const filteredPrompt = customEvent.detail;
    toastMessage.show(filteredPrompt.filteredReason!)
    pdjMidi.addFilteredPrompt(filteredPrompt.text!);
  }));

  const errorToast = ((e: Event) => {
    const customEvent = e as CustomEvent<string>;
    const error = customEvent.detail;
    toastMessage.show(error);
  });

  liveMusicHelper.addEventListener('error', errorToast);
  pdjMidi.addEventListener('error', errorToast);

  audioAnalyser.addEventListener('audio-level-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<number>;
    const level = customEvent.detail;
    pdjMidi.audioLevel = level;
  }));

}

main();