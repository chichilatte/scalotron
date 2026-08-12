# 🎹 S C A L O T R O N  5000

A simple toy for exploring musical scales on a piano. All in vanilla HTML/CSS/JS.

See it running at <a href="https://chichilatte.github.io/scalotron" target="demo">https://chichilatte.github.io/scalotron</a>



## Features

- **7 scale types**: Chromatic, Major, Natural Minor, Harmonic Minor, Byzantine, Major Pentatonic, Minor Pentatonic
- **Piano chart**: Columns mimic a physical keyboard
- **Scale highlighting**: Keys in the current scale are normal piano keys; off-scale keys are red
- **Root key indicator**: A little coloured strip marks every occurrence of the root note
- **Keyboard playable**: QWERTY rows map to the visible range — just type to play
- **6 instruments**: Piano, Organ, Strings, Pluck, Bell, Brass (Web Audio API synthesis)
- **Dynamic patterns**: Scale ascending/descending, Arpeggio, Broken 3rds — adapt to any scale
- **Static tunes**: 8 scale-matched tunes loaded from JSON, including Ode to Joy, Greensleeves (kind of), Misirlou (erm), Paint It Black (totally crap), and Flight of the Bumblebee
- **Frequency axis**: Toggle between linear and logarithmic

## Project Structure

```
scalotron/
├── index.html          # HTML shell
├── styles.css          # All styles
├── libs/
│   └── chart.umd.js    # Chart.js 4.4.0 (local)
├── js/
│   ├── config.js       # Note names, visual settings, scale definitions
│   ├── audio.js        # Web Audio engine, 6 instrument synths, keyboard input
│   ├── tunes.js        # Patterns, tunes, melody player, button builder
│   ├── chart.js        # Chart creation, piano plugin, click handling
│   └── app.js          # Root key stepper, button bindings, initialisation
├── tunes/
│   ├── ode-to-joy.json
│   ├── greensleeves.json
│   ├── happy-birthday.json
│   ├── amazing-grace.json
│   ├── misirlou.json
│   ├── blues-lick.json
│   ├── paint-it-black.json
│   └── bumblebee.json
└── README.md
```

## Tune JSON Format

```json
{
    "name": "Ode to Joy",
    "scales": ["major"],
    "key": "C",
    "baseOctave": 4,
    "loopGap": 1.0,
    "notes": [
        {"pitch": "E", "oct": 0, "time": 0.0},
        {"pitch": "E", "oct": 0, "time": 0.5}
    ]
}
```

- `scales`: Which scale types the tune appears under
- `key`: Auto-switches the root key when selected
- `baseOctave`: Octave offset for all notes
- `loopGap`: Seconds of silence before the loop restarts
- `notes`: Array of `{pitch, oct, time}` — time in seconds

## Config

All visual settings live in `js/config.js` under the `config` object — colours, opacities, sizes, and counts. Nothing is hardcoded in the drawing code.

## Browser Support

Firefox, Chrome, Safari — any modern browser with Web Audio API support.

## Still to do
* Accessibility
* Localisation
* Mobile support

## Thanks
* Piano icon: <a href="https://thenounproject.com/icon/piano-8221530/">Eskak</a>
* Charts: https://www.chartjs.org
* Tippy: https://atomiks.github.io/tippyjs
* DeepSeek: Wld never have been made without it!

## License
© <a href="https://github.com/chichilatte">Chichi Latté</a> 2026
