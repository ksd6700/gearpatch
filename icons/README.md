# GearPatch Icon Files

Designers can replace gear icons by editing the SVG files in this folder.

In most cases, you can download an SVG from an icon set such as Tabler Icons or Lucide Icons, rename it to the matching file name, and replace the file in this folder.
For example, to replace the CDJ icon, download the SVG, rename it to `cdj.svg`, and overwrite `icons/cdj.svg`.

## How It Works

- Each file name is the icon ID used by the app.
- Keep the file name stable, for example `cdj.svg`, `mixer.svg`, or `mic.svg`.
- The app reads the file path from `gear-icons.js`.
- You usually do not need to edit JavaScript when only replacing an existing icon.
- Icon URLs include an automatic cache-busting query, so a normal page reload should show the new file after replacement.

## SVG Requirements

- Use `viewBox="0 0 24 24"`.
- Keep the artwork inside a 24 x 24 square.
- Prefer single-color vector artwork.
- Use `currentColor` for `stroke` or `fill` when possible.
- Avoid external images, external fonts, embedded CSS, filters, masks, gradients, and remote references.
- Check legibility at 16 px, 24 px, and 34 px.
- The app renders these SVGs as CSS masks. The UI controls the final color, so multi-color artwork, gradients, and filters will not show as designed.

## Quick Replacement Steps

1. Download the SVG from the icon provider.
2. Rename the file to the target icon ID, for example `cdj.svg`.
3. Replace the existing file in this folder.
4. Reload GearPatch in the browser.

If the icon appears as a solid block or disappears, open the SVG and check that it has a valid `viewBox`, visible vector paths, and no external image/font references.

## Required Files

- `mic.svg`
- `synthesizer.svg`
- `keyboard.svg`
- `drumMachine.svg`
- `guitar.svg`
- `bass.svg`
- `turntable.svg`
- `cdj.svg`
- `laptop.svg`
- `midiController.svg`
- `interface.svg`
- `mixer.svg`
- `effector.svg`
- `pedalboard.svg`
- `guitarAmp.svg`
- `bassAmp.svg`
- `powerAmp.svg`
- `speakerCab.svg`
- `comboAmp.svg`
- `box.svg`
- `rack.svg`
- `keys.svg`
- `speaker.svg`
- `amp.svg`

## Adding a New Icon

1. Add a new SVG file to this folder.
2. Add the same ID to `gear-icons.js` in `iconOptions`.
3. Use that ID from the gear template in `app.js`.
