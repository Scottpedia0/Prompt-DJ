/**
 * @fileoverview Control real time music with a MIDI controller
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlaybackState, Prompt } from './types.ts';
import { GoogleGenAI, LiveMusicFilteredPrompt } from '@google/genai';
import { PromptDjMidi } from './components/PromptDjMidi.ts';
import { ToastMessage } from './components/ToastMessage.ts';
import { LiveMusicHelper } from './utils/LiveMusicHelper.ts';
import { AudioAnalyser } from './utils/AudioAnalyser.ts';
import { ChatHelper } from './utils/ChatHelper.ts';
import './components/InfoModal.ts';
import type { InfoModal } from './components/InfoModal.ts';

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
  // Use audioPrompts to get BPM included
  liveMusicHelper.setWeightedPrompts(pdjMidi.audioPrompts);

  const chatHelper = new ChatHelper(ai);

  const audioAnalyser = new AudioAnalyser(liveMusicHelper.audioContext);
  liveMusicHelper.extraDestination = audioAnalyser.node;

  pdjMidi.addEventListener('prompts-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<Map<string, Prompt>>;
    const prompts = customEvent.detail;
    liveMusicHelper.setWeightedPrompts(prompts);
  }));
  
  // Handle config changes (e.g. Temperature)
  pdjMidi.addEventListener('config-changed', ((e: Event) => {
      const customEvent = e as CustomEvent<{ temperature: number }>;
      liveMusicHelper.setConfig({ temperature: customEvent.detail.temperature });
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
  pdjMidi.addEventListener('chat-command', async (e: Event) => {
    const customEvent = e as CustomEvent<{ text: string }>;
    const text = customEvent.detail.text;
    
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

  const infoToast = ((e: Event) => {
    const customEvent = e as CustomEvent<string>;
    const info = customEvent.detail;
    toastMessage.show(info);
  });

  liveMusicHelper.addEventListener('error', errorToast);
  liveMusicHelper.addEventListener('info', infoToast);
  pdjMidi.addEventListener('error', errorToast);

  audioAnalyser.addEventListener('audio-level-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<number>;
    const level = customEvent.detail;
    pdjMidi.audioLevel = level;
  }));

}

main();