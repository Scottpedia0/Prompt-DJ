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
import { ChatHelper } from './utils/ChatHelper.js';
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
  liveMusicHelper.setWeightedPrompts(pdjMidi.audioPrompts);

  const chatHelper = new ChatHelper(ai);

  const audioAnalyser = new AudioAnalyser(liveMusicHelper.audioContext);
  liveMusicHelper.extraDestination = audioAnalyser.node;

  pdjMidi.addEventListener('prompts-changed', ((e) => {
    const prompts = e.detail;
    liveMusicHelper.setWeightedPrompts(prompts);
  }));
  
  // Handle config changes (e.g. Temperature)
  pdjMidi.addEventListener('config-changed', ((e) => {
      const { temperature } = e.detail;
      liveMusicHelper.setConfig({ temperature });
  }));

  pdjMidi.addEventListener('play-pause', () => {
    liveMusicHelper.playPause();
  });

  pdjMidi.addEventListener('toggle-recording', () => {
    liveMusicHelper.toggleRecording();
  });
  
  // Handle Hard Reset
  pdjMidi.addEventListener('reset-audio', () => {
      liveMusicHelper.stop();
      toastMessage.show("Audio engine reset.");
  });

  // Handle Chat Commands
  pdjMidi.addEventListener('chat-command', async (e) => {
    const text = e.detail.text;
    
    // Get visible prompts for context
    const currentPrompts = Array.from(pdjMidi.allPrompts.values());
    const currentBpm = pdjMidi.bpmAuto ? 'Auto' : pdjMidi.bpm;
    
    // Process via Gemini
    const actions = await chatHelper.sendCommand(text, currentPrompts, currentBpm);
    
    // Perform all actions in a batch to update state consistently
    pdjMidi.performActions(actions);
    
    // Determine toast message
    let message = '';
    if (actions.length > 0) {
        const lastAction = actions[actions.length - 1];
        if (lastAction.type === 'addPrompt') {
             message = `AI: Added "${lastAction.data.text}"`;
        } else if (lastAction.type === 'clearAll') {
             message = "AI: Cleared all stems";
        } else {
             message = `AI: Updated mix based on "${text}"`;
        }
    } else {
        message = `AI: I didn't change anything for "${text}"`;
    }
    
    pdjMidi.setChatProcessing(false);
    toastMessage.show(message);
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
  
  const infoToast = ((e) => {
    const info = e.detail;
    toastMessage.show(info);
  });

  liveMusicHelper.addEventListener('error', errorToast);
  liveMusicHelper.addEventListener('info', infoToast);
  pdjMidi.addEventListener('error', errorToast);

  audioAnalyser.addEventListener('audio-level-changed', ((e) => {
    const level = e.detail;
    pdjMidi.audioLevel = level;
  }));

}

main();