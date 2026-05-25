# GearPatch Gear Icon Guide

## Format

- Deliver as SVG.
- Use a square `viewBox="0 0 24 24"`.
- Keep icons single-color by default, using `currentColor`.
- Prefer strokes over filled pictograms for the current UI.
- Recommended stroke: `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
- Avoid embedded bitmap images, external fonts, CSS, masks, filters, gradients, and remote references.

## Drawing Area

- Artboard: 24 x 24.
- Main artwork should fit inside x/y `3` to `21`.
- Leave at least 2 px optical padding.
- Check legibility at 16 px, 24 px, and 34 px.

## File Handoff

Designers should edit the SVG files in `icons/`.

- One SVG per icon.
- File names must match the icon ID, for example `mic.svg`, `mixer.svg`, or `cdj.svg`.
- Replacing an existing icon usually means replacing only that SVG file.
- `gear-icons.js` only contains the icon list and file paths.
- Downloaded SVGs from Tabler Icons or Lucide Icons can usually be used directly: rename the file to the matching icon ID and overwrite the file in `icons/`.
- GearPatch adds a cache-busting query to icon URLs, so reloading the page should show the new artwork after replacement.

## Required Gear Icon IDs

- `mic` - Microphone
- `synthesizer` - Synthesizer
- `keyboard` - Keyboard
- `drumMachine` - Drum Machine / Sampler / Sequencer
- `guitar` - Guitar
- `bass` - Bass
- `turntable` - Turntable
- `cdj` - CDJ
- `laptop` - Laptop PC
- `midiController` - MIDI Controller
- `interface` - Audio Interface
- `mixer` - Mixer
- `effector` - Effector
- `pedalboard` - Effects Pedal / Pedalboard
- `guitarAmp` - Guitar Amplifier
- `bassAmp` - Bass Amplifier
- `powerAmp` - Amplifier
- `speakerCab` - Speaker
- `comboAmp` - Combo Amplifier
- `box` - Generic box / DI fallback
- `rack` - Stagebox / rack fallback
- `keys` - Keys fallback
- `speaker` - Monitor fallback
- `amp` - Amp fallback

## Visual Direction

Keep the icons minimal, technical, and readable. The app uses a monochrome interface, so each icon should work in black, dark gray, and white without relying on color.

The app renders these files as CSS masks, so the visible icon color comes from the UI. Multi-color SVGs, gradients, and filters will not behave as intended.
