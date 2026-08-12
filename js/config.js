/** 
 * @license  © Chichi Latté 2026
 * @file Constants, scale definitions, display mappings, and all visual config. 
 */

export const constants = {
    NOTES_STRING: "C,C#,D,D#,E,F,F#,G,G#,A,A#,B",
    get NOTE_NAMES() { return this.NOTES_STRING.split(","); },
    DISPLAY_MAP: { 'C': 'C', 'C#': 'C♯', 'D': 'D', 'D#': 'D♯', 'E': 'E', 'F': 'F', 'F#': 'F♯', 'G': 'G', 'G#': 'G♯', 'A': 'A', 'A#': 'A♯', 'B': 'B' },
    CHROMATIC_STEPS: "0 1 2 3 4 5 6 7 8 9 10 11",
    MAJOR_STEPS: "0 2 4 5 7 9 11",
    MINOR_STEPS: "0 2 3 5 7 8 10",
    HARMONIC_MINOR_STEPS: "0 2 3 5 7 8 11",
    MAJOR_PENTATONIC_STEPS: "0 2 4 7 9",
    MINOR_PENTATONIC_STEPS: "0 3 5 7 10",
    BYZANTINE_STEPS: "0 1 4 5 7 8 11",
    WHITE_PITCHES: new Set(["C", "D", "E", "F", "G", "A", "B"]),
    PATTERNS: [
        { name: 'Scale',        degs: [0,1,2,3,4,5,6,7,6,5,4,3,2,1], tempo: 160 },
        { name: 'Arpeggio',     degs: [0,2,4,7,4,2],                   tempo: 200 },
        { name: 'Broken 3rds',  degs: [0,2,1,3,2,4,3,5,4,6,5,7,6,4,5,3,4,2,3,1,2,0], tempo: 140 },
    ],
    TUNE_FILES: [
        'ode-to-joy.json', 
        'greensleeves.json', 
        'happy-birthday.json', 
        'amazing-grace.json', 
        'misirlou.json', 
        'blues-lick.json', 
        'paint-it-black.json', 
        'bumblebee.json'
    ],
};

export function displayName(pitchClass) { return constants.DISPLAY_MAP[pitchClass] || pitchClass; }

// ── Settings: all visual magic numbers live here ──────────────────
export const config = {
    accent: { color: '#00adb5' },
    pianoRoll: {
        whiteKey: '#ffffff',
        blackKey: '#000000',
        whiteKeyOffScale: '#ff3333',
        blackKeyOffScale: '#ff3333',
        line:    'rgba(255, 255, 255, 0.08)',
        blackHeight: 1,
    },
    chart: {
        lineColor:  'rgba(0, 173, 181, 0.3)',
        lineWidth:  1.5,
        dotRadius:  5,
        hoverRadius: 7,
        tension:    0.1,
        columns: {
            played:  'rgba(0, 173, 181, 0.40)',
            rootKey: {
                color:  'rgba(0, 173, 181, 0.55)',
                height: 10,
            },
        },
    },
    grid: {
        x: 'rgba(255, 255, 255, 0.05)',
        y: 'rgba(255, 255, 255, 0.08)',
    },
    ticks: {
        white:     '#ddd',
        black:     '#777',
        yColor:    '#ccc',
        maxLimit:  50,
        fontSize:  10,
        padding:   16,
    },
};

export function isWhitePitch(pitchClass) { return constants.WHITE_PITCHES.has(pitchClass); }
