/** 
 * @license  © Chichi Latté 2026
 * @file Melody player — pattern generator, tune loader (JSON), and playback scheduler. 
 */

import { constants } from './config.js';
import { playedFreqs, playFrequency } from './audio.js';
import { chartInstance, updateChart, ALL_88_KEYS } from './chart.js';
import { currentRootNote, setRootNote } from './app.js';

// ── Melodies ──────────────────────────────────────────────────
export var TUNES = [];

var melodyTimer = null;
export var activeMelodyId = null; // e.g. 'pattern-2' or 'tune-1'

export function loadTunes(callback) {
    var loaded = 0;
    TUNES = [];
    constants.TUNE_FILES.forEach(function(file) {
        fetch('tunes/' + file)
            .then(function(r) { return r.json(); })
            .then(function(tune) {
                TUNES.push(tune);
                loaded++;
                if (loaded === constants.TUNE_FILES.length && callback) callback();
            })
            .catch(function() {
                loaded++;
                if (loaded === constants.TUNE_FILES.length && callback) callback();
            });
    });
}

export function stopMelody() {
    if (melodyTimer) { clearTimeout(melodyTimer); melodyTimer = null; }
    playedFreqs.clear();
    if (chartInstance) chartInstance.update('none');
    document.querySelectorAll('.melody-btn').forEach(function(b) { b.classList.remove('active'); });
    activeMelodyId = null;
}

// ── Dynamic pattern generator ─────────────────────────────────
function getScaleIntervals() {
    var scaleType = document.querySelector('.ctrl-btn[data-scale].active').dataset.scale;
    if (scaleType === 'chromatic')  return constants.CHROMATIC_STEPS.split(' ').map(Number);
    if (scaleType === 'major')      return constants.MAJOR_STEPS.split(' ').map(Number);
    if (scaleType === 'minor')      return constants.MINOR_STEPS.split(' ').map(Number);
    if (scaleType === 'harmonicMinor') return constants.HARMONIC_MINOR_STEPS.split(' ').map(Number);
    if (scaleType === 'byzantine') return constants.BYZANTINE_STEPS.split(' ').map(Number);
    if (scaleType === 'majorPentatonic') return constants.MAJOR_PENTATONIC_STEPS.split(' ').map(Number);
    if (scaleType === 'minorPentatonic') return constants.MINOR_PENTATONIC_STEPS.split(' ').map(Number);
    return constants.MAJOR_STEPS.split(' ').map(Number);
}

function degreeToSemitone(deg, intervals) {
    var n = intervals.length;
    var oct = Math.floor(deg / n);
    var idx = ((deg % n) + n) % n;
    return intervals[idx] + oct * 12;
}

function findRootMidiInRange() {
    var rootPitch = currentRootNote;
    var rp = document.querySelector('.ctrl-btn[data-range].active').dataset.range;
    var sk, ek;
    var p = rp.split(','); sk = parseInt(p[0]); ek = parseInt(p[1]);
    // Find the root pitch class nearest to the middle of the visible range
    var mid = Math.floor((sk + ek) / 2);
    var bestKey = null;
    for (var k = sk; k <= ek; k++) {
        if (ALL_88_KEYS[k - 1].pitchClass === rootPitch) {
            if (bestKey === null || Math.abs(k - mid) < Math.abs(bestKey - mid)) {
                bestKey = k;
            }
        }
    }
    if (!bestKey) bestKey = Math.min(40, ek); // fallback to middle C area
    return bestKey + 20; // key number → MIDI (key 1 = A0 = MIDI 21, so MIDI = key + 20)
}

function generatePatternTune(pattern) {
    var intervals = getScaleIntervals();
    var rootMidi = findRootMidiInRange() + 12; // one octave up from range center
    var baseOct = 4;
    var steps = pattern.semitones || pattern.degs;
    var tempoSec = pattern.tempo / 1000; // ms → seconds
    var notes = [];
    for (var i = 0; i < steps.length; i++) {
        var semitone = pattern.semitones
            ? pattern.semitones[i]
            : degreeToSemitone(pattern.degs[i], intervals);
        var midi = rootMidi + semitone;
        var pitch = constants.NOTE_NAMES[midi % 12];
        var oct = Math.floor(midi / 12) - baseOct;
        notes.push({ pitch: pitch, oct: oct, time: parseFloat((i * tempoSec).toFixed(2)) });
    }
    return {
        name: pattern.name,
        notes: notes,
        baseOctave: baseOct,
        loopGap: 0.15
        // no 'key' — patterns don't force root key changes
    };
}

