/**
 * @fileoverview Control real time music with a MIDI controller
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { PromptDjMidi } from './components/PromptDjMidi.js';
import { ToastMessage } from './components/ToastMessage.js';
import { LiveMusicHelper } from './utils/LiveMusicHelper.js';
import { AudioAnalyser } from './utils/AudioAnalyser.js';
import './components/InfoModal.js';

// Handle API Key for deployment
let apiKey = process.env.API_KEY;
if (!apiKey) {
  apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    apiKey = prompt('Please enter your Google Gemini API Key:');
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    }
  }
}

// Fallback to avoid immediate crash if user cancels prompt
const safeApiKey = apiKey || 'MISSING_KEY';

const ai = new GoogleGenAI({ apiKey: safeApiKey, apiVersion: 'v1alpha' });
const model = 'models/lyria-realtime-exp';

function main() {
  const pdjMidi = new PromptDjMidi();
  document.body.appendChild(pdjMidi);

  const infoModal = document.createElement('info-modal');
  document.body.appendChild(infoModal);

  if (!localStorage.getItem('promptDjMidiVisited')) {
    infoModal.show();
    localStorage.setItem('promptDjMidiVisited', 'true');
  }

  pdjMidi.addEventListener('show-info', () => {
    infoModal.show();
  });

  const toastMessage = new ToastMessage();
  document.body.appendChild(toastMessage);

  const liveMusicHelper = new LiveMusicHelper(ai, model);
  liveMusicHelper.setWeightedPrompts(pdjMidi.allPrompts);

  const audioAnalyser = new AudioAnalyser(liveMusicHelper.audioContext);
  liveMusicHelper.extraDestination = audioAnalyser.node;

  pdjMidi.addEventListener('prompts-changed', ((e) => {
    const prompts = e.detail;
    liveMusicHelper.setWeightedPrompts(prompts);
  }));

  pdjMidi.addEventListener('play-pause', () => {
    liveMusicHelper.playPause();
  });

  pdjMidi.addEventListener('toggle-recording', () => {
    liveMusicHelper.toggleRecording();
  });

  liveMusicHelper.addEventListener('recording-state-changed', ((e) => {
    const { isRecording, isProcessing } = e.detail;
    pdjMidi.isRecording = isRecording;
    pdjMidi.isProcessingRecording = isProcessing;
  }));

  liveMusicHelper.addEventListener('recording-saved', (() => {
    toastMessage.show('Recording saved!');
  }));

  liveMusicHelper.addEventListener('playback-state-changed', ((e) => {
    const playbackState = e.detail;
    pdjMidi.playbackState = playbackState;
    playbackState === 'playing' ? audioAnalyser.start() : audioAnalyser.stop();
  }));

  liveMusicHelper.addEventListener('filtered-prompt', ((e) => {
    const filteredPrompt = e.detail;
    toastMessage.show(filteredPrompt.filteredReason)
    pdjMidi.addFilteredPrompt(filteredPrompt.text);
  }));

  const errorToast = ((e) => {
    const error = e.detail;
    toastMessage.show(error);
  });

  liveMusicHelper.addEventListener('error', errorToast);
  pdjMidi.addEventListener('error', errorToast);

  audioAnalyser.addEventListener('audio-level-changed', ((e) => {
    const level = e.detail;
    pdjMidi.audioLevel = level;
  }));

}

main();