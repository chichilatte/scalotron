/** 
 * @license  © Chichi Latté 2026
 * @file Entry point — UI controls, tooltips, credits, and initialisation.
 */

import { constants, displayName } from './config.js';
import { updateChart } from './chart.js';
import { loadTunes, rebuildMelodyButtons } from './melodies.js';

// ── Tooltips on help buttons ───────────────────────────────────
document.querySelectorAll('.help-btn').forEach(function(btn) {
    window.tippy(btn, {
        content: btn.getAttribute('title'),
        trigger: 'click',
        interactive: true,
        placement: 'top',
        allowHTML: true,
        arrow: true,
        animation: false,
        theme: 'help',
    });
    btn.removeAttribute('title');
});

// ── Credits popover ─────────────────────────────────────────────
var creditsLink = document.getElementById('creditsLink');
if (creditsLink) {
    creditsLink.addEventListener('click', function(e) { e.preventDefault(); });
    window.tippy(creditsLink, {
        content: document.getElementById('creditsContent').innerHTML,
        trigger: 'click',
        interactive: true,
        placement: 'top-end',
        allowHTML: true,
        arrow: true,
        animation: false,
        theme: 'credits',
        appendTo: document.body,
    });
}

// ── Root note stepper ──────────────────────────────────────────
export var currentRootNote = 'A';
export function setRootNote(note) {
    currentRootNote = note;
    var label = document.getElementById('rootLabel');
    if (label) label.textContent = displayName(note);
}
function cycleRoot(dir) {
    var idx = constants.NOTE_NAMES.indexOf(currentRootNote);
    idx = ((idx + dir) % 12 + 12) % 12;
    setRootNote(constants.NOTE_NAMES[idx]);
    updateChart();
}
function displayLabel(label) { return constants.DISPLAY_MAP[label] || label; }

document.getElementById('rootLeft').addEventListener('click', function() { cycleRoot(-1); });
document.getElementById('rootRight').addEventListener('click', function() { cycleRoot(1); });

// ── Button bindings ────────────────────────────────────────────
function bindButtonRow(selector) {
    document.querySelectorAll(selector).forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll(selector + '.active').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            updateChart();
        });
    });
}
bindButtonRow('.ctrl-btn[data-scale]');
bindButtonRow('.ctrl-btn[data-range]');
bindButtonRow('.ctrl-btn[data-yaxis]');

// Instrument buttons span two button-rows — clear across all
document.querySelectorAll('.ctrl-btn-sm[data-inst]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelector('.ctrl-btn-sm[data-inst].active').classList.remove('active');
        btn.classList.add('active');
    });
});

document.addEventListener('change', function(e) {
    if (e.target.tagName === 'SELECT') e.target.blur();
});

// ── Init ───────────────────────────────────────────────────────
loadTunes(function() {
    rebuildMelodyButtons();
    updateChart();
});
