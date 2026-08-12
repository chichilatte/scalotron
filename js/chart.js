/** 
 * @license  © Chichi Latté 2026
 * @file Piano-roll chart — 88-key builder, scale filtering, canvas rendering with Chart.js.
 */

import { constants, displayName, config, isWhitePitch } from './config.js';
import { playedFreqs, playFrequency, getKeyFreqsFromRange, setCurrentKeyFreqs } from './audio.js';
import { activeMelodyId, stopMelody, startMelody, rebuildMelodyButtons } from './tunes.js';
import { currentRootNote } from './app.js';

export let chartInstance = null;
let canvasClickHandler = null;

function buildAll88Keys() {
    const keys = [];
    for (let n = 1; n <= 88; n++) {
        const exponent = (n - 49) / 12;
        const frequency = 440 * Math.pow(2, exponent);
        const semitoneOffsetFromC0 = n + 8;
        const noteIndex = semitoneOffsetFromC0 % 12;
        const octave = Math.floor(semitoneOffsetFromC0 / 12);
        const noteName = constants.NOTE_NAMES[noteIndex];
        keys.push({
            keyNumber: n,
            noteName: noteName + String(octave),
            pitchClass: noteName,
            frequency: parseFloat(frequency.toFixed(2))
        });
    }
    return keys;
}

export const ALL_88_KEYS = buildAll88Keys();

function getKeysInRange(startKey, endKey) {
    return ALL_88_KEYS.filter(k => k.keyNumber >= startKey && k.keyNumber <= endKey);
}

function checkIntervalInScale(scaleType, distance) {
    let activeScalePattern = constants.CHROMATIC_STEPS;
    
    if (scaleType === "major") {
        activeScalePattern = constants.MAJOR_STEPS;
    } else if (scaleType === "minor") {
        activeScalePattern = constants.MINOR_STEPS;
    } else if (scaleType === "harmonicMinor") {
        activeScalePattern = constants.HARMONIC_MINOR_STEPS;
    } else if (scaleType === "byzantine") {
        activeScalePattern = constants.BYZANTINE_STEPS;
    } else if (scaleType === "majorPentatonic") {
        activeScalePattern = constants.MAJOR_PENTATONIC_STEPS;
    } else if (scaleType === "minorPentatonic") {
        activeScalePattern = constants.MINOR_PENTATONIC_STEPS;
    }

    const token = String(distance);
    const splitPattern = activeScalePattern.split(" ");
    return splitPattern.includes(token);
}

function isKeyInScale(pitchClass, rootNote, scaleType) {
    const rootIndex = constants.NOTE_NAMES.indexOf(rootNote);
    const pitchIndex = constants.NOTE_NAMES.indexOf(pitchClass);
    
    let distance = pitchIndex - rootIndex;
    if (distance < 0) {
        distance = distance + 12;
    }
    
    return checkIntervalInScale(scaleType, distance);
}

