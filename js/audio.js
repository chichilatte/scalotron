/** 
 * @license  © Chichi Latté 2026
 * @file Audio engine — Web Audio API synthesis, keyboard mapping, polyphonic playback. 
 */

import { constants } from './config.js';
import { chartInstance } from './chart.js';

// ── Audio engine ──────────────────────────────────────────────
let audioCtx = null;
// Sequential three-row mapping — 26 keys, ~2 octaves chromatic from root
// Reads left-to-right, top-to-bottom: QWERTYUIOP / ASDFGHJKL / ZXCVBNM
export const KEY_MAP = {
    KeyQ: 0, KeyW: 1, KeyE: 2, KeyR: 3, KeyT: 4, KeyY: 5, KeyU: 6, KeyI: 7, KeyO: 8, KeyP: 9,
    KeyA:10, KeyS:11, KeyD:12, KeyF:13, KeyG:14, KeyH:15, KeyJ:16, KeyK:17, KeyL:18,
    KeyZ:19, KeyX:20, KeyC:21, KeyV:22, KeyB:23, KeyN:24, KeyM:25,
};
export const playedFreqs = new Set(); // active frequencies (supports polyphony)

function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

export function playFrequency(freq) {
    ensureAudio();
    const now = audioCtx.currentTime;
    const inst = document.querySelector('.ctrl-btn-sm[data-inst].active').dataset.inst;

    if (inst === 'piano') {
        // Triangle + 2nd harmonic, quick attack, medium decay
        const osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        const osc2 = audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, now);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        const gain2 = audioCtx.createGain();
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.06, now + 0.015);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        osc.connect(gain).connect(audioCtx.destination);
        osc2.connect(gain2).connect(audioCtx.destination);
        osc.start(now); osc2.start(now);
        osc.stop(now + 2.8); osc2.stop(now + 2.8);

    } else if (inst === 'organ') {
        // Stack of sine harmonics at 1x, 2x, 3x, 4x, 6x, 8x
        var harmonics = [1, 0.7, 0.5, 0.3, 0.15, 0.08];
        var mults = [1, 2, 3, 4, 6, 8];
        var gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3);
        gain.connect(audioCtx.destination);
        for (var h = 0; h < harmonics.length; h++) {
            var osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq * mults[h], now);
            var hgain = audioCtx.createGain();
            hgain.gain.setValueAtTime(harmonics[h] * 0.15, now);
            osc.connect(hgain).connect(gain);
            osc.start(now);
            osc.stop(now + 3);
        }

    } else if (inst === 'strings') {
        // Slightly detuned sawtooths with slow attack for ensemble feel
        var gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.25);
        gain.gain.setValueAtTime(0.22, now + 1.0);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        gain.connect(audioCtx.destination);
        for (var d = 0; d < 3; d++) {
            var osc = audioCtx.createOscillator();
            osc.type = 'sawtooth';
            var detune = (d - 1) * 4; // -4, 0, +4 cents
            osc.frequency.setValueAtTime(freq, now);
            osc.detune.setValueAtTime(detune, now);
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 3);
        }

    } else if (inst === 'pluck') {
        // Karplus-Strong plucked string via noise burst + feedback delay
        var delay = audioCtx.createDelay(2);
        delay.delayTime.setValueAtTime(1 / freq, now);
        var feedback = audioCtx.createGain();
        feedback.gain.setValueAtTime(0.8, now);
        feedback.gain.linearRampToValueAtTime(0.5, now + 1);
        feedback.gain.linearRampToValueAtTime(0.001, now + 2.5);
        var filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 4, now);
        var out = audioCtx.createGain();
        out.gain.setValueAtTime(0.4, now);
        out.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        delay.connect(feedback).connect(filter).connect(delay);
        filter.connect(out).connect(audioCtx.destination);
        // Seed with noise burst
        var buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.005, audioCtx.sampleRate);
        var data = buf.getChannelData(0);
        for (var s = 0; s < data.length; s++) data[s] = Math.random() * 2 - 1;
        var noise = audioCtx.createBufferSource();
        noise.buffer = buf;
        noise.connect(delay);
        noise.start(now);

    } else if (inst === 'bell') {
        // Inharmonic sine partials: 1.0, 2.76, 5.4, 8.9, 13.3 times fundamental
        var partials = [1, 0.55, 0.3, 0.15, 0.07];
        var mults = [1, 2.76, 5.40, 8.93, 13.3];
        for (var p = 0; p < partials.length; p++) {
            var osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq * mults[p], now);
            var g = audioCtx.createGain();
            g.gain.setValueAtTime(partials[p] * 0.12, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 4 * (1 - p * 0.18));
            osc.connect(g).connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 5);
        }

    } else if (inst === 'brass') {
        // Sawtooth through lowpass filter sweep (wah effect)
        var osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        var filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 0.8, now);
        filter.frequency.linearRampToValueAtTime(freq * 6, now + 0.3);
        filter.Q.setValueAtTime(3, now);
        var gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.06);
        gain.gain.setValueAtTime(0.2, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        osc.connect(filter).connect(gain).connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 3);
    }
}

// Map keyboard to first N notes of the visible range — Q = first note
export function getKeyFreqsFromRange(startKey, endKey) {
    const result = {};
    for (const [code, offset] of Object.entries(KEY_MAP)) {
        const kn = startKey + offset;
        if (kn > endKey) {
            result[code] = null; // beyond visible range — silent
            continue;
        }
        const exp = (kn - 49) / 12;
        const freq = parseFloat((440 * Math.pow(2, exp)).toFixed(2));
        const s = kn + 8;
        const ni = s % 12;
        const oct = Math.floor(s / 12);
        result[code] = {
            freq: freq,
            noteName: constants.NOTE_NAMES[ni] + String(oct),
            keyNumber: kn
        };
    }
    return result;
}

let _currentKeyFreqs = getKeyFreqsFromRange(1, 88);
export function setCurrentKeyFreqs(rangeStart, rangeEnd) {
    _currentKeyFreqs = getKeyFreqsFromRange(rangeStart, rangeEnd);
}
// Check current key freqs from outside (read-only view)
export function getCurrentKeyFreqs() { return _currentKeyFreqs; }

document.addEventListener('keydown', function(e) {
    if (e.repeat) return;
    const code = e.code;
    if (!(code in KEY_MAP)) return;
    // Don't intercept when typing in selects/inputs
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    e.preventDefault();
    const info = _currentKeyFreqs[code];
    if (!info) return; // beyond visible range
    playedFreqs.add(info.freq);
    playFrequency(info.freq);
    if (chartInstance) chartInstance.update('none');
});

document.addEventListener('keyup', function(e) {
    const code = e.code;
    if (!(code in KEY_MAP)) return;
    const info = _currentKeyFreqs[code];
    if (info) playedFreqs.delete(info.freq);
    if (chartInstance) chartInstance.update('none');
});