// Tune player — uses notes[{pitch,oct,time}], time in seconds
var PITCH_TO_SEMI = {C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
function pitchToMidi(pitch, oct, baseOctave) {
    return (baseOctave + oct) * 12 + (PITCH_TO_SEMI[pitch] || 0);
}

function playTune(tune) {
    if (!activeMelodyId) { stopMelody(); return; }
    var notes = tune.notes.slice(); // clone
    // Convert to MIDI numbers
    var baseOct = tune.baseOctave || 4;
    for (var i = 0; i < notes.length; i++) {
        notes[i].midi = pitchToMidi(notes[i].pitch, notes[i].oct, baseOct);
    }
    // Find octave shift to fit into visible range
    var minM = notes[0].midi, maxM = notes[0].midi;
    for (var j = 0; j < notes.length; j++) {
        if (notes[j].midi < minM) minM = notes[j].midi;
        if (notes[j].midi > maxM) maxM = notes[j].midi;
    }
    var rp = document.querySelector('.ctrl-btn[data-range].active').dataset.range;
    var p = rp.split(','); var sk = parseInt(p[0]), ek = parseInt(p[1]);
    var rangeMidMidi = Math.round((sk + ek) / 2) + 20;
    var tuneMidMidi = (minM + maxM) / 2;
    var shift = Math.round((rangeMidMidi - tuneMidMidi) / 12) * 12; // whole octaves only
    // Apply shift and convert to frequencies
    for (var k = 0; k < notes.length; k++) {
        var midi = notes[k].midi + shift;
        notes[k].freq = parseFloat((440 * Math.pow(2, (midi - 69) / 12)).toFixed(2));
    }
    // Schedule notes by time
    var totalTime = notes[notes.length - 1].time;
    var loopGap = tune.loopGap != null ? tune.loopGap : 1.5; // seconds of silence before loop
    var startTime = performance.now() / 1000;
    var step = 0;
    var lastTime = -1;
    function scheduleNext() {
        if (!activeMelodyId) { stopMelody(); return; }
        var elapsed = performance.now() / 1000 - startTime;
        while (step < notes.length && notes[step].time <= elapsed) {
            var n = notes[step];
            if (n.time !== lastTime) { playedFreqs.clear(); lastTime = n.time; }
            playedFreqs.add(n.freq);
            playFrequency(n.freq);
            step++;
        }
        if (step >= notes.length && elapsed >= totalTime + loopGap) {
            startTime = performance.now() / 1000;
            step = 0;
            lastTime = -1;
        }
        if (chartInstance) chartInstance.update('none');
        melodyTimer = setTimeout(scheduleNext, 30);
    }
    scheduleNext();
}

export function startMelody(id) {
    stopMelody();
    activeMelodyId = id;
    var btn = document.querySelector('.melody-btn[data-mid="' + id + '"]');
    if (btn) btn.classList.add('active');

    if (id.indexOf('pattern-') === 0) {
        playTune(generatePatternTune(constants.PATTERNS[parseInt(id.split('-')[1])]));
    } else if (id.indexOf('tune-') === 0) {
        playTune(TUNES[parseInt(id.split('-')[1])]);
    }
}

export function toggleMelody(id) {
    if (activeMelodyId === id) { stopMelody(); return; }
    // If this is a tune that forces a key, change root and update chart first
    if (id.indexOf('tune-') === 0) {
        var tune = TUNES[parseInt(id.split('-')[1])];
        if (tune.key && currentRootNote !== tune.key) {
            stopMelody();
            setRootNote(tune.key);
            updateChart(); // rebuilds chart (stops melody internally)
            startMelody(id); // start after chart is ready
            return;
        }
    }
    startMelody(id);
}

export function rebuildMelodyButtons() {
    var patternRow = document.getElementById('patternButtons');
    var tuneRow = document.getElementById('tuneButtons');
    if (!patternRow || !tuneRow) return;
    // Patterns always visible (dynamic, adapt to current scale) — two rows
    var pHtml1 = '', pHtml2 = '';
    for (var i = 0; i < constants.PATTERNS.length; i++) {
        if (i < 2) {
            pHtml1 += '<button class="ctrl-btn-sm melody-btn" data-mid="pattern-' + i + '">' + constants.PATTERNS[i].name + '</button>';
        } else {
            pHtml2 += '<button class="ctrl-btn-sm melody-btn" data-mid="pattern-' + i + '">' + constants.PATTERNS[i].name + '</button>';
        }
    }
    patternRow.innerHTML = '<div class="button-row">' + pHtml1 + '</div><div class="button-row">' + pHtml2 + '</div>';
    // Static tunes filtered by current scale — two rows
    var matchingTunes = [];
    var currentScale = document.querySelector('.ctrl-btn[data-scale].active').dataset.scale;
    for (var j = 0; j < TUNES.length; j++) {
        if (TUNES[j].scales.indexOf(currentScale) >= 0) {
            matchingTunes.push({ idx: j, name: TUNES[j].name });
        }
    }
    var tHtml1 = '', tHtml2 = '';
    var half = Math.ceil(matchingTunes.length / 2);
    for (var t = 0; t < matchingTunes.length; t++) {
        var btn = '<button class="ctrl-btn-sm melody-btn" data-mid="tune-' + matchingTunes[t].idx + '">' + matchingTunes[t].name + '</button>';
        if (t < half) { tHtml1 += btn; } else { tHtml2 += btn; }
    }
    tuneRow.innerHTML = '<div class="button-row">' + tHtml1 + '</div><div class="button-row">' + tHtml2 + '</div>';
    // Wire click handlers on all melody buttons
    document.querySelectorAll('#patternButtons .melody-btn, #tuneButtons .melody-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            toggleMelody(btn.dataset.mid);
        });
    });
}