export function updateChart() {
    const rootNote = currentRootNote;
    const scaleType = document.querySelector('.ctrl-btn[data-scale].active').dataset.scale;
    const yScaleType = document.querySelector('.ctrl-btn[data-yaxis].active').dataset.yaxis;
    const rangePreset = document.querySelector('.ctrl-btn[data-range].active').dataset.range;

    let startKey, endKey;
    [startKey, endKey] = rangePreset.split(',').map(Number);

    const pianoKeys = getKeysInRange(startKey, endKey);

    // Piano-roll background plugin — draws vertical bars behind each note
    const pianoRollPlugin = {
        id: 'pianoRoll',
        beforeDraw(chart) {
            const ctx = chart.ctx;
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;
            const top = yAxis.top;
            const bottom = yAxis.bottom;
            const nKeys = pianoKeys.length;
            if (nKeys === 0) return;
            const colWidth = xAxis.width / nKeys;

            // Draw full-width bars: white keys light, black keys dark
            // Keys in the current scale use more opaque colors
            for (let i = 0; i < nKeys; i++) {
                const x = xAxis.getPixelForValue(i);
                const halfW = colWidth / 2;
                const key = pianoKeys[i];
                const isWhite = isWhitePitch(key.pitchClass);
                const inScale = isKeyInScale(key.pitchClass, rootNote, scaleType);

                ctx.fillStyle = inScale
                    ? (isWhite ? config.pianoRoll.whiteKey : config.pianoRoll.blackKey)
                    : (isWhite ? config.pianoRoll.whiteKeyOffScale : config.pianoRoll.blackKeyOffScale);
                var colH = isWhite ? (bottom - top) : (bottom - top) * config.pianoRoll.blackHeight;
                ctx.fillRect(x - halfW, top, colWidth, colH);
            }

            // Thin vertical lines between all adjacent keys
            ctx.strokeStyle = config.pianoRoll.line;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let i = 0; i < nKeys; i++) {
                const x = xAxis.getPixelForValue(i);
                const edgeX = x + colWidth / 2;
                ctx.moveTo(edgeX, top);
                ctx.lineTo(edgeX, bottom);
            }
            ctx.stroke();

            // Highlight all currently played notes
            if (playedFreqs.size > 0) {
                for (let i = 0; i < nKeys; i++) {
                    if (playedFreqs.has(pianoKeys[i].frequency)) {
                        const hx = xAxis.getPixelForValue(i);
                        ctx.fillStyle = config.chart.columns.played;
                        ctx.fillRect(hx - colWidth/2, top, colWidth, bottom - top);
                    }
                }
            }

            // Root key indicator — teal strip at bottom of root columns
            for (let i = 0; i < nKeys; i++) {
                if (pianoKeys[i].pitchClass === rootNote) {
                    const rx = xAxis.getPixelForValue(i);
                    ctx.fillStyle = config.chart.columns.rootKey.color;
                    ctx.fillRect(rx - colWidth/2, bottom - config.chart.columns.rootKey.height, colWidth, config.chart.columns.rootKey.height);
                }
            }
        }
    };

    const xLabels = [];
    const yFrequencies = [];
    const pointColors = [];
    const pointRadii = [];

    for (let i = 0; i < pianoKeys.length; i++) {
        const currentKey = pianoKeys[i];
        var lbl = displayName(currentKey.pitchClass);
        if (currentKey.pitchClass === 'C') lbl += currentKey.noteName.slice(1); // append octave
        xLabels.push(lbl);
        yFrequencies.push(currentKey.frequency);
        
        const match = isKeyInScale(currentKey.pitchClass, rootNote, scaleType);
        if (match) {
            pointColors.push(config.accent.color);
            pointRadii.push(config.chart.dotRadius);
        } else {
            pointColors.push("transparent");
            pointRadii.push(0);
        }
    }

    const ctx = document.getElementById("frequencyChart").getContext("2d");

    // Save melody state before destroying chart
    // Patterns survive scale/range changes (regenerated with new scale)
    // Tunes stop on any chart rebuild
    var restartPatternId = null;
    if (activeMelodyId && activeMelodyId.indexOf('pattern-') === 0) {
        restartPatternId = activeMelodyId;
    }
    if (activeMelodyId) { stopMelody(); }

    if (chartInstance) {
        chartInstance.destroy();
    }

    // Map keyboard to visible range: Q = first note
    setCurrentKeyFreqs(startKey, endKey);
    playedFreqs.clear();

    const chartConfiguration = {
        type: "line",
        plugins: [pianoRollPlugin],
        data: {
            labels: xLabels,
            datasets: [{
                label: "Key Frequency (Hz)",
                data: yFrequencies,
                borderColor: config.chart.lineColor,
                borderWidth: config.chart.lineWidth,
                pointBackgroundColor: pointColors,
                pointBorderColor: pointColors,
                pointRadius: pointRadii,
                pointHoverRadius: config.chart.hoverRadius,
                tension: config.chart.tension
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    grid: { color: config.grid.x },
                    ticks: {
                        color: function(ctx) {
                            const label = ctx.tick.label;
                            return isWhitePitch(label) ? config.ticks.white : config.ticks.black;
                        },
                        maxTicksLimit: config.ticks.maxLimit,
                        font: { size: config.ticks.fontSize }
                    }
                },
                y: {
                    type: yScaleType,
                    grid: { color: config.grid.y },
                    ticks: {
                        color: config.ticks.yColor,
                        padding: config.ticks.padding,
                        callback: function(value) { return value + "Hz"; }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(items) {
                            var idx = items && items.length ? items[0].dataIndex : (items && items.dataIndex != null ? items.dataIndex : -1);
                            var key = pianoKeys[idx];
                            if (!key) return '';
                            return "Piano Key #" + key.keyNumber + " - " + key.noteName.replace('#','♯');
                        },
                        label: function(item) {
                            return " Frequency - " + item.raw + "Hz";
                        }
                    }
                }
            }
        }
    };

    chartInstance = new Chart(ctx, chartConfiguration);

    // Rebuild melody buttons for new scale
    rebuildMelodyButtons();

    // Restart pattern if one was playing (regenerates with new scale)
    if (restartPatternId) {
        startMelody(restartPatternId);
    }

    // Remove old listener, then attach fresh one for clicking vertical bars
    if (canvasClickHandler) ctx.canvas.removeEventListener('mousedown', canvasClickHandler);
    canvasClickHandler = function(e) {
        var chart = chartInstance;
        if (!chart || !pianoKeys.length) return;
        var xAxis = chart.scales.x;
        var yAxis = chart.scales.y;
        var rect = chart.canvas.getBoundingClientRect();
        var cx = e.clientX - rect.left;
        var cy = e.clientY - rect.top;
        var colWidth = xAxis.width / pianoKeys.length;
        var halfCol = colWidth / 2;
        if (cx < xAxis.left - halfCol || cx > xAxis.right + halfCol) return;
        if (cy < yAxis.top || cy > yAxis.bottom) return;
        var idx = Math.round(xAxis.getValueForPixel(cx));
        idx = Math.max(0, Math.min(pianoKeys.length - 1, idx));
        var key = pianoKeys[idx];
        if (!key) return;
        var freq = key.frequency;
        playedFreqs.add(freq);
        playFrequency(freq);
        chart.update('none');
        setTimeout(function() {
            playedFreqs.delete(freq);
            if (chartInstance) chartInstance.update('none');
        }, 400);
    };
    ctx.canvas.addEventListener('mousedown', canvasClickHandler);
}
