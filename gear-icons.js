(() => {
  // Replace existing artwork in icons/*.svg. Edit this file only when adding,
  // removing, or renaming an icon ID.
  const iconOptions = [
    { id: "mic", label: "Microphone" },
    { id: "synthesizer", label: "Synthesizer" },
    { id: "keyboard", label: "Keyboard" },
    { id: "drumMachine", label: "Drum Machine" },
    { id: "guitar", label: "Guitar" },
    { id: "bass", label: "Bass" },
    { id: "turntable", label: "Turntable" },
    { id: "cdj", label: "CDJ" },
    { id: "laptop", label: "Laptop PC" },
    { id: "midiController", label: "MIDI Controller" },
    { id: "interface", label: "Audio Interface" },
    { id: "mixer", label: "Mixer" },
    { id: "effector", label: "Effector" },
    { id: "pedalboard", label: "Pedalboard" },
    { id: "guitarAmp", label: "Guitar Amplifier" },
    { id: "bassAmp", label: "Bass Amplifier" },
    { id: "powerAmp", label: "Amplifier" },
    { id: "speakerCab", label: "Speaker" },
    { id: "comboAmp", label: "Combo Amplifier" },
    { id: "box", label: "DI / Box" },
    { id: "rack", label: "Stagebox" },
    { id: "keys", label: "Keys" },
    { id: "speaker", label: "Monitor" },
    { id: "amp", label: "Amp" },
  ];

  const iconAssetVersion = Date.now().toString(36);
  const iconPaths = Object.fromEntries(iconOptions.map((icon) => [icon.id, `./icons/${icon.id}.svg?v=${iconAssetVersion}`]));

  window.GEARPATCH_GEAR_ICON_PATHS = iconPaths;
  window.GEARPATCH_ICON_OPTIONS = iconOptions;
})();
