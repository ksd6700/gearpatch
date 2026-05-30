const STORAGE_KEY = "gearpatch.document.v1";
const HISTORY_KEY = "gearpatch.versions.v1";
const LEGACY_STORAGE_KEY = "gearflow.document.v5";
const LEGACY_HISTORY_KEY = "gearflow.versions.v5";
const APP_NAME = "GearPatch";
const FILE_PREFIX = "gearpatch";
const TEMPLATE_MIME = "application/x-gearpatch-template";
const VERSION = "0.1.0";
const WORLD_W = 5000;
const WORLD_H = 3500;
const GRID_SIZE = 24;
const MINIMAP_SCALE = 0.028;
const HANDLE_SIDES = ["left", "right", "top", "bottom"];
const TERMINAL_MIN_SPACING = {
  horizontal: 46,
  vertical: 54,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const state = {
  name: "Live PA",
  notes: "",
  nodes: [],
  edges: [],
  powerOutlets: [],
  powerEdges: [],
  activeLayer: "signal",
  selected: new Set(),
  selectedEdge: null,
  selectedPowerEdge: null,
  selectedPowerOutlet: null,
  connecting: null,
  portDrag: null,
  powerDrag: null,
  portPopover: null,
  viewport: { x: -420, y: -420, scale: 0.86 },
  history: [],
  future: [],
  autosaveTimer: null,
  drag: null,
  powerOutletDrag: null,
  pan: null,
  resize: null,
  clipboard: null,
  pendingNewConfirmed: false,
};

const LIBRARY_GROUPS = [
  { id: "instruments", label: "Instruments & Players", jaLabel: "楽器＆プレイヤー" },
  { id: "controllers", label: "Controllers & System", jaLabel: "コントローラー＆システム" },
  { id: "interfaces", label: "Audio Interfaces & Mixers", jaLabel: "オーディオインターフェース＆ミキサー" },
  { id: "effects", label: "Effects", jaLabel: "エフェクター" },
  { id: "amps", label: "Amps & Speakers", jaLabel: "アンプ＆スピーカー" },
];

function libraryGroup(groupId) {
  return LIBRARY_GROUPS.find((group) => group.id === groupId);
}

function libraryGroupLabel(groupId) {
  return libraryGroup(groupId)?.label || "Gear";
}

function templateEntry({
  type,
  label,
  jaLabel,
  group,
  icon,
  defaultName = label,
  defaultLabel = label,
  tags = [],
  w = 180,
  h = 112,
  ports = [],
  hidden = false,
}) {
  return {
    type,
    label,
    jaLabel,
    defaultName,
    defaultLabel,
    title: defaultName,
    subtitle: defaultLabel,
    category: libraryGroupLabel(group),
    group,
    icon,
    w,
    h,
    tags,
    ports,
    hidden,
  };
}

const templates = [
  templateEntry({ type: "microphone", label: "Microphone", jaLabel: "マイク", group: "instruments", icon: "mic", defaultName: "Vocal Mic", defaultLabel: "Microphone", tags: ["XLR", "Vocal"], w: 168, h: 104 }),
  templateEntry({ type: "synthesizer", label: "Synthesizer", jaLabel: "シンセサイザー", group: "instruments", icon: "synthesizer", defaultName: "Synthesizer", defaultLabel: "Synth", tags: ["L/R", "MIDI"], w: 188, h: 116 }),
  templateEntry({ type: "keyboard", label: "Keyboard", jaLabel: "キーボード", group: "instruments", icon: "keyboard", defaultName: "Keyboard", defaultLabel: "Keys", tags: ["Keys", "L/R"], w: 188, h: 116 }),
  templateEntry({ type: "drum-machine", label: "Drum Machine / Sampler / Sequencer", jaLabel: "ドラムマシーン / サンプラー / シーケンサー", group: "instruments", icon: "drumMachine", defaultName: "Drum Machine", defaultLabel: "Beats", tags: ["Pads", "MIDI"], w: 222, h: 124 }),
  templateEntry({ type: "guitar", label: "Guitar", jaLabel: "ギター", group: "instruments", icon: "guitar", defaultName: "Guitar", defaultLabel: "Guitar", tags: ["Instrument", "TS"], w: 168, h: 108 }),
  templateEntry({ type: "bass", label: "Bass", jaLabel: "ベース", group: "instruments", icon: "bass", defaultName: "Bass", defaultLabel: "Bass", tags: ["Instrument", "TS"], w: 168, h: 108 }),
  templateEntry({ type: "turntable", label: "Turntable", jaLabel: "ターンテーブル", group: "instruments", icon: "turntable", defaultName: "Turntable", defaultLabel: "Turntable", tags: ["RCA", "DJ"], w: 186, h: 118 }),
  templateEntry({ type: "cdj", label: "CDJ", jaLabel: "CDJ", group: "instruments", icon: "cdj", defaultName: "CDJ", defaultLabel: "CDJ", tags: ["RCA", "Digital"], w: 178, h: 116 }),
  templateEntry({ type: "laptop", label: "Laptop PC", jaLabel: "パソコン", group: "controllers", icon: "laptop", defaultName: "Laptop PC", defaultLabel: "Laptop PC", tags: ["USB", "Playback"], w: 188, h: 112 }),
  templateEntry({ type: "midi-controller", label: "MIDI Controller", jaLabel: "MIDIコントローラー", group: "controllers", icon: "midiController", defaultName: "MIDI Controller", defaultLabel: "Controller", tags: ["MIDI", "USB"], w: 204, h: 116 }),
  templateEntry({ type: "audio-interface", label: "Audio Interface", jaLabel: "オーディオインターフェース", group: "interfaces", icon: "interface", defaultName: "Audio Interface", defaultLabel: "Audio I/O", tags: ["USB-C", "TRS"], w: 198, h: 126 }),
  templateEntry({ type: "mixer", label: "Mixer", jaLabel: "ミキサー", group: "interfaces", icon: "mixer", defaultName: "Sub Mixer", defaultLabel: "Mixer", tags: ["FOH", "Inputs"], w: 214, h: 154 }),
  templateEntry({ type: "pa-mixer", label: "PA Mixer", jaLabel: "PAミキサー", group: "interfaces", icon: "mixer", defaultName: "PA Mixer", defaultLabel: "FOH / Venue", tags: ["PA", "FOH"], w: 224, h: 160 }),
  templateEntry({ type: "effector", label: "Effector", jaLabel: "エフェクター", group: "effects", icon: "effector", defaultName: "Effector", defaultLabel: "FX", tags: ["FX", "TS"], w: 160, h: 108 }),
  templateEntry({ type: "pedalboard", label: "Effects Pedal / Pedalboard", jaLabel: "エフェクター / ペダルボード", group: "effects", icon: "pedalboard", defaultName: "Pedalboard", defaultLabel: "FX Pedal", tags: ["Pedals", "FX"], w: 214, h: 120 }),
  templateEntry({ type: "guitar-amplifier", label: "Guitar Amplifier", jaLabel: "ギターアンプ", group: "amps", icon: "guitarAmp", defaultName: "Guitar Amp", defaultLabel: "Amp", tags: ["Amp", "Mic"], w: 178, h: 122 }),
  templateEntry({ type: "bass-amplifier", label: "Bass Amplifier", jaLabel: "ベースアンプ", group: "amps", icon: "bassAmp", defaultName: "Bass Amp", defaultLabel: "Amp", tags: ["Bass", "DI"], w: 186, h: 126 }),
  templateEntry({ type: "amplifier", label: "Amplifier", jaLabel: "アンプ", group: "amps", icon: "powerAmp", defaultName: "Amplifier", defaultLabel: "Power Amp", tags: ["Amp", "Speaker"], w: 180, h: 112 }),
  templateEntry({ type: "speaker", label: "Speaker", jaLabel: "スピーカー", group: "amps", icon: "speakerCab", defaultName: "Main Speaker", defaultLabel: "Speaker", tags: ["Output", "Monitor"], w: 168, h: 118 }),
  templateEntry({ type: "combo-amplifier", label: "Combo Amplifier", jaLabel: "アンプスピーカー（コンボアンプ）", group: "amps", icon: "comboAmp", defaultName: "Combo Amp", defaultLabel: "Combo Amp", tags: ["Amp", "Speaker"], w: 188, h: 126 }),
  templateEntry({ type: "di-box", label: "DI Box", jaLabel: "DI", group: "interfaces", icon: "box", tags: ["DI", "PAD"], w: 160, h: 112, hidden: true }),
  templateEntry({ type: "stagebox", label: "Stagebox", jaLabel: "ステージボックス", group: "interfaces", icon: "rack", tags: ["Stage", "Snake"], w: 198, h: 148, hidden: true }),
];

const strokeIcon = (body, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;

const fallbackIconIds = [
  "mic",
  "synthesizer",
  "keyboard",
  "drumMachine",
  "guitar",
  "bass",
  "turntable",
  "cdj",
  "laptop",
  "midiController",
  "interface",
  "mixer",
  "effector",
  "pedalboard",
  "guitarAmp",
  "bassAmp",
  "powerAmp",
  "speakerCab",
  "comboAmp",
  "box",
  "rack",
  "keys",
  "speaker",
  "amp",
];
const fallbackIconPaths = Object.fromEntries(fallbackIconIds.map((id) => [id, `./icons/${id}.svg`]));
const iconPaths = Object.keys(window.GEARPATCH_GEAR_ICON_PATHS || {}).length ? window.GEARPATCH_GEAR_ICON_PATHS : fallbackIconPaths;
const ICON_OPTIONS = (window.GEARPATCH_ICON_OPTIONS || []).length
  ? window.GEARPATCH_ICON_OPTIONS
  : fallbackIconIds.map((id) => ({ id, label: id }));
const exportIconMarkup = {};
let exportIconDataPromise = null;
const gearIcon = (id) => {
  const src = iconPaths[id] || iconPaths.box || "";
  if (!src) return "";
  return `<span class="gear-icon-glyph" style="--gear-icon-url: url('${escapeAttr(src)}')" aria-hidden="true"></span>`;
};

function exportIconSvgToMarkup(svg) {
  const normalized = String(svg || "")
    .trim()
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replaceAll("currentColor", "#111111");
  return normalized.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/i)?.[1] || "";
}

async function ensureExportIconData() {
  if (exportIconDataPromise) return exportIconDataPromise;
  exportIconDataPromise = Promise.all(
    Object.entries(iconPaths).map(async ([id, src]) => {
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`Icon request failed: ${response.status}`);
        exportIconMarkup[id] = exportIconSvgToMarkup(await response.text());
      } catch (error) {
        console.warn(`Could not load export icon: ${id}`, error);
      }
    }),
  );
  return exportIconDataPromise;
}

function exportIconSvg(id, x, y, size) {
  const markup = exportIconMarkup[id] || exportIconMarkup.box;
  if (!markup) {
    return `<path d="M${x + size / 2} ${y + 3}l${size * 0.38} ${size * 0.21}l0 ${size * 0.43}l-${size * 0.38} ${size * 0.21}l-${size * 0.38} -${size * 0.21}l0 -${size * 0.43}l${size * 0.38} -${size * 0.21}M${x + size / 2} ${y + size / 2}l${size * 0.38} -${size * 0.21}M${x + size / 2} ${y + size / 2}l0 ${size * 0.43}M${x + size / 2} ${y + size / 2}l-${size * 0.38} -${size * 0.21}" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${markup}</g>`;
}

const portSvg = {
  "xlr-m": strokeIcon(`<circle cx="12" cy="12" r="7"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="15" r="1" fill="currentColor" stroke="none"/><path d="M12 5v2"/>`),
  "xlr-f": strokeIcon(`<circle cx="12" cy="12" r="7"/><circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/><circle cx="12" cy="15" r="1.5"/><path d="M12 5v2"/>`),
  ts: strokeIcon(`<path d="M4 12h11"/><path d="m15 8 5 4-5 4"/><path d="M8 8.5v7"/>`),
  trs: strokeIcon(`<path d="M4 12h11"/><path d="m15 8 5 4-5 4"/><path d="M8 8.5v7"/><path d="M11 8.5v7"/>`),
  trrs: strokeIcon(`<path d="M4 12h11"/><path d="m15 8 5 4-5 4"/><path d="M7 8.5v7"/><path d="M10 8.5v7"/><path d="M13 8.5v7"/>`),
  rca: strokeIcon(`<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M18 12h3"/>`),
  usb: strokeIcon(`<rect x="5" y="8" width="14" height="8" rx="1"/><path d="M8 12h8"/><path d="M9 8v-2h6v2"/>`),
  "usb-c": strokeIcon(`<rect x="5" y="9" width="14" height="6" rx="3"/><path d="M9 12h6"/>`),
  hdmi: strokeIcon(`<path d="M5 8h14l-1 8H6Z"/><path d="M8 11h8"/><path d="M9 16v2h6v-2"/>`),
  speakon: strokeIcon(`<circle cx="12" cy="12" r="7"/><path d="M9 9h6v6H9Z"/><path d="M12 5v4"/><path d="M12 15v4"/>`),
  midi: strokeIcon(`<path d="M5 13a7 7 0 0 1 14 0v4H5Z"/><path d="M8 13h.01"/><path d="M12 10h.01"/><path d="M16 13h.01"/><path d="M10 17v-2"/><path d="M14 17v-2"/>`),
};

const CONNECTOR_SHAPE_GROUPS = [
  { label: "Audio", options: ["xlr", "ts", "trs", "mini-ts", "mini-trs", "mini-trrs", "rca"] },
  { label: "Digital", options: ["usb-c", "usb-a", "usb-b", "micro-usb", "lan", "hdmi"] },
  { label: "Speaker", options: ["speakon"] },
  { label: "Control", options: ["midi"] },
];
const CONNECTOR_SHAPE_OPTIONS = CONNECTOR_SHAPE_GROUPS.flatMap((group) => group.options);
const PORT_KIND_OPTIONS = ["xlr-m", "xlr-f", ...CONNECTOR_SHAPE_OPTIONS];
const CABLE_COLORS = ["#111111", "#d92d20", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0f766e", "#e11d48"];
const LINE_STYLES = {
  solid: { label: "Solid", dash: "" },
  dashed: { label: "Dashed", dash: "10 7" },
  dotted: { label: "Dotted", dash: "2 7" },
  double: { label: "Double", dash: "", double: true },
};
const SIGNAL_DIRECTIONS = {
  forward: { label: "From → To" },
  reverse: { label: "To → From" },
  both: { label: "Both" },
  none: { label: "None" },
};
const SIGNAL_TYPES = {
  audio: { label: "Audio", color: "#111111", width: 3, dash: "" },
  digital: { label: "Digital", color: "#2563eb", width: 3, dash: "10 7" },
  midi: { label: "MIDI/Clock", color: "#0f766e", width: 3, dash: "2 7" },
  speaker: { label: "Speaker", color: "#f59e0b", width: 5, dash: "" },
};

const dom = {
  libraryList: $("#libraryList"),
  librarySearch: $("#librarySearch"),
  canvasFrame: $("#canvasFrame"),
  world: $("#world"),
  nodeLayer: $("#nodeLayer"),
  edgeLayer: $("#edgeLayer"),
  powerOutletLayer: $("#powerOutletLayer"),
  terminalLayer: $("#terminalLayer"),
  canvasHint: $("#canvasHint"),
  minimap: $("#minimap"),
  zoomReadout: $("#zoomReadout"),
  saveStatus: $("#saveStatus"),
  fileInput: $("#fileInput"),
  toastStack: $("#toastStack"),
  mobilePanelButtons: $$("[data-mobile-panel]"),
  aboutDialog: $("#aboutDialog"),
  startDialog: $("#startDialog"),
  documentDialog: $("#documentDialog"),
  inputListDialog: $("#inputListDialog"),
  historyDialog: $("#historyDialog"),
  historyList: $("#historyList"),
  inspectorTitle: $("#inspectorTitle"),
  selectionCount: $("#selectionCount"),
  emptyInspector: $("#emptyInspector"),
  nodeInspector: $("#nodeInspector"),
  nodeTitleInput: $("#nodeTitleInput"),
  nodeSubtitleInput: $("#nodeSubtitleInput"),
  nodePowerField: $("#nodePowerField"),
  nodePowerInput: $("#nodePowerInput"),
  nodeIconPicker: $("#nodeIconPicker"),
  edgeInspector: $("#edgeInspector"),
  edgeSummary: $("#edgeSummary"),
  edgeSignalTypes: $("#edgeSignalTypes"),
  edgeDirectionTypes: $("#edgeDirectionTypes"),
  edgeEndpointEditor: $("#edgeEndpointEditor"),
  edgeColorInput: $("#edgeColorInput"),
  edgeColorSwatches: $("#edgeColorSwatches"),
  edgeWidthInput: $("#edgeWidthInput"),
  powerInspector: $("#powerInspector"),
  powerSummary: $("#powerSummary"),
  powerOutletNameField: $("#powerOutletNameField"),
  powerOutletNameInput: $("#powerOutletNameInput"),
  powerOutletLimitField: $("#powerOutletLimitField"),
  powerOutletLimitInput: $("#powerOutletLimitInput"),
  signalLayerBtn: $("#signalLayerBtn"),
  powerLayerBtn: $("#powerLayerBtn"),
  portPopover: $("#portPopover"),
  projectNameInput: $("#projectNameInput"),
  notesInput: $("#notesInput"),
  inputList: $("#inputList"),
  inputCount: $("#inputCount"),
  storageLabel: $("#storageLabel"),
  storageBar: $("#storageBar"),
  printTitle: $("#printTitle"),
  printMeta: $("#printMeta"),
  printNotes: $("#printNotes"),
  printDiagram: $("#printDiagram"),
  printInputRows: $("#printInputRows"),
};

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function exportData() {
  return {
    version: VERSION,
    name: state.name,
    createdAt: new Date().toISOString(),
    nodes: clone(state.nodes),
    edges: clone(state.edges),
    powerOutlets: clone(state.powerOutlets),
    powerEdges: clone(state.powerEdges),
    viewport: clone(state.viewport),
    metadata: {
      notes: state.notes,
      app: APP_NAME,
      format: "gearpatch-json",
      activeLayer: state.activeLayer,
    },
  };
}

function snapshot() {
  return {
    name: state.name,
    notes: state.notes,
    nodes: clone(state.nodes),
    edges: clone(state.edges),
    powerOutlets: clone(state.powerOutlets),
    powerEdges: clone(state.powerEdges),
    activeLayer: state.activeLayer,
    viewport: clone(state.viewport),
  };
}

function restoreSnapshot(snap) {
  state.name = snap.name || "Live PA";
  state.notes = snap.notes || snap.metadata?.notes || "";
  state.nodes = clone(snap.nodes || []);
  state.edges = clone(snap.edges || []);
  state.powerOutlets = clone(snap.powerOutlets || []);
  state.powerEdges = clone(snap.powerEdges || []);
  state.activeLayer = snap.activeLayer || snap.metadata?.activeLayer || "signal";
  state.viewport = snap.viewport || { x: -620, y: -420, scale: 1 };
  state.selected = new Set();
  state.selectedEdge = null;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.connecting = null;
  state.portDrag = null;
  state.powerDrag = null;
  state.powerOutletDrag = null;
  state.portPopover = null;
  autoPlacePortsForEdges();
  autoPlacePowerEdgesForNodeIds(state.nodes.map((node) => node.id));
  dom.projectNameInput.value = state.name;
  dom.notesInput.value = state.notes;
  render();
  scheduleAutosave("Restored");
}

function pushHistory() {
  state.history.push(snapshot());
  if (state.history.length > 80) state.history.shift();
  state.future = [];
}

function commit(message = "Updated") {
  pushHistory();
  render();
  scheduleAutosave(message);
}

function scheduleAutosave(statusText = "Autosaved") {
  dom.saveStatus.textContent = "Saving...";
  clearTimeout(state.autosaveTimer);
  state.autosaveTimer = setTimeout(() => {
    persist();
    dom.saveStatus.textContent = statusText;
  }, 2000);
}

function persist() {
  const data = exportData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  addVersion(data);
  updateStorageMeter();
}

function addVersion(data) {
  const versions = readVersions();
  const current = JSON.stringify(data);
  if (versions[0]?.payload === current) return;
  versions.unshift({
    id: uid("version"),
    savedAt: new Date().toISOString(),
    name: data.name || "Untitled",
    nodes: data.nodes.length,
    edges: data.edges.length + (data.powerEdges?.length || 0),
    payload: current,
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(versions.slice(0, 20)));
}

function readVersions() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || localStorage.getItem(LEGACY_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function updateStorageMeter() {
  const total = Object.keys(localStorage).reduce((sum, key) => {
    return sum + (localStorage.getItem(key)?.length || 0) + key.length;
  }, 0);
  const bytes = total * 2;
  const kb = bytes / 1024;
  const percent = Math.min(100, (bytes / (4 * 1024 * 1024)) * 100);
  dom.storageLabel.textContent = `${Math.round(kb)} KB`;
  dom.storageBar.style.width = `${percent}%`;
  if (bytes > 4 * 1024 * 1024) toast("localStorage is over 4 MB. Export a JSON backup soon.");
}

function makeNode(template, x = 1200, y = 900) {
  const ports = (template.ports || []).map((port) => ({ ...port, id: uid(port.id) }));
  return {
    id: uid("node"),
    type: template.type,
    title: template.defaultName ?? template.title ?? "",
    subtitle: template.defaultLabel ?? template.subtitle ?? template.label ?? "Gear",
    category: template.category || libraryGroupLabel(template.group),
    icon: template.icon,
    tags: [...(template.tags || [])],
    x: snapToGrid(x),
    y: snapToGrid(y),
    w: template.w,
    h: template.h,
    powerWatts: template.powerWatts ?? "",
    ports,
  };
}

function addNode(template, point) {
  if (!template) return;
  const snapped = snapPoint(point);
  state.nodes.push(makeNode(template, snapped.x, snapped.y));
  state.selected = new Set([state.nodes.at(-1).id]);
  state.selectedEdge = null;
  commit(`Added ${template.label || template.title || "gear"}`);
}

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function snapPoint(point) {
  return { x: snapToGrid(point.x), y: snapToGrid(point.y) };
}

function snapNodePosition(node, x, y) {
  const maxX = WORLD_W - node.w - GRID_SIZE;
  const maxY = WORLD_H - node.h - GRID_SIZE;
  return {
    x: Math.min(maxX, Math.max(GRID_SIZE, snapToGrid(x))),
    y: Math.min(maxY, Math.max(GRID_SIZE, snapToGrid(y))),
  };
}

function screenToWorld(clientX, clientY) {
  const rect = dom.canvasFrame.getBoundingClientRect();
  return {
    x: (clientX - rect.left - state.viewport.x) / state.viewport.scale,
    y: (clientY - rect.top - state.viewport.y) / state.viewport.scale,
  };
}

function worldToScreen(x, y) {
  return {
    x: x * state.viewport.scale + state.viewport.x,
    y: y * state.viewport.scale + state.viewport.y,
  };
}

function render() {
  dom.projectNameInput.value = state.name;
  dom.notesInput.value = state.notes;
  updateLayerUi();
  renderLibrary();
  renderWorldTransform();
  renderEdges();
  renderNodes();
  renderPowerOutlets();
  renderInspector();
  renderInputList();
  renderMinimap();
  renderPortPopover();
  dom.canvasHint.classList.toggle("hidden", state.nodes.length > 0);
}

function clearSelection() {
  const hadSelection =
    state.selected.size > 0 ||
    !!state.selectedEdge ||
    !!state.selectedPowerEdge ||
    !!state.selectedPowerOutlet ||
    !!state.connecting ||
    !!state.portPopover;
  state.selected = new Set();
  state.selectedEdge = null;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.connecting = null;
  state.powerDrag = null;
  state.portPopover = null;

  if (!hadSelection) {
    renderInspector();
    renderPortPopover();
    return false;
  }

  renderEdges();
  renderNodes();
  renderPowerOutlets();
  renderInspector();
  renderPortPopover();
  return true;
}

function renderLibrary() {
  const query = dom.librarySearch.value.trim().toLowerCase();
  dom.libraryList.innerHTML = "";
  const visibleTemplates = templates.filter((item) => !item.hidden);
  const filteredTemplates = visibleTemplates.filter((item) => librarySearchText(item).includes(query));

  LIBRARY_GROUPS.forEach((group) => {
    const groupItems = filteredTemplates.filter((item) => item.group === group.id);
    if (!groupItems.length) return;
    const section = document.createElement("section");
    section.className = "library-group";
    section.innerHTML = `<h3 class="library-group-title">${escapeHtml(group.label)}</h3>`;
    groupItems.forEach((template) => {
      const item = document.createElement("button");
      item.className = "library-item";
      item.draggable = true;
      item.dataset.template = template.type;
      item.innerHTML = `
        <span class="library-icon">${gearIcon(template.icon)}</span>
        <span>
          <strong>${escapeHtml(template.label)}</strong>
          <span>${escapeHtml(template.jaLabel)}</span>
        </span>
      `;
      item.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData(TEMPLATE_MIME, template.type);
        event.dataTransfer.effectAllowed = "copy";
      });
      item.addEventListener("click", () => {
        const center = screenToWorld(
          dom.canvasFrame.getBoundingClientRect().left + dom.canvasFrame.clientWidth / 2,
          dom.canvasFrame.getBoundingClientRect().top + dom.canvasFrame.clientHeight / 2,
        );
        addNode(template, { x: center.x - template.w / 2, y: center.y - template.h / 2 });
        setMobilePanel("canvas");
      });
      section.appendChild(item);
    });
    dom.libraryList.appendChild(section);
  });

  if (!filteredTemplates.length) {
    dom.libraryList.innerHTML = `<div class="empty-state"><span>No matching gear.</span></div>`;
  }
}

function librarySearchText(item) {
  const group = libraryGroup(item.group);
  return [item.label, item.jaLabel, item.category, group?.label, group?.jaLabel, ...(item.tags || [])].join(" ").toLowerCase();
}

function templateByType(type) {
  return templates.find((item) => item.type === type);
}

function visibleTemplateByType(type) {
  const template = templateByType(type);
  return template && !template.hidden ? template : null;
}

function fieldCenter() {
  return { x: WORLD_W / 2, y: WORLD_H / 2 };
}

function makePowerOutlet(x, y, overrides = {}) {
  return {
    id: uid("outlet"),
    name: "AC Outlet",
    x: snapToGrid(x),
    y: snapToGrid(y),
    w: 150,
    h: 84,
    limitWatts: "",
    ...overrides,
  };
}

function addPowerOutlet(point = null) {
  const center =
    point ||
    screenToWorld(
      dom.canvasFrame.getBoundingClientRect().left + dom.canvasFrame.clientWidth / 2,
      dom.canvasFrame.getBoundingClientRect().top + dom.canvasFrame.clientHeight / 2,
    );
  const outlet = makePowerOutlet(center.x - 75, center.y - 42);
  state.powerOutlets.push(outlet);
  state.activeLayer = "power";
  state.selectedPowerOutlet = outlet.id;
  state.selectedPowerEdge = null;
  state.selectedEdge = null;
  state.selected = new Set();
  commit("Added power outlet");
}

function ensureDefaultPowerOutlet() {
  if (state.powerOutlets.length) return;
  const center = fieldCenter();
  state.powerOutlets.push(makePowerOutlet(center.x + 500, center.y - 42, { name: "Stage AC" }));
}

function resetViewportToFieldCenter(scale = 1) {
  const rect = dom.canvasFrame.getBoundingClientRect();
  const width = rect.width || dom.canvasFrame.clientWidth || window.innerWidth;
  const height = rect.height || dom.canvasFrame.clientHeight || window.innerHeight;
  state.viewport = {
    x: width / 2 - (WORLD_W / 2) * scale,
    y: height / 2 - (WORLD_H / 2) * scale,
    scale,
  };
}

function centerViewportOnWorldPoint(point) {
  const rect = dom.canvasFrame.getBoundingClientRect();
  const width = rect.width || dom.canvasFrame.clientWidth || window.innerWidth;
  const height = rect.height || dom.canvasFrame.clientHeight || window.innerHeight;
  const x = clamp(point.x, 0, WORLD_W);
  const y = clamp(point.y, 0, WORLD_H);
  state.viewport.x = width / 2 - x * state.viewport.scale;
  state.viewport.y = height / 2 - y * state.viewport.scale;
  renderWorldTransform();
  renderMinimap();
  renderPortPopover();
  scheduleAutosave("Autosaved");
}

function resetTransientState() {
  state.selected = new Set();
  state.selectedEdge = null;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.connecting = null;
  state.portDrag = null;
  state.powerDrag = null;
  state.powerOutletDrag = null;
  state.portPopover = null;
}

function hasReplaceableFlow() {
  return state.nodes.length > 0 || state.edges.length > 0 || state.powerOutlets.length > 0 || state.powerEdges.length > 0;
}

function confirmReplaceCurrentFlow(message) {
  if (!hasReplaceableFlow()) return true;
  return window.confirm(message);
}

function consumeNewFlowConfirmation() {
  if (state.pendingNewConfirmed) {
    state.pendingNewConfirmed = false;
    return true;
  }
  return confirmReplaceCurrentFlow("Start a new flow? The current gear and cables will be replaced.");
}

function updateLayerUi() {
  const power = state.activeLayer === "power";
  document.body.classList.toggle("power-mode", power);
  dom.signalLayerBtn.classList.toggle("active", !power);
  dom.powerLayerBtn.classList.toggle("active", power);
  dom.canvasHint.querySelector("span:last-child").textContent = power ? "Drag dots to power outlets" : "Drag dots to patch";
}

function setActiveLayer(layer) {
  const next = layer === "power" ? "power" : "signal";
  if (state.activeLayer === next) {
    if (next === "signal") closeMenus();
    return;
  }
  closeMenus();
  state.activeLayer = next;
  state.selectedEdge = null;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.connecting = null;
  state.portDrag = null;
  state.powerDrag = null;
  state.portPopover = null;
  if (next === "power") ensureDefaultPowerOutlet();
  render();
  scheduleAutosave("Autosaved");
}

function renderWorldTransform() {
  dom.world.style.transform = `translate(${state.viewport.x}px, ${state.viewport.y}px) scale(${state.viewport.scale})`;
  dom.zoomReadout.textContent = `${Math.round(state.viewport.scale * 100)}%`;
}

function renderNodes() {
  dom.nodeLayer.innerHTML = "";
  state.nodes.forEach((node) => {
    const displayTitle = gearDisplayName(node);
    const displaySubtitle = node.title?.trim() ? node.subtitle : "";
    const el = document.createElement("article");
    el.className = "gear-node";
    if (state.activeLayer === "power") el.classList.add("power-editing");
    if (state.selected.has(node.id)) el.classList.add("selected");
    if (state.selected.size > 1 && state.selected.has(node.id)) el.classList.add("multi-selected");
    el.dataset.nodeId = node.id;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.width = `${node.w}px`;
    el.style.height = `${node.h}px`;
    el.innerHTML = `
      <div class="node-header">
        <div class="node-icon">${gearIcon(node.icon)}</div>
        <div>
          <div class="node-title">${escapeHtml(displayTitle)}</div>
          ${displaySubtitle ? `<div class="node-subtitle">${escapeHtml(displaySubtitle)}</div>` : ""}
        </div>
      </div>
      ${state.activeLayer === "power" ? `<div class="node-power-watts">${formatWatts(nodePowerWatts(node))}</div>` : ""}
      <div class="resize-handle" title="Resize"></div>
    `;

    el.addEventListener("pointerdown", (event) => startNodeDrag(event, node));
    el.querySelector(".resize-handle").addEventListener("pointerdown", (event) => startResize(event, node));
    HANDLE_SIDES.forEach((side) => el.appendChild(renderQuickHandle(node, side)));
    dom.nodeLayer.appendChild(el);
  });
}

function renderQuickHandle(node, side) {
  const button = document.createElement("button");
  button.className = `quick-handle ${side}`;
  if (state.portDrag?.target?.nodeId === node.id && state.portDrag?.target?.side === side) {
    button.classList.add("drop-target");
  }
  button.dataset.nodeId = node.id;
  button.dataset.side = side;
  button.setAttribute("aria-label", `${gearDisplayName(node)} ${side} ${state.activeLayer === "power" ? "power" : "signal"} connector`);
  button.addEventListener("pointerdown", (event) => {
    if (state.activeLayer === "power") startPowerConnectorDrag(event, node, side);
    else startConnectorDrag(event, node, side);
  });
  return button;
}

function gearDisplayName(node) {
  if (!node) return "Unknown gear";
  return node?.title?.trim() || node?.subtitle?.trim() || "Untitled gear";
}

function renderPort(node, port) {
  const button = document.createElement("button");
  const point = portPoint(node, port);
  button.className = `port ${port.side} ${port.kind}`;
  if (state.connecting?.nodeId === node.id && state.connecting?.portId === port.id) {
    button.classList.add("connecting");
  }
  if (state.portDrag?.target?.nodeId === node.id && state.portDrag?.target?.portId === port.id) {
    button.classList.add("drop-target");
  }
  button.dataset.nodeId = node.id;
  button.dataset.portId = port.id;
  button.style.left = `${point.x - node.x}px`;
  button.style.top = `${point.y - node.y}px`;
  button.innerHTML = `
    <span class="port-shape">${portSvg[port.kind] || portSvg.trs}</span>
    <span class="port-label">${escapeHtml(port.label)}</span>
  `;
  button.addEventListener("pointerdown", (event) => startPortDrag(event, node, port));
  return button;
}

function renderEdges() {
  dom.edgeLayer.innerHTML = "";
  dom.terminalLayer.innerHTML = "";
  if (state.activeLayer === "power") {
    renderSignalEdges({ muted: true, interactive: false });
    renderPowerEdges();
    renderPowerDragPreview();
    return;
  }
  renderSignalEdges({ muted: false, interactive: true });
  renderPortDragPreview();
}

function renderSignalEdges({ muted = false, interactive = true } = {}) {
  const terminalBadges = [];
  state.edges.forEach((edge) => {
    const endpoints = edgeEndpointPoints(edge);
    if (!endpoints) return;
    const { from, to } = endpoints;
    const d = cablePath(from, to, endpoints.fromSide, endpoints.toSide);
    const style = cableVisualStyle(edge);
    const hit = svgEl("path", {
      d,
      class: "patch-cable-hit",
      "data-edge-id": edge.id,
    });
    const cablePaths = cablePathSvgElements(d, style, interactive && state.selectedEdge === edge.id);
    if (muted) {
      cablePaths.forEach((path) => {
        path.classList.add("signal-muted");
        path.setAttribute("stroke", "#111111");
      });
    }
    const controls = cableControlPoints(from, to, endpoints.fromSide, endpoints.toSide);
    const directionArrows = muted ? [] : cableDirectionSvgElements(controls, edge, style.color, state.selectedEdge === edge.id);
    if (interactive) {
      hit.addEventListener("click", () => {
        state.selectedEdge = edge.id;
        state.selectedPowerEdge = null;
        state.selectedPowerOutlet = null;
        state.selected = new Set();
        state.portPopover = null;
        render();
      });
      dom.edgeLayer.append(hit, ...cablePaths, ...directionArrows);
      terminalBadges.push(
        cableEndChipSvg(from, edge, "from", style.color, state.selectedEdge === edge.id, to),
        cableEndChipSvg(to, edge, "to", style.color, state.selectedEdge === edge.id, from),
      );
    } else {
      dom.edgeLayer.append(...cablePaths, ...directionArrows);
    }
  });
  dom.terminalLayer.append(...terminalBadges);
}

function renderPowerEdges() {
  const powerBadges = [];
  state.powerEdges.forEach((edge) => {
    const endpoints = powerEdgeEndpointPoints(edge);
    if (!endpoints) return;
    const { from, to } = endpoints;
    const d = cablePath(from, to, endpoints.fromSide, endpoints.toSide);
    const selected = state.selectedPowerEdge === edge.id;
    const hit = svgEl("path", {
      d,
      class: "power-cable-hit",
      "data-power-edge-id": edge.id,
    });
    const cable = svgEl("path", {
      d,
      class: `power-cable ${selected ? "selected" : ""}`,
      stroke: "#111111",
      "stroke-width": selected ? 3.4 : 2.6,
      "stroke-dasharray": "9 6",
    });
    hit.addEventListener("click", () => {
      state.selectedPowerEdge = edge.id;
      state.selectedPowerOutlet = null;
      state.selectedEdge = null;
      state.selected = new Set();
      state.portPopover = null;
      render();
    });
    dom.edgeLayer.append(hit, cable);
    powerBadges.push(powerEndChipSvg(from, edge, "from", selected));
  });
  dom.terminalLayer.append(...powerBadges);
}

function renderPowerOutlets() {
  dom.powerOutletLayer.innerHTML = "";
  if (state.activeLayer !== "power") return;
  state.powerOutlets.forEach((outlet) => {
    const el = document.createElement("article");
    el.className = "power-outlet";
    if (state.selectedPowerOutlet === outlet.id) el.classList.add("selected");
    if (state.powerDrag?.target?.outletId === outlet.id) el.classList.add("drop-target");
    el.dataset.outletId = outlet.id;
    el.style.left = `${outlet.x}px`;
    el.style.top = `${outlet.y}px`;
    el.innerHTML = `
      <span class="power-outlet-icon" aria-hidden="true">
        <svg class="tabler-icon" focusable="false" viewBox="0 0 24 24">
          <path d="M7 7v-4" />
          <path d="M17 7v-4" />
          <path d="M5 11h14" />
          <path d="M8 11v3a4 4 0 0 0 8 0v-3" />
          <path d="M12 18v3" />
        </svg>
      </span>
      <span>
        <span class="power-outlet-title">${escapeHtml(outlet.name || "AC Outlet")}</span>
        <span class="power-outlet-total">${escapeHtml(powerOutletTotalLabel(outlet))}</span>
      </span>
    `;
    el.addEventListener("pointerdown", (event) => startPowerOutletDrag(event, outlet));
    dom.powerOutletLayer.appendChild(el);
  });
}

function renderInspector() {
  const selectedNodes = state.nodes.filter((node) => state.selected.has(node.id));
  const selectedEdge = getSelectedEdge();
  const selectedPowerEdge = getSelectedPowerEdge();
  const selectedPowerOutlet = getSelectedPowerOutlet();
  const selectedName = selectedNodes[0]
    ? gearDisplayName(selectedNodes[0])
    : selectedEdge
      ? "Cable"
      : selectedPowerEdge
        ? "Power cable"
        : selectedPowerOutlet
          ? selectedPowerOutlet.name || "AC Outlet"
          : "Inspector";
  const selectedCount = selectedNodes.length > 1 ? `（${selectedNodes.length}）` : "";
  dom.inspectorTitle.textContent = selectedName;
  dom.selectionCount.textContent = selectedCount;
  dom.selectionCount.hidden = !selectedCount;
  const single = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const showPowerInspector = state.activeLayer === "power" && (!!selectedPowerEdge || !!selectedPowerOutlet);
  dom.emptyInspector.classList.toggle("hidden", !!single || !!selectedEdge || showPowerInspector);
  dom.nodeInspector.classList.toggle("hidden", !single);
  dom.edgeInspector.classList.toggle("hidden", !selectedEdge || state.activeLayer === "power");
  dom.powerInspector.classList.toggle("hidden", !showPowerInspector);

  if (showPowerInspector) {
    renderPowerInspector(selectedPowerEdge, selectedPowerOutlet);
    return;
  }

  if (selectedEdge && state.activeLayer !== "power") {
    const style = cableVisualStyle(selectedEdge);
    dom.edgeSummary.innerHTML = edgeSummaryMarkup(selectedEdge);
    dom.edgeSignalTypes.innerHTML = Object.entries(LINE_STYLES)
      .map(([type, config]) => `<button class="${edgeLineStyle(selectedEdge) === type ? "active" : ""}" data-edge-line="${type}">${config.label}</button>`)
      .join("");
    dom.edgeDirectionTypes.innerHTML = Object.entries(SIGNAL_DIRECTIONS)
      .map(([type, config]) => `<button class="${edgeSignalDirection(selectedEdge) === type ? "active" : ""}" data-edge-direction="${type}">${config.label}</button>`)
      .join("");
    dom.edgeEndpointEditor.innerHTML = edgeEndpointEditorMarkup(selectedEdge);
    dom.edgeColorInput.value = style.color;
    dom.edgeWidthInput.value = style.width;
    dom.edgeColorSwatches.innerHTML = CABLE_COLORS.map((color) => {
      const active = normalizeColor(style.color) === normalizeColor(color);
      return `<button class="color-swatch ${active ? "active" : ""}" data-edge-color="${color}" style="--swatch:${color}" aria-label="${color}"></button>`;
    }).join("");
    return;
  }

  if (!single) {
    return;
  }

  dom.nodeTitleInput.value = single.title;
  dom.nodeSubtitleInput.value = single.subtitle;
  dom.nodePowerField.classList.toggle("hidden", state.activeLayer !== "power");
  dom.nodePowerInput.value = single.powerWatts ?? "";
  dom.nodeIconPicker.innerHTML = ICON_OPTIONS.map(
    (icon) => `
      <button class="icon-choice ${single.icon === icon.id ? "active" : ""}" data-node-icon="${icon.id}" title="${escapeAttr(icon.label)}" aria-label="${escapeAttr(icon.label)}">
        ${gearIcon(icon.id)}
      </button>
    `,
  ).join("");
}

function renderPowerInspector(selectedPowerEdge, selectedPowerOutlet) {
  const outlet = selectedPowerOutlet || getPowerOutlet(selectedPowerEdge?.to?.outletId);
  const node = selectedPowerEdge ? getNode(selectedPowerEdge.from.nodeId) : null;
  const total = outlet ? powerOutletTotalWatts(outlet.id) : 0;
  const limit = outlet ? Number(outlet.limitWatts) || 0 : 0;
  const loadLine = limit > 0 ? `${formatWatts(total)} / ${formatWatts(limit)}` : `${formatWatts(total)} total`;
  dom.powerSummary.innerHTML = selectedPowerEdge
    ? `
      <span class="signal-pill">Power layer</span>
      <strong>${escapeHtml(gearDisplayName(node))} → ${escapeHtml(outlet?.name || "AC Outlet")}</strong>
      <span>${escapeHtml(formatWatts(nodePowerWatts(node)))} on this cable · ${escapeHtml(loadLine)}</span>
    `
    : `
      <span class="signal-pill">Power outlet</span>
      <strong>${escapeHtml(outlet?.name || "AC Outlet")}</strong>
      <span>${escapeHtml(loadLine)} · ${powerOutletConnectedNodeIds(outlet?.id).length} connected gear</span>
    `;
  dom.powerOutletNameField.classList.toggle("hidden", !outlet);
  dom.powerOutletLimitField.classList.toggle("hidden", !outlet);
  dom.powerOutletNameInput.value = outlet?.name || "";
  dom.powerOutletLimitInput.value = outlet?.limitWatts ?? "";
}

function renderInputList() {
  const rows = makeInputRows();
  dom.inputCount.textContent = rows.length;
  dom.inputList.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
        <div class="input-row">
          <span class="ch">${row.ch}</span>
          <div>
            <strong>${escapeHtml(row.source)}</strong>
            <span>${escapeHtml(row.connector)} → ${escapeHtml(row.to)}</span>
            <span>${escapeHtml(row.notes)}</span>
          </div>
        </div>
      `,
        )
        .join("")
    : `<div class="empty-state"><span>Connect cables to generate the input list.</span></div>`;
}

function renderPortPopover() {
  const target = state.portPopover;
  const node = target ? getNode(target.nodeId) : null;
  const port = node ? getPort(node, target.portId) : null;
  if (!node || !port) {
    dom.portPopover.classList.add("hidden");
    dom.portPopover.innerHTML = "";
    return;
  }

  const point = portPoint(node, port);
  const screen = worldToScreen(point.x, point.y);
  const left = Math.min(dom.canvasFrame.clientWidth - 292, Math.max(12, screen.x + 18));
  const top = Math.min(dom.canvasFrame.clientHeight - 330, Math.max(12, screen.y - 28));
  const isConnecting = state.connecting?.nodeId === node.id && state.connecting?.portId === port.id;
  dom.portPopover.style.left = `${left}px`;
  dom.portPopover.style.top = `${top}px`;
  dom.portPopover.classList.remove("hidden");
  dom.portPopover.innerHTML = `
    <div class="popover-head">
      <div>
        <strong>${escapeHtml(node.title)}</strong>
        <span>${escapeHtml(port.label)}</span>
      </div>
      <button class="icon-button tiny" data-port-popover-close aria-label="Close">×</button>
    </div>
    <label>
      Port label
      <input data-popover-port-label type="text" value="${escapeAttr(port.label)}" />
    </label>
    <label>
      Connector
      <select data-popover-port-kind>
        ${PORT_KIND_OPTIONS.map((kind) => `<option value="${kind}" ${port.kind === kind ? "selected" : ""}>${connectorLabel(kind)}</option>`).join("")}
      </select>
    </label>
    <label>
      Position
      <input data-popover-port-offset type="range" min="0.08" max="0.92" step="0.01" value="${port.offset}" />
    </label>
    <div class="segmented" data-popover-port-side>
      ${["left", "right", "top", "bottom"]
        .map((side) => `<button class="${port.side === side ? "active" : ""}" data-popover-side="${side}">${side}</button>`)
        .join("")}
    </div>
    <div class="popover-actions">
      <button class="full-button" data-port-start-connect>${isConnecting ? "Waiting for target" : "Start connection"}</button>
      <button class="full-button danger" data-port-delete>Delete port</button>
    </div>
  `;
}

function edgeSummaryMarkup(edge) {
  const fromNode = getNode(edge.from.nodeId);
  const toNode = getNode(edge.to.nodeId);
  return `
    <span class="signal-pill">${escapeHtml(lineStyleLabel(edgeLineStyle(edge)))}</span>
    <span class="signal-pill">${escapeHtml(signalDirectionLabel(edgeSignalDirection(edge)))}</span>
    <strong>${escapeHtml(gearDisplayName(fromNode))}</strong>
    <span>→ ${escapeHtml(gearDisplayName(toNode))}</span>
  `;
}

function edgeEndpointEditorMarkup(edge) {
  const fromNode = getNode(edge.from.nodeId);
  const toNode = getNode(edge.to.nodeId);
  return `
    ${edgeEndpointMarkup("from", fromNode, edge)}
    ${edgeEndpointMarkup("to", toNode, edge)}
  `;
}

function edgeEndpointMarkup(endpoint, node, edge) {
  if (!node) return "";
  const kind = edgeEndpointKind(edge, endpoint);
  const shapeValue = edgeEndpointShapeSelectValue(edge, endpoint);
  const isCustom = shapeValue === "__custom__";
  const customValue = isCustom ? kind : "";
  const gender = edgeEndpointGender(edge, endpoint);
  const portLabel = edgeEndpointPortLabel(edge, endpoint);
  return `
    <div class="edge-endpoint">
      <strong>${endpoint === "from" ? "From" : "To"} · ${escapeHtml(gearDisplayName(node))}</strong>
      <label>
        Port label
        <input data-edge-endpoint-label="${endpoint}" type="text" value="${escapeHtml(portLabel)}" placeholder="${endpoint === "from" ? "Audio out" : "Audio in"}" />
      </label>
      <label>
        Connector shape
        <select data-edge-endpoint-kind="${endpoint}">
          ${connectorShapeOptionsMarkup(shapeValue, isCustom)}
        </select>
      </label>
      <label class="edge-custom-kind ${isCustom ? "" : "hidden"}">
        Custom shape
        <input data-edge-endpoint-custom-kind="${endpoint}" type="text" value="${escapeHtml(customValue)}" placeholder="Mini XLR, EtherCON..." />
      </label>
      <div>
        <span class="field-label">Gender</span>
        <div class="segmented endpoint-gender">
          ${["male", "female", ""]
            .map(
              (option) =>
                `<button type="button" class="${gender === option ? "active" : ""}" data-edge-endpoint-gender="${endpoint}" data-gender="${option}">${connectorGenderLabel(option) || "None"}</button>`,
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function connectorShapeOptionsMarkup(shapeValue, isCustom = false) {
  const groups = CONNECTOR_SHAPE_GROUPS.map(
    (group) => `
      <optgroup label="${escapeAttr(group.label)}">
        ${group.options.map((option) => `<option value="${option}" ${shapeValue === option ? "selected" : ""}>${connectorLabel(option)}</option>`).join("")}
      </optgroup>
    `,
  ).join("");
  return `${groups}<option value="__custom__" ${isCustom ? "selected" : ""}>${connectorLabel("custom")}</option>`;
}

function renderMinimap() {
  dom.minimap.innerHTML = "";
  state.nodes.forEach((node) => {
    const el = document.createElement("span");
    el.className = "mini-node";
    el.style.left = `${node.x * MINIMAP_SCALE}px`;
    el.style.top = `${node.y * MINIMAP_SCALE}px`;
    el.style.width = `${Math.max(3, node.w * MINIMAP_SCALE)}px`;
    el.style.height = `${Math.max(3, node.h * MINIMAP_SCALE)}px`;
    dom.minimap.appendChild(el);
  });
  if (state.activeLayer === "power") {
    state.powerOutlets.forEach((outlet) => {
      const el = document.createElement("span");
      el.className = "mini-node power-mini-node";
      el.style.left = `${outlet.x * MINIMAP_SCALE}px`;
      el.style.top = `${outlet.y * MINIMAP_SCALE}px`;
      el.style.width = `${Math.max(3, outlet.w * MINIMAP_SCALE)}px`;
      el.style.height = `${Math.max(3, outlet.h * MINIMAP_SCALE)}px`;
      dom.minimap.appendChild(el);
    });
  }
  const rect = dom.canvasFrame.getBoundingClientRect();
  const view = document.createElement("span");
  view.className = "mini-view";
  view.style.left = `${(-state.viewport.x / state.viewport.scale) * MINIMAP_SCALE}px`;
  view.style.top = `${(-state.viewport.y / state.viewport.scale) * MINIMAP_SCALE}px`;
  view.style.width = `${(rect.width / state.viewport.scale) * MINIMAP_SCALE}px`;
  view.style.height = `${(rect.height / state.viewport.scale) * MINIMAP_SCALE}px`;
  dom.minimap.appendChild(view);
}

function jumpToMinimapPoint(event) {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  const rect = dom.minimap.getBoundingClientRect();
  centerViewportOnWorldPoint({
    x: (event.clientX - rect.left) / MINIMAP_SCALE,
    y: (event.clientY - rect.top) / MINIMAP_SCALE,
  });
}

function makeInputRows() {
  return state.edges.map((edge, index) => {
    const fromNode = getNode(edge.from.nodeId);
    const toNode = getNode(edge.to.nodeId);
    const fromKind = edgeEndpointKind(edge, "from");
    const toKind = edgeEndpointKind(edge, "to");
    const source = gearDisplayName(fromNode);
    const to = gearDisplayName(toNode);
    const connector = `${connectorInfoLabel(fromKind, edgeEndpointGender(edge, "from"))} (${edgeEndpointPortLabel(edge, "from")}) → ${connectorInfoLabel(toKind, edgeEndpointGender(edge, "to"))} (${edgeEndpointPortLabel(edge, "to")})`;
    return {
      ch: index + 1,
      source,
      connector: `${lineStyleLabel(edgeLineStyle(edge))} · ${signalDirectionLabel(edgeSignalDirection(edge))} · ${connector}`,
      to,
      notes: compatibilityNote(fromKind, toKind),
    };
  });
}

function nodePowerWatts(node) {
  const value = Number(node?.powerWatts);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function formatWatts(value) {
  const watts = Number(value) || 0;
  return `${Math.round(watts)} W`;
}

function powerEdgeLoadLabel(edge) {
  return formatWatts(nodePowerWatts(getNode(edge?.from?.nodeId)));
}

function powerOutletConnectedNodeIds(outletId) {
  if (!outletId) return [];
  return Array.from(new Set(state.powerEdges.filter((edge) => edge.to.outletId === outletId).map((edge) => edge.from.nodeId).filter(Boolean)));
}

function powerOutletTotalWatts(outletId) {
  return powerOutletConnectedNodeIds(outletId).reduce((sum, nodeId) => sum + nodePowerWatts(getNode(nodeId)), 0);
}

function powerOutletTotalLabel(outlet) {
  const total = powerOutletTotalWatts(outlet.id);
  const limit = Number(outlet.limitWatts) || 0;
  return limit > 0 ? `${formatWatts(total)} / ${formatWatts(limit)}` : `${formatWatts(total)} total`;
}

function edgeSignalType(edge) {
  return SIGNAL_TYPES[edge?.signalType] ? edge.signalType : "audio";
}

function signalTypeLabel(type) {
  return SIGNAL_TYPES[type]?.label || SIGNAL_TYPES.audio.label;
}

function signalStyle(edge) {
  return SIGNAL_TYPES[edgeSignalType(edge)] || SIGNAL_TYPES.audio;
}

function edgeLineStyle(edge) {
  if (LINE_STYLES[edge?.lineStyle]) return edge.lineStyle;
  const inferred = edgeSignalType(edge);
  if (inferred === "digital") return "dashed";
  if (inferred === "midi") return "dotted";
  return "solid";
}

function lineStyleLabel(type) {
  return LINE_STYLES[type]?.label || LINE_STYLES.solid.label;
}

function edgeSignalDirection(edge) {
  return SIGNAL_DIRECTIONS[edge?.direction] ? edge.direction : "forward";
}

function signalDirectionLabel(type) {
  return SIGNAL_DIRECTIONS[type]?.label || SIGNAL_DIRECTIONS.forward.label;
}

function cableVisualStyle(edge) {
  const legacy = signalStyle(edge);
  const line = LINE_STYLES[edgeLineStyle(edge)] || LINE_STYLES.solid;
  return {
    color: edge?.color || legacy.color,
    width: edge?.width || legacy.width,
    dash: line.dash,
    double: !!line.double,
  };
}

function inferSignalType(...kinds) {
  if (kinds.some((kind) => kind === "speakon")) return "speaker";
  if (kinds.some((kind) => kind === "midi")) return "midi";
  if (kinds.some((kind) => ["usb", "usb-a", "usb-b", "usb-c", "micro-usb", "lan", "hdmi"].includes(kind))) return "digital";
  return "audio";
}

function applySignalDefaults(edge, type) {
  const style = SIGNAL_TYPES[type] || SIGNAL_TYPES.audio;
  edge.signalType = type;
  edge.color = style.color;
  edge.width = style.width;
}

function compatibilityNote(a, b) {
  if (!a || !b) return "";
  if (a.startsWith("xlr") && b.startsWith("xlr")) return "Balanced mic/line";
  if ((a === "ts" && b === "trs") || (a === "trs" && b === "ts")) return "TS/TRS mixed: check balanced/unbalanced";
  if (a === "speakon" || b === "speakon") return "Speaker level: do not patch to line input";
  if (a !== b && new Set([a, b]).has("rca")) return "Adapter or DI may be required";
  return "OK";
}

function connectorLabel(kind) {
  const labels = {
    xlr: "XLR / キャノン",
    "xlr-m": "XLR male / キャノン オス",
    "xlr-f": "XLR female / キャノン メス",
    ts: "TS / モノラル標準",
    trs: "TRS / ステレオ標準",
    "mini-ts": "3.5mm TS / モノラルミニ",
    "mini-trs": "3.5mm TRS / ステレオミニ",
    "mini-trrs": "3.5mm TRRS / 4極ミニ",
    trrs: "3.5mm TRRS / 4極ミニ",
    rca: "RCA / RCA",
    usb: "USB-B / USB Type-B",
    "usb-c": "USB-C / USB Type-C",
    "usb-a": "USB-A / USB Type-A",
    "usb-b": "USB-B / USB Type-B",
    "micro-usb": "Micro USB / Micro USB",
    lan: "LAN / LAN",
    hdmi: "HDMI / HDMI",
    speakon: "SpeakON / スピコン",
    midi: "MIDI / MIDI",
    custom: "Custom / カスタム",
  };
  return labels[kind] || String(kind || "").trim() || "Custom";
}

function startConnectorDrag(event, node, side) {
  event.preventDefault();
  event.stopPropagation();
  state.selected = new Set([node.id]);
  state.selectedEdge = null;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.portPopover = null;
  state.connecting = null;
  state.portDrag = {
    pointerId: event.pointerId,
    from: { nodeId: node.id, side, offset: 0.5, kind: "xlr-m" },
    startClient: { x: event.clientX, y: event.clientY },
    current: screenToWorld(event.clientX, event.clientY),
    target: null,
    didMove: false,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.classList.add("connecting");
  renderInspector();
  renderEdges();
}

function startPortDrag(event, node, port) {
  event.preventDefault();
  event.stopPropagation();
  if (state.connecting && (state.connecting.nodeId !== node.id || state.connecting.portId !== port.id)) {
    state.portDrag = {
      pointerId: event.pointerId,
      from: { ...state.connecting },
      startClient: { x: event.clientX, y: event.clientY },
      current: screenToWorld(event.clientX, event.clientY),
      target: { nodeId: node.id, portId: port.id },
      didMove: true,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    syncPortDropTarget();
    renderEdges();
    return;
  }
  state.selected = new Set([node.id]);
  state.selectedEdge = null;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.portPopover = null;
  state.connecting = { nodeId: node.id, portId: port.id };
  state.portDrag = {
    pointerId: event.pointerId,
    from: { nodeId: node.id, portId: port.id },
    startClient: { x: event.clientX, y: event.clientY },
    current: screenToWorld(event.clientX, event.clientY),
    target: null,
    didMove: false,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.classList.add("connecting");
  renderInspector();
  renderEdges();
}

function handlePortClick(nodeId, portId) {
  if (state.connecting && (state.connecting.nodeId !== nodeId || state.connecting.portId !== portId)) {
    completeConnection(nodeId, portId);
    return;
  }
  state.selected = new Set([nodeId]);
  state.selectedEdge = null;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.portPopover = { nodeId, portId };
  render();
}

function startPortConnection(nodeId, portId) {
  state.connecting = { nodeId, portId };
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.portPopover = null;
  render();
  toast("Click the destination gear");
}

function completeConnection(nodeId, portId) {
  if (!state.connecting) return;
  if (state.connecting.nodeId === nodeId) {
    state.connecting = null;
    state.portDrag = null;
    state.portPopover = null;
    render();
    toast("Connect to another piece of gear.");
    return;
  }
  const fromPort = getPort(getNode(state.connecting.nodeId), state.connecting.portId);
  const toPort = getPort(getNode(nodeId), portId);
  const signalType = inferSignalType(fromPort?.kind, toPort?.kind);
  const style = SIGNAL_TYPES[signalType] || SIGNAL_TYPES.audio;
  const edge = {
    id: uid("edge"),
    from: state.connecting,
    to: { nodeId, portId },
    signalType,
    direction: "forward",
    color: style.color,
    width: style.width,
  };
  state.edges.push(edge);
  autoPlaceConnectedPortsForNodeIds([edge.from.nodeId, edge.to.nodeId]);
  state.connecting = null;
  state.portDrag = null;
  state.selectedEdge = edge.id;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.selected = new Set();
  state.portPopover = null;
  commit("Connected cable");
  const note = compatibilityNote(fromPort?.kind, toPort?.kind);
  if (note !== "OK" && note !== "Balanced mic/line") toast(note);
}

function completeNodeConnection(from, to) {
  if (!from || !to || from.nodeId === to.nodeId) {
    state.connecting = null;
    state.portDrag = null;
    render();
    return;
  }
  const fromKind = from.kind || "xlr-m";
  const toKind = to.kind || "xlr-f";
  const edge = {
    id: uid("edge"),
    from: { ...from, kind: fromKind },
    to: { ...to, kind: toKind },
    signalType: inferSignalType(fromKind, toKind),
    direction: "forward",
    lineStyle: "solid",
    color: "#111111",
    width: 3,
  };
  state.edges.push(edge);
  autoPlaceConnectedPortsForNodeIds([edge.from.nodeId, edge.to.nodeId]);
  state.connecting = null;
  state.portDrag = null;
  state.selectedEdge = edge.id;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.selected = new Set();
  state.portPopover = null;
  commit("Connected cable");
}

function startPowerConnectorDrag(event, node, side) {
  event.preventDefault();
  event.stopPropagation();
  ensureDefaultPowerOutlet();
  state.selected = new Set([node.id]);
  state.selectedEdge = null;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.portPopover = null;
  state.connecting = null;
  state.powerDrag = {
    pointerId: event.pointerId,
    from: { nodeId: node.id, side, offset: 0.5 },
    startClient: { x: event.clientX, y: event.clientY },
    current: screenToWorld(event.clientX, event.clientY),
    target: null,
    didMove: false,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.classList.add("connecting");
  renderInspector();
  renderEdges();
  renderPowerOutlets();
}

function completePowerConnection(from, to) {
  if (!from || !to) {
    state.powerDrag = null;
    render();
    return;
  }
  const duplicate = state.powerEdges.find((edge) => edge.from.nodeId === from.nodeId && edge.to.outletId === to.outletId);
  if (duplicate) {
    state.selectedPowerEdge = duplicate.id;
    state.selected = new Set();
    state.selectedEdge = null;
    state.powerDrag = null;
    render();
    toast("Power cable already exists");
    return;
  }
  const node = getNode(from.nodeId);
  const outlet = getPowerOutlet(to.outletId);
  if (!node || !outlet) {
    state.powerDrag = null;
    render();
    return;
  }
  const edge = {
    id: uid("power"),
    from,
    to,
  };
  state.powerEdges.push(edge);
  autoPlacePowerEdge(edge);
  state.powerDrag = null;
  state.selectedPowerEdge = edge.id;
  state.selectedPowerOutlet = null;
  state.selectedEdge = null;
  state.selected = new Set();
  commit("Connected power");
}

function startPowerOutletDrag(event, outlet) {
  event.preventDefault();
  event.stopPropagation();
  state.selectedPowerOutlet = outlet.id;
  state.selectedPowerEdge = null;
  state.selectedEdge = null;
  state.selected = new Set();
  state.portPopover = null;
  const point = screenToWorld(event.clientX, event.clientY);
  state.powerOutletDrag = {
    pointerId: event.pointerId,
    outletId: outlet.id,
    start: point,
    startClient: { x: event.clientX, y: event.clientY },
    x: outlet.x,
    y: outlet.y,
    didMove: false,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
  render();
}

function startNodeDrag(event, node) {
  if (event.target.closest(".port") || event.target.closest(".quick-handle") || event.target.closest(".resize-handle")) return;
  event.preventDefault();
  if (event.shiftKey) {
    state.selected.has(node.id) ? state.selected.delete(node.id) : state.selected.add(node.id);
  } else if (!state.selected.has(node.id)) {
    state.selected = new Set([node.id]);
  }
  state.selectedEdge = null;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.portPopover = null;
  const point = screenToWorld(event.clientX, event.clientY);
  state.drag = {
    pointerId: event.pointerId,
    start: point,
    nodes: state.nodes
      .filter((item) => state.selected.has(item.id))
      .map((item) => ({ id: item.id, x: item.x, y: item.y })),
  };
  event.currentTarget.setPointerCapture(event.pointerId);
  render();
}

function startResize(event, node) {
  event.preventDefault();
  event.stopPropagation();
  state.selected = new Set([node.id]);
  state.selectedEdge = null;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.portPopover = null;
  state.resize = {
    pointerId: event.pointerId,
    nodeId: node.id,
    start: screenToWorld(event.clientX, event.clientY),
    w: node.w,
    h: node.h,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
  render();
}

function startPan(event) {
  if (
    event.target !== dom.canvasFrame &&
    event.target !== dom.world &&
    event.target !== dom.nodeLayer &&
    event.target !== dom.powerOutletLayer &&
    event.target !== dom.edgeLayer
  )
    return;
  event.preventDefault();
  clearSelection();
  state.pan = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    vx: state.viewport.x,
    vy: state.viewport.y,
  };
  dom.canvasFrame.classList.add("panning");
  dom.canvasFrame.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (state.powerDrag) {
    state.powerDrag.current = screenToWorld(event.clientX, event.clientY);
    state.powerDrag.didMove =
      state.powerDrag.didMove ||
      Math.hypot(event.clientX - state.powerDrag.startClient.x, event.clientY - state.powerDrag.startClient.y) > 5;
    state.powerDrag.target = findPowerOutletTargetAtClientPoint(event.clientX, event.clientY);
    syncPowerOutletDropTarget();
    renderEdges();
    renderPowerOutlets();
    return;
  }
  if (state.portDrag) {
    state.portDrag.current = screenToWorld(event.clientX, event.clientY);
    state.portDrag.didMove =
      state.portDrag.didMove ||
      Math.hypot(event.clientX - state.portDrag.startClient.x, event.clientY - state.portDrag.startClient.y) > 5;
    state.portDrag.target = findConnectionTargetAtClientPoint(event.clientX, event.clientY, state.portDrag.from.nodeId);
    syncNodeDropTarget();
    renderEdges();
    return;
  }
  if (state.drag) {
    const point = screenToWorld(event.clientX, event.clientY);
    const dx = point.x - state.drag.start.x;
    const dy = point.y - state.drag.start.y;
    state.drag.nodes.forEach((start) => {
      const node = getNode(start.id);
      if (!node) return;
      const position = snapNodePosition(node, start.x + dx, start.y + dy);
      node.x = position.x;
      node.y = position.y;
    });
    autoPlaceConnectedPortsForNodeIds(state.drag.nodes.map((item) => item.id));
    autoPlacePowerEdgesForNodeIds(state.drag.nodes.map((item) => item.id));
    renderEdges();
    renderNodes();
    renderPowerOutlets();
    renderMinimap();
  }
  if (state.powerOutletDrag) {
    const point = screenToWorld(event.clientX, event.clientY);
    const outlet = getPowerOutlet(state.powerOutletDrag.outletId);
    if (!outlet) return;
    state.powerOutletDrag.didMove =
      state.powerOutletDrag.didMove ||
      Math.hypot(event.clientX - state.powerOutletDrag.startClient.x, event.clientY - state.powerOutletDrag.startClient.y) > 5;
    outlet.x = snapToGrid(state.powerOutletDrag.x + point.x - state.powerOutletDrag.start.x);
    outlet.y = snapToGrid(state.powerOutletDrag.y + point.y - state.powerOutletDrag.start.y);
    autoPlacePowerEdgesForOutletIds([outlet.id]);
    renderEdges();
    renderPowerOutlets();
    renderInspector();
    renderMinimap();
  }
  if (state.resize) {
    const point = screenToWorld(event.clientX, event.clientY);
    const node = getNode(state.resize.nodeId);
    if (!node) return;
    node.w = Math.max(120, Math.round((state.resize.w + point.x - state.resize.start.x) / 10) * 10);
    node.h = Math.max(86, Math.round((state.resize.h + point.y - state.resize.start.y) / 10) * 10);
    autoPlaceConnectedPortsForNodeIds([node.id]);
    autoPlacePowerEdgesForNodeIds([node.id]);
    renderEdges();
    renderNodes();
    renderPowerOutlets();
    renderInspector();
    renderMinimap();
  }
  if (state.pan) {
    state.viewport.x = state.pan.vx + event.clientX - state.pan.x;
    state.viewport.y = state.pan.vy + event.clientY - state.pan.y;
    renderWorldTransform();
    renderMinimap();
  }
}

function onPointerUp(event) {
  if (state.powerDrag) {
    const drag = state.powerDrag;
    drag.target = event ? findPowerOutletTargetAtClientPoint(event.clientX, event.clientY) : drag.target;
    const target = drag.target;
    const didMove = drag.didMove;
    state.powerDrag = null;
    syncPowerOutletDropTarget();
    if (didMove && target) {
      completePowerConnection(drag.from, target);
      return;
    }
    if (!didMove) {
      state.selected = new Set([drag.from.nodeId]);
      render();
      return;
    }
    render();
    toast("Release on a power outlet to create power cable.");
    return;
  }
  if (state.portDrag) {
    const drag = state.portDrag;
    drag.target = event ? findConnectionTargetAtClientPoint(event.clientX, event.clientY, drag.from.nodeId) : drag.target;
    const target = drag.target;
    const didMove = drag.didMove;
    state.portDrag = null;
    syncNodeDropTarget();
    if (didMove && target) {
      completeNodeConnection(drag.from, target);
      return;
    }
    state.connecting = null;
    if (!didMove) {
      state.selected = new Set([drag.from.nodeId]);
      render();
      return;
    }
    render();
    toast("Release on another piece of gear to create a cable.");
    return;
  }
  if (state.drag || state.resize || state.powerOutletDrag || state.pan) {
    const shouldCommit = !!(state.drag || state.resize || state.powerOutletDrag?.didMove);
    state.drag = null;
    state.resize = null;
    state.powerOutletDrag = null;
    state.pan = null;
    dom.canvasFrame.classList.remove("panning");
    if (shouldCommit) commit("Autosaved");
    else scheduleAutosave("Autosaved");
  }
}

function setZoom(nextScale, anchorClient) {
  const before = screenToWorld(anchorClient.x, anchorClient.y);
  state.viewport.scale = Math.min(1.8, Math.max(0.35, nextScale));
  const rect = dom.canvasFrame.getBoundingClientRect();
  state.viewport.x = anchorClient.x - rect.left - before.x * state.viewport.scale;
  state.viewport.y = anchorClient.y - rect.top - before.y * state.viewport.scale;
  renderWorldTransform();
  renderMinimap();
  renderPortPopover();
  scheduleAutosave("Autosaved");
}

function resetZoomTo100() {
  const rect = dom.canvasFrame.getBoundingClientRect();
  setZoom(1, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
}

function getNode(id) {
  return state.nodes.find((node) => node.id === id);
}

function getPort(node, portId) {
  return node?.ports.find((port) => port.id === portId);
}

function getSelectedEdge() {
  return state.edges.find((edge) => edge.id === state.selectedEdge);
}

function getSelectedPowerEdge() {
  return state.powerEdges.find((edge) => edge.id === state.selectedPowerEdge);
}

function getPowerOutlet(id) {
  return state.powerOutlets.find((outlet) => outlet.id === id);
}

function getSelectedPowerOutlet() {
  return getPowerOutlet(state.selectedPowerOutlet);
}

function getOpenPopoverPort() {
  const node = state.portPopover ? getNode(state.portPopover.nodeId) : null;
  const port = node ? getPort(node, state.portPopover.portId) : null;
  return { node, port };
}

function nodeCenter(node) {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

function nearestSide(fromNode, toNode) {
  const from = nodeCenter(fromNode);
  const to = nodeCenter(toNode);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}

function oppositeSide(side) {
  return { left: "right", right: "left", top: "bottom", bottom: "top" }[side] || "right";
}

function clampOffset(value) {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0.5;
  return Number(Math.min(0.9, Math.max(0.1, safeValue)).toFixed(2));
}

function autoPlaceConnectedPortsForNodeIds(nodeIds) {
  const ids = connectedNodeIdSet(nodeIds);
  const edges = state.edges.filter((edge) => ids.has(edge.from.nodeId) || ids.has(edge.to.nodeId));
  autoPlacePortsForEdges(edges);
}

function autoPlaceEdgeAnchors(edge) {
  if (!edge) return;
  autoPlaceConnectedPortsForNodeIds([edge.from.nodeId, edge.to.nodeId]);
}

function autoPlacePowerEdgesForNodeIds(nodeIds = []) {
  const ids = new Set(nodeIds.filter(Boolean));
  state.powerEdges.forEach((edge) => {
    if (ids.size && !ids.has(edge.from.nodeId)) return;
    autoPlacePowerEdge(edge);
  });
}

function autoPlacePowerEdgesForOutletIds(outletIds = []) {
  const ids = new Set(outletIds.filter(Boolean));
  state.powerEdges.forEach((edge) => {
    if (ids.size && !ids.has(edge.to.outletId)) return;
    autoPlacePowerEdge(edge);
  });
}

function autoPlacePowerEdge(edge) {
  const node = getNode(edge.from.nodeId);
  const outlet = getPowerOutlet(edge.to.outletId);
  if (!node || !outlet) return;
  const fromSide = nearestSide(node, outlet);
  const toSide = nearestSide(outlet, node);
  const fromPoint = endpointFromPoint(node, nodeCenter(outlet));
  const toPoint = endpointFromPoint(outlet, nodeCenter(node));
  edge.from = { ...edge.from, side: fromSide, offset: fromPoint.offset };
  edge.to = { ...edge.to, side: toSide, offset: toPoint.offset, outletId: outlet.id };
}

function connectedNodeIdSet(nodeIds) {
  const ids = new Set(nodeIds.filter(Boolean));
  let expanded = true;
  while (expanded) {
    expanded = false;
    state.edges.forEach((edge) => {
      if (!ids.has(edge.from.nodeId) && !ids.has(edge.to.nodeId)) return;
      const before = ids.size;
      ids.add(edge.from.nodeId);
      ids.add(edge.to.nodeId);
      expanded = ids.size !== before;
    });
  }
  return ids;
}

function autoPlacePortsForEdges(edges = state.edges) {
  const groups = new Map();

  edges.forEach((edge) => {
    const fromNode = getNode(edge.from.nodeId);
    const toNode = getNode(edge.to.nodeId);
    if (!fromNode || !toNode || fromNode.id === toNode.id) return;

    const fromSide = nearestSide(fromNode, toNode);
    const toSide = nearestSide(toNode, fromNode) || oppositeSide(fromSide);
    addEndpointPlacement(groups, edge, "from", fromNode, fromSide, nodeCenter(toNode));
    addEndpointPlacement(groups, edge, "to", toNode, toSide, nodeCenter(fromNode));
  });

  groups.forEach((items) => {
    items.sort((a, b) => a.sortValue - b.sortValue || a.tieBreak.localeCompare(b.tieBreak));
    const count = items.length;
    const minStep = endpointPlacementMinStep(items[0]);
    const spread = count <= 1 ? 0 : Math.min(0.8, Math.max(0.42 * (count - 1), minStep * (count - 1)));
    const start = 0.5 - spread / 2;
    const step = count <= 1 ? 0 : spread / (count - 1);
    items.forEach((item, index) => {
      const current = item.edge[item.endpoint] || {};
      item.edge[item.endpoint] = {
        ...current,
        nodeId: item.node.id,
        side: item.side,
        offset: clampOffset(start + step * index),
        kind: item.kind,
      };
    });
  });
}

function endpointPlacementMinStep(item) {
  if (!item?.node) return 0.42;
  const horizontalSide = item.side === "left" || item.side === "right";
  const axisSize = horizontalSide ? item.node.h : item.node.w;
  const minPx = horizontalSide ? TERMINAL_MIN_SPACING.horizontal : TERMINAL_MIN_SPACING.vertical;
  if (!axisSize) return 0.42;
  return Math.min(0.8, minPx / axisSize);
}

function addEndpointPlacement(groups, edge, endpoint, node, side, targetCenter) {
  const groupKey = `${node.id}:${side}`;
  const sortValue = side === "left" || side === "right" ? targetCenter.y : targetCenter.x;
  if (!groups.has(groupKey)) groups.set(groupKey, []);
  groups.get(groupKey).push({
    edge,
    endpoint,
    node,
    side,
    sortValue,
    kind: edgeEndpointKind(edge, endpoint),
    tieBreak: `${edge.id}:${endpoint}`,
  });
}

function portPoint(node, port) {
  if (port.side === "left") return { x: node.x, y: node.y + node.h * port.offset };
  if (port.side === "right") return { x: node.x + node.w, y: node.y + node.h * port.offset };
  if (port.side === "top") return { x: node.x + node.w * port.offset, y: node.y };
  return { x: node.x + node.w * port.offset, y: node.y + node.h };
}

function edgeEndpointKind(edge, endpoint) {
  const ref = edge?.[endpoint];
  const node = ref ? getNode(ref.nodeId) : null;
  const port = node ? getPort(node, ref.portId) : null;
  return ref?.kind || port?.kind || (endpoint === "from" ? "xlr-m" : "xlr-f");
}

function edgeEndpointShapeKind(edge, endpoint) {
  const kind = edgeEndpointKind(edge, endpoint);
  if (kind === "xlr-m" || kind === "xlr-f") return "xlr";
  if (kind === "usb") return "usb-b";
  return kind;
}

function edgeEndpointShapeSelectValue(edge, endpoint) {
  const shape = edgeEndpointShapeKind(edge, endpoint);
  return CONNECTOR_SHAPE_OPTIONS.includes(shape) ? shape : "__custom__";
}

function edgeEndpointGender(edge, endpoint) {
  const ref = edge?.[endpoint];
  if (ref && Object.prototype.hasOwnProperty.call(ref, "gender")) return ref.gender;
  const kind = edgeEndpointKind(edge, endpoint);
  if (kind.endsWith("-m")) return "male";
  if (kind.endsWith("-f")) return "female";
  return endpoint === "from" ? "male" : "female";
}

function edgeEndpointSide(edge, endpoint) {
  const ref = edge?.[endpoint];
  const node = ref ? getNode(ref.nodeId) : null;
  const port = node ? getPort(node, ref.portId) : null;
  return ref?.side || port?.side || (endpoint === "from" ? "right" : "left");
}

function edgeEndpointPortLabel(edge, endpoint) {
  const label = edge?.[endpoint]?.label?.trim();
  return label || defaultEndpointPortLabel(edge, endpoint);
}

function defaultEndpointPortLabel(edge, endpoint) {
  const kind = edgeEndpointShapeKind(edge, endpoint);
  const direction = endpoint === "from" ? "out" : "in";
  if (kind === "midi") return `MIDI ${direction}`;
  if (["ts", "trs", "trrs", "mini-ts", "mini-trs", "mini-trrs"].includes(kind)) return `Phone ${direction}`;
  if (["usb", "usb-a", "usb-b", "usb-c", "micro-usb", "lan", "hdmi"].includes(kind)) return `Digital ${direction}`;
  if (kind === "speakon") return `Speaker ${direction}`;
  return `Audio ${direction}`;
}

function ensureEdgeEndpoint(edge, endpoint) {
  if (!edge[endpoint]) edge[endpoint] = {};
  return edge[endpoint];
}

function nodeAnchorPoint(node, ref = {}) {
  const port = getPort(node, ref.portId);
  const side = ref.side || port?.side || "right";
  const fallbackOffset = Number.isFinite(Number(port?.offset)) ? Number(port.offset) : 0.5;
  const offset = Number.isFinite(Number(ref.offset)) ? Number(ref.offset) : fallbackOffset;
  if (side === "left") return { x: node.x, y: node.y + node.h * offset };
  if (side === "right") return { x: node.x + node.w, y: node.y + node.h * offset };
  if (side === "top") return { x: node.x + node.w * offset, y: node.y };
  return { x: node.x + node.w * offset, y: node.y + node.h };
}

function boxAnchorPoint(box, ref = {}) {
  const side = ref.side || "left";
  const offset = Number.isFinite(Number(ref.offset)) ? Number(ref.offset) : 0.5;
  if (side === "left") return { x: box.x, y: box.y + box.h * offset };
  if (side === "right") return { x: box.x + box.w, y: box.y + box.h * offset };
  if (side === "top") return { x: box.x + box.w * offset, y: box.y };
  return { x: box.x + box.w * offset, y: box.y + box.h };
}

function powerEdgeEndpointPoints(edge) {
  const node = getNode(edge?.from?.nodeId);
  const outlet = getPowerOutlet(edge?.to?.outletId);
  if (!node || !outlet) return null;
  const fromSide = edge.from.side || nearestSide(node, outlet);
  const toSide = edge.to.side || nearestSide(outlet, node);
  return {
    from: nodeAnchorPoint(node, { ...edge.from, side: fromSide }),
    to: boxAnchorPoint(outlet, { ...edge.to, side: toSide }),
    fromSide,
    toSide,
  };
}

function edgeEndpointPoints(edge) {
  const fromNode = getNode(edge?.from?.nodeId);
  const toNode = getNode(edge?.to?.nodeId);
  if (!fromNode || !toNode) return null;
  const fromSide = edgeEndpointSide(edge, "from");
  const toSide = edgeEndpointSide(edge, "to");
  const fromAnchor = nodeAnchorPoint(fromNode, edge.from);
  const toAnchor = nodeAnchorPoint(toNode, edge.to);
  return {
    from: fromAnchor,
    to: toAnchor,
    fromSide,
    toSide,
  };
}

function endpointFromPoint(node, point) {
  const distances = [
    { side: "left", value: Math.abs(point.x - node.x), offset: (point.y - node.y) / node.h },
    { side: "right", value: Math.abs(point.x - (node.x + node.w)), offset: (point.y - node.y) / node.h },
    { side: "top", value: Math.abs(point.y - node.y), offset: (point.x - node.x) / node.w },
    { side: "bottom", value: Math.abs(point.y - (node.y + node.h)), offset: (point.x - node.x) / node.w },
  ];
  const nearest = distances.sort((a, b) => a.value - b.value)[0];
  return {
    nodeId: node.id,
    side: nearest.side,
    offset: clampOffset(nearest.offset),
  };
}

function cablePath(from, to, fromSide = "right", toSide = "left") {
  const { p0, c1, c2, p3 } = cableControlPoints(from, to, fromSide, toSide);
  return `M ${p0.x} ${p0.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p3.x} ${p3.y}`;
}

function cablePathSvgElements(d, style, selected = false) {
  if (style.double) {
    const rail = svgEl("path", {
      d,
      class: `patch-cable double-rail ${selected ? "selected" : ""}`,
      stroke: style.color,
      "stroke-width": Math.max(style.width + 5, 7),
      opacity: selected ? "1" : "0.84",
    });
    const gap = svgEl("path", {
      d,
      class: "patch-cable double-gap",
      stroke: "#f8f8f5",
      "stroke-width": Math.max(style.width + 1.2, 3.2),
    });
    return [rail, gap];
  }
  const path = svgEl("path", {
    d,
    class: `patch-cable ${selected ? "selected" : ""}`,
    stroke: style.color,
    "stroke-width": style.width,
    opacity: selected ? "1" : "0.82",
  });
  if (style.dash) path.setAttribute("stroke-dasharray", style.dash);
  return [path];
}

function cablePathMarkup(d, style, opacity = 1) {
  const linecap = `stroke-linecap="round" stroke-linejoin="round"`;
  const opacityAttr = opacity < 1 ? ` opacity="${opacity}"` : "";
  if (style.double) {
    const railWidth = Math.max(style.width + 5, 7);
    const gapWidth = Math.max(style.width + 1.2, 3.2);
    return `<path d="${d}" fill="none" stroke="${style.color}" stroke-width="${railWidth}" ${linecap}${opacityAttr}/><path d="${d}" fill="none" stroke="#ffffff" stroke-width="${gapWidth}" ${linecap}${opacityAttr}/>`;
  }
  const dash = style.dash ? ` stroke-dasharray="${style.dash}"` : "";
  return `<path d="${d}" fill="none" stroke="${style.color}" stroke-width="${style.width}" ${linecap}${dash}${opacityAttr}/>`;
}

function cableDirectionSvgElements(controls, edge, color, selected = false) {
  const direction = edgeSignalDirection(edge);
  if (direction === "none") return [];
  const items =
    direction === "both"
      ? [
          { t: 0.44, reverse: true },
          { t: 0.56, reverse: false },
        ]
      : [{ t: 0.5, reverse: direction === "reverse" }];
  return items.map((item) => cableDirectionArrowSvg(controls, item.t, item.reverse, color, selected));
}

function cableDirectionArrowSvg(controls, t, reverse, color, selected = false) {
  const point = cubicPoint(controls, t);
  const tangent = cubicTangent(controls, t);
  const angle = (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI + (reverse ? 180 : 0);
  const group = svgEl("g", {
    class: `cable-direction-arrow ${selected ? "selected" : ""}`,
    transform: `translate(${point.x} ${point.y}) rotate(${angle})`,
  });
  const halo = svgEl("path", { class: "cable-direction-halo", d: "M -8 -7 L 8 0 L -8 7 Z" });
  const head = svgEl("path", { class: "cable-direction-head", d: "M -7 -5.5 L 7 0 L -7 5.5 Z", fill: color });
  group.append(halo, head);
  return group;
}

function cableDirectionMarkup(controls, edge, color) {
  const direction = edgeSignalDirection(edge);
  if (direction === "none") return "";
  const items =
    direction === "both"
      ? [
          { t: 0.44, reverse: true },
          { t: 0.56, reverse: false },
        ]
      : [{ t: 0.5, reverse: direction === "reverse" }];
  return items
    .map((item) => {
      const point = cubicPoint(controls, item.t);
      const tangent = cubicTangent(controls, item.t);
      const angle = (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI + (item.reverse ? 180 : 0);
      return `<g transform="translate(${point.x} ${point.y}) rotate(${angle})"><path d="M -8 -7 L 8 0 L -8 7 Z" fill="#ffffff" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/><path d="M -7 -5.5 L 7 0 L -7 5.5 Z" fill="${escapeAttr(color)}"/></g>`;
    })
    .join("");
}

function renderPortDragPreview() {
  const drag = state.portDrag;
  if (!drag) return;
  const fromNode = getNode(drag.from.nodeId);
  if (!fromNode) return;
  const targetNode = drag.target ? getNode(drag.target.nodeId) : null;
  const from = nodeAnchorPoint(fromNode, drag.from);
  const to = targetNode && drag.target ? nodeAnchorPoint(targetNode, drag.target) : drag.current;
  const fromSide = drag.from.side || "right";
  const toSide = targetNode && drag.target ? drag.target.side || "left" : sideTowardPoint(to, from);
  const style = { color: "#111111", width: 3, dash: LINE_STYLES.dashed.dash };
  const preview = svgEl("path", {
    d: cablePath(from, to, fromSide, toSide),
    class: "patch-cable preview",
    stroke: style.color,
    "stroke-width": style.width,
  });
  const cursor = svgEl("circle", {
    cx: to.x,
    cy: to.y,
    r: targetNode ? 7 : 5,
    class: `patch-cable-cursor ${targetNode ? "locked" : ""}`,
  });
  if (style.dash) preview.setAttribute("stroke-dasharray", style.dash);
  dom.edgeLayer.append(preview, cursor);
}

function renderPowerDragPreview() {
  const drag = state.powerDrag;
  if (!drag) return;
  const fromNode = getNode(drag.from.nodeId);
  if (!fromNode) return;
  const targetOutlet = drag.target ? getPowerOutlet(drag.target.outletId) : null;
  const from = nodeAnchorPoint(fromNode, drag.from);
  const to = targetOutlet && drag.target ? boxAnchorPoint(targetOutlet, drag.target) : drag.current;
  const fromSide = drag.from.side || "right";
  const toSide = targetOutlet && drag.target ? drag.target.side || "left" : sideTowardPoint(to, from);
  const preview = svgEl("path", {
    d: cablePath(from, to, fromSide, toSide),
    class: "power-cable preview",
    stroke: "#111111",
    "stroke-width": 2.6,
    "stroke-dasharray": "9 6",
  });
  const cursor = svgEl("circle", {
    cx: to.x,
    cy: to.y,
    r: targetOutlet ? 7 : 5,
    class: `patch-cable-cursor ${targetOutlet ? "locked" : ""}`,
  });
  dom.edgeLayer.append(preview, cursor);
}

function connectorTerminalSvg(point, kind, color, selected = false, gender = "") {
  const group = svgEl("g", {
    class: `cable-terminal ${selected ? "selected" : ""}`,
    transform: `translate(${point.x} ${point.y})`,
  });
  const shape = connectorTerminalShape(kind, color, gender);
  group.append(...shape);
  return group;
}

function cableEndChipSvg(point, edge, endpoint, color, selected = false, otherPoint = null) {
  const label = edgeEndpointPortLabel(edge, endpoint);
  const connector = connectorInfoLabel(edgeEndpointKind(edge, endpoint), edgeEndpointGender(edge, endpoint));
  const side = edgeEndpointSide(edge, endpoint);
  const layout = cableEndChipLayout(point, side, label, connector, otherPoint, verticalConnectorSide(edge, endpoint, point, otherPoint));
  const group = svgEl("g", {
    class: `cable-end-chip terminal-badge ${side} ${selected ? "selected" : ""}`,
    transform: `translate(${layout.x} ${layout.y})`,
  });
  const rect = svgEl("rect", { class: "terminal-badge-bg", y: layout.bodyY || 0, width: layout.width, height: layout.height, rx: 14 });
  const icon = svgEl("g", { class: "terminal-badge-icon", transform: `translate(${layout.iconX} ${layout.iconY})` });
  icon.append(...connectorTerminalShape(edgeEndpointKind(edge, endpoint), color, edgeEndpointGender(edge, endpoint)));
  const labelText = svgEl(
    "text",
    {
      class: "terminal-badge-label",
      x: layout.textX,
      y: layout.textY + (layout.bodyY || 0),
      "text-anchor": layout.textAnchor,
      "dominant-baseline": "middle",
      ...(layout.textTransform ? { transform: layout.textTransform } : {}),
      ...chipTextFitAttrs(layout, label),
    },
    label,
  );
  const connectorText = svgEl(
    "text",
    {
      class: "terminal-badge-connector",
      x: layout.connectorX,
      y: layout.connectorY + (layout.bodyY || 0),
      "text-anchor": layout.connectorAnchor,
      "dominant-baseline": "middle",
      ...(layout.connectorTransform ? { transform: layout.connectorTransform } : {}),
      ...connectorTextFitAttrs(connector),
    },
    connector,
  );
  group.append(rect, icon, labelText, connectorText);
  return group;
}

function powerEndChipSvg(point, edge, endpoint, selected = false) {
  const side = endpoint === "from" ? edge.from.side || "right" : edge.to.side || "left";
  const label = powerEdgeLoadLabel(edge);
  const width = Math.max(54, Math.min(86, label.length * 7 + 24));
  const height = 24;
  const x = side === "left" ? point.x - width + 8 : side === "right" ? point.x - 8 : point.x - width / 2;
  const y = side === "top" ? point.y - height + 8 : side === "bottom" ? point.y - 8 : point.y - height / 2;
  const group = svgEl("g", {
    class: `power-end-chip ${selected ? "selected" : ""}`,
    transform: `translate(${x} ${y})`,
  });
  const rect = svgEl("rect", { class: "power-end-chip-bg", width, height, rx: 12 });
  const text = svgEl(
    "text",
    {
      class: "power-end-chip-label",
      x: width / 2,
      y: height / 2 + 0.5,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
    },
    label,
  );
  group.append(rect, text);
  return group;
}

function powerEndChipLayout(point, edge, endpoint) {
  const side = endpoint === "from" ? edge.from.side || "right" : edge.to.side || "left";
  const label = powerEdgeLoadLabel(edge);
  const width = Math.max(54, Math.min(86, label.length * 7 + 24));
  const height = 24;
  const x = side === "left" ? point.x - width + 8 : side === "right" ? point.x - 8 : point.x - width / 2;
  const y = side === "top" ? point.y - height + 8 : side === "bottom" ? point.y - 8 : point.y - height / 2;
  return { x, y, width, height, label };
}

function powerEndChipMarkup(point, edge, endpoint) {
  const layout = powerEndChipLayout(point, edge, endpoint);
  return `
    <g transform="translate(${layout.x} ${layout.y})">
      <rect width="${layout.width}" height="${layout.height}" rx="12" fill="#fff" stroke="#c8c8c8" stroke-width="1"/>
      <text x="${layout.width / 2}" y="${layout.height / 2 + 0.5}" text-anchor="middle" dominant-baseline="middle" fill="#111" font-size="10.5" font-weight="820">${escapeHtml(layout.label)}</text>
    </g>`;
}

function cableEndChipMarkup(point, edge, endpoint, otherPoint = null) {
  const label = edgeEndpointPortLabel(edge, endpoint);
  const connector = connectorInfoLabel(edgeEndpointKind(edge, endpoint), edgeEndpointGender(edge, endpoint));
  const side = edgeEndpointSide(edge, endpoint);
  const layout = cableEndChipLayout(point, side, label, connector, otherPoint, verticalConnectorSide(edge, endpoint, point, otherPoint));
  const fitAttrs = chipTextFitAttrs(layout, label);
  const connectorFitAttrs = connectorTextFitAttrs(connector);
  const fitMarkup = Object.entries(fitAttrs).map(([key, value]) => ` ${key}="${value}"`).join("");
  const connectorFitMarkup = Object.entries(connectorFitAttrs).map(([key, value]) => ` ${key}="${value}"`).join("");
  const labelTransformMarkup = layout.textTransform ? ` transform="${layout.textTransform}"` : "";
  const connectorTransformMarkup = layout.connectorTransform ? ` transform="${layout.connectorTransform}"` : "";
  return `
    <g class="terminal-badge" transform="translate(${layout.x} ${layout.y})">
      <rect y="${layout.bodyY || 0}" width="${layout.width}" height="${layout.height}" rx="14" fill="#fff" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <circle cx="${layout.iconX}" cy="${layout.iconY}" r="8" fill="#fff" stroke="#111" stroke-width="1.5"/>
      <text x="${layout.textX}" y="${layout.textY + (layout.bodyY || 0)}" text-anchor="${layout.textAnchor}" dominant-baseline="middle" fill="#111" font-size="10.5" font-weight="820"${labelTransformMarkup}${fitMarkup}>${escapeHtml(label)}</text>
      <text x="${layout.connectorX}" y="${layout.connectorY + (layout.bodyY || 0)}" text-anchor="${layout.connectorAnchor}" dominant-baseline="middle" fill="#6e6e72" stroke="#ffffff" stroke-width="5" stroke-linejoin="round" paint-order="stroke" font-size="12.5" font-weight="760"${connectorTransformMarkup}${connectorFitMarkup}>${escapeHtml(connector)}</text>
    </g>`;
}

function cableEndChipLayout(point, side = "right", label = "", connector = "", otherPoint = null, connectorSide = "") {
  if (side === "top" || side === "bottom") return verticalCableEndChipLayout(point, side, label, connector, otherPoint, connectorSide);
  const textWidth = label.length * 6.4;
  const width = Math.min(128, Math.max(68, Math.ceil(textWidth + 34)));
  const height = 28;
  const iconR = 8;
  const connectorGap = 14;
  const textCenterY = height / 2 + 1.2;
  if (side === "left") {
    return {
      x: point.x - width + iconR,
      y: point.y - height / 2,
      width,
      height,
      bodyY: 0,
      iconX: width - iconR,
      iconY: height / 2,
      textX: width - iconR * 2 - 7,
      textY: textCenterY,
      textAnchor: "end",
      connectorX: -connectorGap,
      connectorY: textCenterY,
      connectorAnchor: "end",
    };
  }
  return {
    x: point.x - iconR,
    y: point.y - height / 2,
    width,
    height,
    bodyY: 0,
    iconX: iconR,
    iconY: height / 2,
    textX: iconR * 2 + 7,
    textY: textCenterY,
    textAnchor: "start",
    connectorX: width + connectorGap,
    connectorY: textCenterY,
    connectorAnchor: "start",
  };
}

function verticalCableEndChipLayout(point, side, label = "", connector = "", otherPoint = null, connectorSide = "") {
  const iconR = 8;
  const width = 28;
  const height = Math.min(142, Math.max(86, Math.ceil(label.length * 6.4 + 40)));
  const textX = width / 2;
  const cableHeadsRight = otherPoint ? otherPoint.x >= point.x : true;
  const connectorOnLeft = connectorSide ? connectorSide === "left" : cableHeadsRight;
  const connectorX = connectorOnLeft ? -14 : width + 14;
  const connectorAnchor = "middle";
  if (side === "top") {
    const textY = (height - iconR * 2) / 2;
    const connectorY = textY;
    return {
      x: point.x - width / 2,
      y: point.y - height + iconR,
      width,
      height,
      iconX: width / 2,
      iconY: height - iconR,
      textX,
      textY,
      textAnchor: "middle",
      textTransform: `rotate(90 ${textX} ${textY})`,
      connectorX,
      connectorY,
      connectorAnchor,
      connectorTransform: `rotate(90 ${connectorX} ${connectorY})`,
      vertical: true,
    };
  }
  const textY = (height + iconR * 2) / 2;
  const connectorY = textY;
  return {
    x: point.x - width / 2,
    y: point.y - iconR,
    width,
    height,
    iconX: width / 2,
    iconY: iconR,
    textX,
    textY,
    textAnchor: "middle",
    textTransform: `rotate(90 ${textX} ${textY})`,
    connectorX,
    connectorY,
    connectorAnchor,
    connectorTransform: `rotate(90 ${connectorX} ${connectorY})`,
    vertical: true,
  };
}

function verticalConnectorSide(edge, endpoint, point, otherPoint = null) {
  const node = getNode(edge?.[endpoint]?.nodeId);
  if (node) {
    const dx = point.x - nodeCenter(node).x;
    if (Math.abs(dx) > 8) return dx < 0 ? "left" : "right";
  }
  if (otherPoint) return otherPoint.x >= point.x ? "left" : "right";
  return "right";
}

function chipTextFitAttrs(layout, label) {
  const naturalWidth = label.length * 6.4;
  const maxTextWidth = layout.vertical ? layout.height - 34 : layout.width - 34;
  if (naturalWidth <= maxTextWidth) return {};
  return { textLength: Math.max(20, maxTextWidth), lengthAdjust: "spacingAndGlyphs" };
}

function connectorTextFitAttrs(connector) {
  const naturalWidth = connector.length * 7.2;
  if (naturalWidth <= 86) return {};
  return { textLength: 86, lengthAdjust: "spacingAndGlyphs" };
}

function edgeEndpointChipText(edge, endpoint) {
  const connector = connectorInfoLabel(edgeEndpointKind(edge, endpoint), edgeEndpointGender(edge, endpoint));
  const label = edgeEndpointPortLabel(edge, endpoint);
  return label ? `${connector} / ${label}` : connector;
}

function connectorTagLabel(kind) {
  const labels = {
    xlr: "XLR",
    "xlr-m": "XLR",
    "xlr-f": "XLR",
    ts: "TS",
    trs: "TRS",
    "mini-ts": "3.5 TS",
    "mini-trs": "3.5 TRS",
    "mini-trrs": "3.5 TRRS",
    trrs: "3.5 TRRS",
    rca: "RCA",
    usb: "USB-B",
    "usb-a": "USB-A",
    "usb-b": "USB-B",
    "usb-c": "USB-C",
    "micro-usb": "Micro USB",
    lan: "LAN",
    hdmi: "HDMI",
    speakon: "SpeakON",
    midi: "MIDI",
  };
  return labels[kind] || String(kind || "").trim() || "Custom";
}

function connectorInfoLabel(kind, gender = "") {
  const genderChip = connectorGenderLabel(gender, true);
  return genderChip ? `${connectorTagLabel(kind)} ${genderChip}` : connectorTagLabel(kind);
}

function connectorGenderLabel(gender, short = false) {
  if (gender === "male") return short ? "M" : "Male";
  if (gender === "female") return short ? "F" : "Female";
  return "";
}

function connectorTerminalShape(kind, color, gender = "") {
  const normalized = kind === "xlr-m" || kind === "xlr-f" ? "xlr" : kind === "usb" ? "usb-b" : kind;
  const stroke = color || "#111111";
  const pinFill = gender === "female" ? "#fff" : stroke;
  const pinStroke = gender === "female" ? stroke : "none";
  if (["usb-a", "usb-b", "usb-c", "micro-usb", "hdmi"].includes(normalized)) {
    const rx = normalized === "usb-c" ? 5 : normalized === "micro-usb" ? 1.5 : 2;
    const height = normalized === "micro-usb" ? 7 : normalized === "usb-c" ? 8 : 10;
    return [
      svgEl("rect", { x: -7, y: -height / 2, width: 14, height, rx, fill: "#fff", stroke, "stroke-width": 2 }),
      svgEl("line", { x1: -3, y1: 0, x2: 3, y2: 0, stroke, "stroke-width": 1.5 }),
    ];
  }
  if (normalized === "lan") {
    return [
      svgEl("rect", { x: -7, y: -6, width: 14, height: 12, rx: 1.5, fill: "#fff", stroke, "stroke-width": 2 }),
      svgEl("path", { d: "M -4 -2h8v5h-8Z", fill: "none", stroke, "stroke-width": 1.2 }),
      svgEl("path", { d: "M -4 -5v3M -1 -5v3M 2 -5v3M 5 -5v3", stroke, "stroke-width": 1 }),
    ];
  }
  if (normalized === "rca") {
    return [
      svgEl("circle", { cx: 0, cy: 0, r: 7, fill: "#fff", stroke, "stroke-width": 2 }),
      svgEl("circle", { cx: 0, cy: 0, r: gender === "male" ? 2.2 : 2.8, fill: gender === "male" ? stroke : "none", stroke, "stroke-width": 1.5 }),
    ];
  }
  if (normalized === "midi") {
    return [
      svgEl("path", { d: "M -7 3 A 7 7 0 0 1 7 3 L 7 7 L -7 7 Z", fill: "#fff", stroke, "stroke-width": 2 }),
      svgEl("circle", { cx: -3, cy: 2, r: 1, fill: stroke }),
      svgEl("circle", { cx: 3, cy: 2, r: 1, fill: stroke }),
    ];
  }
  if (normalized === "speakon") {
    return [
      svgEl("circle", { cx: 0, cy: 0, r: 7, fill: "#fff", stroke, "stroke-width": 2 }),
      svgEl("rect", { x: -3.5, y: -3.5, width: 7, height: 7, fill: "none", stroke, "stroke-width": 1.5 }),
    ];
  }
  if (["ts", "trs", "trrs", "mini-ts", "mini-trs", "mini-trrs"].includes(normalized)) {
    const ringCount = normalized === "ts" || normalized === "mini-ts" ? 1 : normalized === "trs" || normalized === "mini-trs" ? 2 : 3;
    return [
      svgEl("circle", { cx: 0, cy: 0, r: 7, fill: "#fff", stroke, "stroke-width": 2 }),
      svgEl("line", { x1: -4, y1: 0, x2: 4, y2: 0, stroke, "stroke-width": 1.8 }),
      ...Array.from({ length: ringCount }, (_, index) => {
        const x = ringCount === 1 ? 0 : -2 + index * 2;
        return svgEl("line", { x1: x, y1: -4, x2: x, y2: 4, stroke, "stroke-width": 1.2 });
      }),
    ];
  }
  return [
    svgEl("circle", { cx: 0, cy: 0, r: 7, fill: "#fff", stroke, "stroke-width": 2 }),
    svgEl("circle", { cx: -3, cy: -2, r: gender === "female" ? 1.45 : 1, fill: pinFill, stroke: pinStroke, "stroke-width": 1 }),
    svgEl("circle", { cx: 3, cy: -2, r: gender === "female" ? 1.45 : 1, fill: pinFill, stroke: pinStroke, "stroke-width": 1 }),
    svgEl("circle", { cx: 0, cy: 3, r: gender === "female" ? 1.45 : 1, fill: pinFill, stroke: pinStroke, "stroke-width": 1 }),
  ];
}

function sideNormal(side = "right") {
  if (side === "left") return { x: -1, y: 0 };
  if (side === "top") return { x: 0, y: -1 };
  if (side === "bottom") return { x: 0, y: 1 };
  return { x: 1, y: 0 };
}

function sideTowardPoint(origin, target) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "top" : "bottom";
}

function cableControlPoints(from, to, fromSide = "right", toSide = "left") {
  const span = Math.hypot(to.x - from.x, to.y - from.y);
  const handle = Math.min(220, Math.max(76, span * 0.34));
  const fromNormal = sideNormal(fromSide);
  const toNormal = sideNormal(toSide);
  return {
    p0: from,
    c1: { x: from.x + fromNormal.x * handle, y: from.y + fromNormal.y * handle },
    c2: { x: to.x + toNormal.x * handle, y: to.y + toNormal.y * handle },
    p3: to,
  };
}

function cubicPoint({ p0, c1, c2, p3 }, t) {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * p3.y,
  };
}

function cubicTangent({ p0, c1, c2, p3 }, t) {
  const mt = 1 - t;
  return {
    x: 3 * mt ** 2 * (c1.x - p0.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t ** 2 * (p3.x - c2.x),
    y: 3 * mt ** 2 * (c1.y - p0.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t ** 2 * (p3.y - c2.y),
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestEdgeToPoint(point) {
  let nearest = null;
  state.edges.forEach((edge) => {
    const endpoints = edgeEndpointPoints(edge);
    if (!endpoints) return;
    const controls = cableControlPoints(endpoints.from, endpoints.to, endpoints.fromSide, endpoints.toSide);
    for (let i = 0; i <= 32; i += 1) {
      const sample = cubicPoint(controls, i / 32);
      const d = distance(point, sample);
      if (!nearest || d < nearest.distance) nearest = { edge, distance: d };
    }
  });
  return nearest;
}

function selectNearestEdgeAt(clientX, clientY) {
  const point = screenToWorld(clientX, clientY);
  const nearest = nearestEdgeToPoint(point);
  if (!nearest || nearest.distance > 24 / state.viewport.scale) return false;
  state.selectedEdge = nearest.edge.id;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.selected = new Set();
  state.portPopover = null;
  render();
  return true;
}

function findPortAtClientPoint(clientX, clientY, exclude = {}) {
  let nearest = null;
  $$(".port").forEach((portEl) => {
    const nodeId = portEl.dataset.nodeId;
    const portId = portEl.dataset.portId;
    if (nodeId === exclude.nodeId || (nodeId === exclude.nodeId && portId === exclude.portId)) return;
    const rect = portEl.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const inside =
      clientX >= rect.left - 10 &&
      clientX <= rect.right + 10 &&
      clientY >= rect.top - 10 &&
      clientY <= rect.bottom + 10;
    const d = Math.hypot(clientX - center.x, clientY - center.y);
    const score = inside ? d * 0.2 : d;
    if (!nearest || score < nearest.score) nearest = { nodeId, portId, element: portEl, distance: d, score, inside };
  });
  if (!nearest || (!nearest.inside && nearest.distance > 42)) return null;
  return { nodeId: nearest.nodeId, portId: nearest.portId };
}

function findConnectionTargetAtClientPoint(clientX, clientY, sourceNodeId) {
  const point = screenToWorld(clientX, clientY);
  let nearest = null;
  $$(".gear-node").forEach((nodeEl) => {
    const nodeId = nodeEl.dataset.nodeId;
    if (!nodeId || nodeId === sourceNodeId) return;
    const rect = nodeEl.getBoundingClientRect();
    const inside =
      clientX >= rect.left - 16 &&
      clientX <= rect.right + 16 &&
      clientY >= rect.top - 16 &&
      clientY <= rect.bottom + 16;
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const distance = Math.hypot(clientX - center.x, clientY - center.y);
    const score = inside ? distance * 0.2 : distance;
    if (!nearest || score < nearest.score) nearest = { nodeId, inside, distance, score };
  });
  if (!nearest || (!nearest.inside && nearest.distance > 74)) return null;
  const node = getNode(nearest.nodeId);
  if (!node) return null;
  const endpoint = endpointFromPoint(node, point);
  endpoint.kind = "xlr-f";
  return endpoint;
}

function findPowerOutletTargetAtClientPoint(clientX, clientY) {
  const point = screenToWorld(clientX, clientY);
  let nearest = null;
  $$(".power-outlet").forEach((outletEl) => {
    const outletId = outletEl.dataset.outletId;
    const rect = outletEl.getBoundingClientRect();
    const inside =
      clientX >= rect.left - 18 &&
      clientX <= rect.right + 18 &&
      clientY >= rect.top - 18 &&
      clientY <= rect.bottom + 18;
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const distance = Math.hypot(clientX - center.x, clientY - center.y);
    const score = inside ? distance * 0.2 : distance;
    if (!nearest || score < nearest.score) nearest = { outletId, inside, distance, score };
  });
  if (!nearest || (!nearest.inside && nearest.distance > 84)) return null;
  const outlet = getPowerOutlet(nearest.outletId);
  if (!outlet) return null;
  const endpoint = endpointFromPoint(outlet, point);
  return {
    outletId: outlet.id,
    side: endpoint.side,
    offset: endpoint.offset,
  };
}

function syncPowerOutletDropTarget() {
  $$(".power-outlet.drop-target").forEach((outletEl) => outletEl.classList.remove("drop-target"));
  const target = state.powerDrag?.target;
  if (!target) return;
  const outletEl = $$(".power-outlet").find((item) => item.dataset.outletId === target.outletId);
  outletEl?.classList.add("drop-target");
}

function syncNodeDropTarget() {
  $$(".gear-node.drop-target").forEach((nodeEl) => nodeEl.classList.remove("drop-target"));
  $$(".quick-handle.drop-target").forEach((handle) => handle.classList.remove("drop-target"));
  const target = state.portDrag?.target;
  if (!target) return;
  const nodeEl = $$(".gear-node").find((item) => item.dataset.nodeId === target.nodeId);
  nodeEl?.classList.add("drop-target");
  nodeEl?.querySelector(`.quick-handle.${target.side}`)?.classList.add("drop-target");
}

function syncPortDropTarget() {
  $$(".port.drop-target").forEach((portEl) => portEl.classList.remove("drop-target"));
  const target = state.portDrag?.target;
  if (!target) return;
  const portEl = $$(".port").find((item) => item.dataset.nodeId === target.nodeId && item.dataset.portId === target.portId);
  portEl?.classList.add("drop-target");
}

function svgEl(name, attrs = {}, text = "") {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  if (text) el.textContent = text;
  return el;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function normalizeColor(color) {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = color || "#111111";
  return ctx.fillStyle;
}

function filename(ext, suffix = "") {
  const date = new Date().toISOString().slice(0, 10);
  const safe = state.name.replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "") || "project";
  const suffixPart = suffix ? `_${suffix}` : "";
  return `${FILE_PREFIX}_${safe}${suffixPart}_${date}.${ext}`;
}

function exportSourceUrl() {
  return window.location?.href || "https://gearpatch.datafruits.fm/";
}

function truncateMiddleText(value, length = 96) {
  const text = String(value || "");
  if (text.length <= length) return text;
  const head = Math.ceil((length - 3) * 0.62);
  const tail = Math.max(8, length - 3 - head);
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function exportFooterMarkup(x, y, width, height, options = {}) {
  const fontSize = options.fontSize || 9;
  const label = options.label || exportSourceUrl();
  const maxChars = Math.max(48, Math.floor(width / (fontSize * 0.62)));
  return `<text x="${x + width - 10}" y="${y + height - 10}" font-size="${fontSize}" fill="#777" text-anchor="end">${escapeHtml(truncateMiddleText(label, maxChars))}</text>`;
}

function downloadText(text, ext, type, suffix = "") {
  const blob = new Blob([text], { type });
  downloadBlob(blob, ext, suffix);
}

function downloadBlob(blob, ext, suffix = "") {
  const fileName = filename(ext, suffix);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  toastDownloadLink(url, fileName);
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 60000);
}

function downloadJson() {
  persist();
  downloadText(JSON.stringify(exportData(), null, 2), "json", "application/json");
  toast("JSON saved");
}

async function buildExportSvgAsync(options = {}) {
  await ensureExportIconData();
  return buildExportSvg(options);
}

async function buildExportSvgForLayerAsync(layer, options = {}) {
  await ensureExportIconData();
  const previousLayer = state.activeLayer;
  state.activeLayer = layer === "power" ? "power" : "signal";
  try {
    return buildExportSvg(options);
  } finally {
    state.activeLayer = previousLayer;
  }
}

function buildExportSvg(options = {}) {
  const includeNodes = options.includeNodes !== false;
  const isPowerLayer = state.activeLayer === "power";
  const bounds = contentBounds();
  const pad = options.pad ?? 80;
  const x = bounds.x - pad;
  const y = bounds.y - pad;
  const w = bounds.w + pad * 2;
  const h = bounds.h + pad * 2;
  const edgePathMarkup = state.edges
    .map((edge) => {
      const endpoints = edgeEndpointPoints(edge);
      if (!endpoints) return "";
      const style = cableVisualStyle(edge);
      const controls = cableControlPoints(endpoints.from, endpoints.to, endpoints.fromSide, endpoints.toSide);
      const path = cablePath(endpoints.from, endpoints.to, endpoints.fromSide, endpoints.toSide);
      if (isPowerLayer) return cablePathMarkup(path, { ...style, color: "#111111", width: Math.max(1.2, style.width), dash: style.dash, double: false }, 0.07);
      return `${cablePathMarkup(path, style)}${cableDirectionMarkup(controls, edge, style.color)}`;
    })
    .join("");
  const terminalMarkup = state.edges
    .map((edge) => {
      const endpoints = edgeEndpointPoints(edge);
      if (!endpoints || isPowerLayer) return "";
      return `${cableEndChipMarkup(endpoints.from, edge, "from", endpoints.to)}${cableEndChipMarkup(endpoints.to, edge, "to", endpoints.from)}`;
    })
    .join("");
  const powerEdgeMarkup = isPowerLayer
    ? state.powerEdges
        .map((edge) => {
          const endpoints = powerEdgeEndpointPoints(edge);
          if (!endpoints) return "";
          const path = cablePath(endpoints.from, endpoints.to, endpoints.fromSide, endpoints.toSide);
          return `<path d="${path}" fill="none" stroke="#111111" stroke-width="2.6" stroke-dasharray="9 6" stroke-linecap="round" stroke-linejoin="round"/>`;
        })
        .join("")
    : "";
  const powerTerminalMarkup = isPowerLayer
    ? state.powerEdges
        .map((edge) => {
          const endpoints = powerEdgeEndpointPoints(edge);
          if (!endpoints) return "";
          return powerEndChipMarkup(endpoints.from, edge, "from");
        })
        .join("")
    : "";
  const nodeMarkup = state.nodes
    .map((node) => {
      const iconSize = 30;
      const iconBoxSize = 34;
      const iconBoxX = node.x + 12;
      const iconBoxY = node.y + 14;
      const iconX = iconBoxX + (iconBoxSize - iconSize) / 2;
      const iconY = iconBoxY + (iconBoxSize - iconSize) / 2;
      const textX = node.x + 58;
      const displayTitle = gearDisplayName(node);
      const displaySubtitle = node.title?.trim() ? node.subtitle : "";
      return `
        <g>
          <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="8" fill="#f8f8f5" stroke="#111" stroke-width="1.4"/>
          <rect x="${iconBoxX}" y="${iconBoxY}" width="${iconBoxSize}" height="${iconBoxSize}" rx="7" fill="#ffffff" fill-opacity="0.62" stroke="#000000" stroke-opacity="0.18" stroke-width="1"/>
          ${exportIconSvg(node.icon, iconX, iconY, iconSize)}
          <text x="${textX}" y="${node.y + 30}" font-size="14" font-weight="800">${escapeHtml(displayTitle)}</text>
          ${displaySubtitle ? `<text x="${textX}" y="${node.y + 48}" font-size="10" fill="#666">${escapeHtml(displaySubtitle)}</text>` : ""}
          ${isPowerLayer ? `<text x="${node.x + node.w - 12}" y="${node.y + node.h - 12}" text-anchor="end" font-size="10" font-weight="760" fill="#666">${escapeHtml(formatWatts(nodePowerWatts(node)))}</text>` : ""}
        </g>`;
    })
    .join("");
  const powerOutletMarkup = isPowerLayer
    ? state.powerOutlets
        .map(
          (outlet) => `
        <g>
          <rect x="${outlet.x}" y="${outlet.y}" width="${outlet.w}" height="${outlet.h}" rx="8" fill="#f8f8f5" stroke="#111" stroke-width="1.4"/>
          <rect x="${outlet.x + 12}" y="${outlet.y + 18}" width="28" height="28" rx="7" fill="#ffffff" fill-opacity="0.62" stroke="#000000" stroke-opacity="0.18" stroke-width="1"/>
          <path d="M${outlet.x + 22} ${outlet.y + 24}v-7M${outlet.x + 32} ${outlet.y + 24}v-7M${outlet.x + 18} ${outlet.y + 30}h18M${outlet.x + 22} ${outlet.y + 30}v4a5 5 0 0 0 10 0v-4M${outlet.x + 27} ${outlet.y + 39}v5" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="${outlet.x + 52}" y="${outlet.y + 34}" font-size="14" font-weight="800">${escapeHtml(outlet.name || "AC Outlet")}</text>
          <text x="${outlet.x + 52}" y="${outlet.y + 52}" font-size="10" fill="#666">${escapeHtml(powerOutletTotalLabel(outlet))}</text>
        </g>`,
        )
        .join("")
    : "";
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff"/>
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e7e7e2" stroke-width="1"/>
        </pattern>
      </defs>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#grid)"/>
      ${edgePathMarkup}
      ${powerEdgeMarkup}
      ${includeNodes ? nodeMarkup : ""}
      ${includeNodes ? powerOutletMarkup : ""}
      ${terminalMarkup}
      ${powerTerminalMarkup}
      ${exportPageTitleMarkup(x, y, options)}
      ${exportFooterMarkup(x, y, w, h)}
    </svg>
  `.trim();
}

function exportPageTitleMarkup(x, y, options = {}) {
  if (!options.pageTitle) return "";
  const title = String(options.pageTitle);
  const subtitle = state.name ? ` · ${state.name}` : "";
  return `
    <text x="${x + 14}" y="${y + 30}" font-size="18" font-weight="900" fill="#111">${escapeHtml(title)}</text>
    <text x="${x + 14 + title.length * 11}" y="${y + 30}" font-size="12" font-weight="700" fill="#666">${escapeHtml(subtitle)}</text>
  `;
}

function contentBounds() {
  const boxes = [...state.nodes, ...(state.activeLayer === "power" ? state.powerOutlets : [])];
  if (!boxes.length) return { x: 0, y: 0, w: 1200, h: 800 };
  const minX = Math.min(...boxes.map((node) => node.x));
  const minY = Math.min(...boxes.map((node) => node.y));
  const maxX = Math.max(...boxes.map((node) => node.x + node.w));
  const maxY = Math.max(...boxes.map((node) => node.y + node.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

async function downloadSvg() {
  try {
    downloadText(await buildExportSvgForLayerAsync("signal"), "svg", "image/svg+xml", "signal");
    downloadText(await buildExportSvgForLayerAsync("power"), "svg", "image/svg+xml", "power");
    toast("SVG exported: Signal + Power");
  } catch (error) {
    console.error(error);
    toast("Could not export SVG");
  }
}

async function pngBlobFromSvg(svg) {
  let svgUrl = "";
  try {
    const image = new Image();
    svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    image.src = svgUrl;
    await image.decode();
    const ratio = 2.5;
    const canvas = document.createElement("canvas");
    canvas.width = image.width * ratio;
    canvas.height = image.height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(ratio, ratio);
    ctx.drawImage(image, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not render PNG");
    return blob;
  } finally {
    if (svgUrl) URL.revokeObjectURL(svgUrl);
  }
}

async function downloadPng() {
  try {
    const signalSvg = await buildExportSvgForLayerAsync("signal");
    const powerSvg = await buildExportSvgForLayerAsync("power");
    downloadBlob(await pngBlobFromSvg(signalSvg), "png", "signal");
    downloadBlob(await pngBlobFromSvg(powerSvg), "png", "power");
    toast("PNG exported: Signal + Power");
  } catch (error) {
    console.error(error);
    toast("Could not export PNG");
  }
}

function truncateText(value, length = 52) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length - 1)}...` : text;
}

function buildInputListSvg(rows) {
  const width = 1600;
  const rowH = 54;
  const tableX = 44;
  const tableY = 168;
  const tableW = width - tableX * 2;
  const height = Math.max(1000, tableY + 82 + Math.max(1, rows.length) * rowH);
  const columns = [
    { label: "Ch", x: tableX, w: 70 },
    { label: "Source", x: tableX + 70, w: 360 },
    { label: "Connector", x: tableX + 430, w: 500 },
    { label: "To", x: tableX + 930, w: 300 },
    { label: "Notes", x: tableX + 1230, w: tableW - 1230 },
  ];
  const bodyRows = rows.length
    ? rows
        .map((row, index) => {
          const y = tableY + 46 + index * rowH;
          return `
            <rect x="${tableX}" y="${y}" width="${tableW}" height="${rowH}" fill="${index % 2 ? "#ffffff" : "#f7f7f4"}" stroke="#111" stroke-width="1"/>
            <text x="${columns[0].x + 14}" y="${y + 33}" font-size="18" font-weight="800">${escapeHtml(row.ch)}</text>
            <text x="${columns[1].x + 14}" y="${y + 33}" font-size="18" font-weight="800">${escapeHtml(truncateText(row.source, 34))}</text>
            <text x="${columns[2].x + 14}" y="${y + 33}" font-size="16">${escapeHtml(truncateText(row.connector, 48))}</text>
            <text x="${columns[3].x + 14}" y="${y + 33}" font-size="16">${escapeHtml(truncateText(row.to, 30))}</text>
            <text x="${columns[4].x + 14}" y="${y + 33}" font-size="16">${escapeHtml(truncateText(row.notes, 28))}</text>
          `;
        })
        .join("")
    : `<text x="${tableX}" y="${tableY + 92}" font-size="22" fill="#666">No cables connected yet.</text>`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>
      <text x="44" y="66" font-size="34" font-weight="900">Input List</text>
      <text x="44" y="104" font-size="18" fill="#666">${escapeHtml(state.name || APP_NAME)} · ${escapeHtml(new Date().toLocaleString("en-US"))}</text>
      <text x="44" y="132" font-size="18" fill="#666">${escapeHtml(truncateText(state.notes || "No notes", 120))}</text>
      <rect x="${tableX}" y="${tableY}" width="${tableW}" height="46" fill="#111"/>
      ${columns.map((col) => `<text x="${col.x + 14}" y="${tableY + 33}" font-size="19" font-weight="800" fill="#fff">${escapeHtml(col.label)}</text>`).join("")}
      ${columns.slice(1).map((col) => `<path d="M${col.x} ${tableY}v${46 + Math.max(1, rows.length) * rowH}" stroke="#111" stroke-width="1"/>`).join("")}
      ${bodyRows}
      ${exportFooterMarkup(0, 0, width, height, { fontSize: 14 })}
    </svg>
  `.trim();
}

function bytesToBinaryString(bytes) {
  const chunks = [];
  for (let index = 0; index < bytes.length; index += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + 8192)));
  }
  return chunks.join("");
}

function binaryStringToBytes(binary) {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index) & 255;
  return bytes;
}

function pdfStream(dict, data) {
  return `<< ${dict} /Length ${data.length} >>\nstream\n${data}\nendstream`;
}

function buildPdf(objects, rootId) {
  let body = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = body.length;
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    body += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root ${rootId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([binaryStringToBytes(body)], { type: "application/pdf" });
}

function buildPdfFromImages(images) {
  const pageW = 841.89;
  const pageH = 595.28;
  const margin = 11.34;
  const objects = [];
  const addObject = (content = "") => {
    objects.push(content);
    return objects.length;
  };
  const pagesId = addObject();
  const catalogId = addObject();
  const pageIds = [];
  images.forEach((image, index) => {
    const imageId = addObject(
      pdfStream(
        `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
        image.binary,
      ),
    );
    const usableW = pageW - margin * 2;
    const usableH = pageH - margin * 2;
    const scale = Math.min(usableW / image.width, usableH / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;
    const content = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im${index + 1} Do\nQ`;
    const contentId = addObject(pdfStream("", content));
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  });
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  return buildPdf(objects, catalogId);
}

async function svgToJpegImage(svg, maxSide = 3600) {
  const image = new Image();
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  image.src = svgUrl;
  await image.decode();
  const scale = Math.max(1, Math.min(2.5, maxSide / Math.max(image.width, image.height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(image, 0, 0);
  URL.revokeObjectURL(svgUrl);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
  if (!blob) throw new Error("Could not render PDF image");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {
    binary: bytesToBinaryString(bytes),
    width: canvas.width,
    height: canvas.height,
  };
}

async function downloadPdf() {
  try {
    const rows = makeInputRows();
    const signalImage = await svgToJpegImage(await buildExportSvgForLayerAsync("signal", { pad: 56, pageTitle: "Signal" }), 3800);
    const powerImage = await svgToJpegImage(await buildExportSvgForLayerAsync("power", { pad: 56, pageTitle: "Power" }), 3800);
    const inputListImage = await svgToJpegImage(buildInputListSvg(rows), 2800);
    const pdf = buildPdfFromImages([signalImage, powerImage, inputListImage]);
    downloadBlob(pdf, "pdf");
    toast("PDF downloaded: Signal + Power");
  } catch (error) {
    console.error(error);
    toast("Could not generate PDF");
  }
}

function preparePrint() {
  const rows = makeInputRows();
  dom.printTitle.textContent = state.name || APP_NAME;
  dom.printMeta.textContent = `Generated ${new Date().toLocaleString("en-US")} · ${state.nodes.length} gear · ${state.edges.length} cables`;
  dom.printNotes.textContent = state.notes || "No notes";
  dom.printDiagram.innerHTML = buildExportSvg({ pad: 24 });
  dom.printInputRows.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td>${row.ch}</td>
        <td>${escapeHtml(row.source)}</td>
        <td>${escapeHtml(row.connector)}</td>
        <td>${escapeHtml(row.to)}</td>
        <td>${escapeHtml(row.notes)}</td>
      </tr>
    `,
    )
    .join("");
}

function clearAll() {
  if (!confirm("Delete all gear and cables?")) return;
  state.nodes = [];
  state.edges = [];
  state.powerOutlets = [];
  state.powerEdges = [];
  state.selected = new Set();
  state.selectedEdge = null;
  state.selectedPowerEdge = null;
  state.selectedPowerOutlet = null;
  state.connecting = null;
  state.portDrag = null;
  state.powerDrag = null;
  state.portPopover = null;
  commit("Cleared canvas");
  toast("Canvas cleared");
}

function undo() {
  if (state.history.length < 2) return;
  state.future.push(state.history.pop());
  const previous = state.history[state.history.length - 1];
  restoreSnapshot(previous);
  toast("Undo");
}

function redo() {
  if (!state.future.length) return;
  const next = state.future.pop();
  state.history.push(next);
  restoreSnapshot(next);
  toast("Redo");
}

function deleteSelected() {
  const ids = new Set(state.selected);
  if (!ids.size && state.selectedPowerEdge) {
    state.powerEdges = state.powerEdges.filter((edge) => edge.id !== state.selectedPowerEdge);
    state.selectedPowerEdge = null;
    state.powerDrag = null;
    commit("Deleted power cable");
    return;
  }
  if (!ids.size && state.selectedPowerOutlet) {
    state.powerOutlets = state.powerOutlets.filter((outlet) => outlet.id !== state.selectedPowerOutlet);
    state.powerEdges = state.powerEdges.filter((edge) => edge.to.outletId !== state.selectedPowerOutlet);
    state.selectedPowerOutlet = null;
    state.powerDrag = null;
    commit("Deleted power outlet");
    return;
  }
  if (!ids.size && state.selectedEdge) {
    state.edges = state.edges.filter((edge) => edge.id !== state.selectedEdge);
    state.selectedEdge = null;
    state.connecting = null;
    state.portDrag = null;
    state.portPopover = null;
    commit("Deleted cable");
    return;
  }
  state.nodes = state.nodes.filter((node) => !ids.has(node.id));
  state.edges = state.edges.filter((edge) => !ids.has(edge.from.nodeId) && !ids.has(edge.to.nodeId));
  state.powerEdges = state.powerEdges.filter((edge) => !ids.has(edge.from.nodeId));
  state.selected = new Set();
  state.connecting = null;
  state.portDrag = null;
  state.powerDrag = null;
  state.portPopover = null;
  commit("Deleted selection");
}

function copySelection() {
  const ids = new Set(state.selected);
  const nodes = state.nodes.filter((node) => ids.has(node.id));
  if (!nodes.length) {
    toast("Select gear to copy.");
    return;
  }
  const edges = state.edges.filter((edge) => ids.has(edge.from.nodeId) && ids.has(edge.to.nodeId));
  const payload = {
    format: "gearpatch.selection",
    version: VERSION,
    nodes: clone(nodes),
    edges: clone(edges),
    pasteCount: 0,
  };
  state.clipboard = payload;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(JSON.stringify(payload)).catch(() => {});
  }
  toast(`Copied ${nodes.length} ${nodes.length === 1 ? "piece of gear" : "pieces of gear"}.`);
}

async function pasteSelection() {
  let payload = state.clipboard;
  if (!payload && navigator.clipboard?.readText) {
    try {
      const parsed = JSON.parse(await navigator.clipboard.readText());
      if (parsed?.format === "gearpatch.selection" || parsed?.format === "gearflow.selection") payload = parsed;
    } catch {
      payload = null;
    }
  }
  if (!payload?.nodes?.length) {
    toast("No gear available to paste.");
    return;
  }

  payload.pasteCount = (payload.pasteCount || 0) + 1;
  state.clipboard = payload;

  const offset = GRID_SIZE * 2 * payload.pasteCount;
  const nodeIdMap = new Map();
  const portIdMap = new Map();
  const newNodes = payload.nodes.map((node) => {
    const nextNode = clone(node);
    const newNodeId = uid("node");
    nodeIdMap.set(node.id, newNodeId);
    nextNode.id = newNodeId;
    const position = snapNodePosition(nextNode, nextNode.x + offset, nextNode.y + offset);
    nextNode.x = position.x;
    nextNode.y = position.y;
    nextNode.ports = nextNode.ports.map((port) => {
      const nextPort = { ...port, id: uid("port") };
      portIdMap.set(`${node.id}:${port.id}`, nextPort.id);
      return nextPort;
    });
    return nextNode;
  });

  const newEdges = (payload.edges || [])
    .map((edge) => {
      const fromNodeId = nodeIdMap.get(edge.from.nodeId);
      const toNodeId = nodeIdMap.get(edge.to.nodeId);
      if (!fromNodeId || !toNodeId) return null;
      const fromPortId = edge.from.portId ? portIdMap.get(`${edge.from.nodeId}:${edge.from.portId}`) : null;
      const toPortId = edge.to.portId ? portIdMap.get(`${edge.to.nodeId}:${edge.to.portId}`) : null;
      if ((edge.from.portId && !fromPortId) || (edge.to.portId && !toPortId)) return null;
      return {
        ...clone(edge),
        id: uid("edge"),
        from: { ...edge.from, nodeId: fromNodeId, ...(fromPortId ? { portId: fromPortId } : {}) },
        to: { ...edge.to, nodeId: toNodeId, ...(toPortId ? { portId: toPortId } : {}) },
      };
    })
    .filter(Boolean);

  state.nodes.push(...newNodes);
  state.edges.push(...newEdges);
  autoPlaceConnectedPortsForNodeIds(newNodes.map((node) => node.id));
  state.selected = new Set(newNodes.map((node) => node.id));
  state.selectedEdge = null;
  commit(`Pasted ${newNodes.length} ${newNodes.length === 1 ? "piece of gear" : "pieces of gear"}`);
}

function alignSelected(axis) {
  const selected = state.nodes.filter((node) => state.selected.has(node.id));
  if (selected.length < 2) return;
  const value = Math.min(...selected.map((node) => (axis === "x" ? node.x : node.y)));
  selected.forEach((node) => {
    if (axis === "x") node.x = value;
    else node.y = value;
  });
  autoPlaceConnectedPortsForNodeIds(selected.map((node) => node.id));
  commit(axis === "x" ? "Aligned left" : "Aligned top");
}

function alignSelectedCenter(axis) {
  const selected = state.nodes.filter((node) => state.selected.has(node.id));
  if (selected.length < 2) return;
  const centers = selected.map((node) => (axis === "x" ? node.x + node.w / 2 : node.y + node.h / 2));
  const center = centers.reduce((sum, value) => sum + value, 0) / centers.length;
  selected.forEach((node) => {
    if (axis === "x") node.x = Math.round((center - node.w / 2) / GRID_SIZE) * GRID_SIZE;
    else node.y = Math.round((center - node.h / 2) / GRID_SIZE) * GRID_SIZE;
  });
  autoPlaceConnectedPortsForNodeIds(selected.map((node) => node.id));
  commit(axis === "x" ? "Aligned horizontal centers" : "Aligned vertical centers");
}

function showHistory() {
  closeMenus();
  const versions = readVersions();
  dom.historyList.innerHTML = versions.length
    ? versions
        .map(
          (item) => `
        <div class="history-item">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <span>${new Date(item.savedAt).toLocaleString("en-US")} · ${item.nodes} nodes · ${item.edges} cables</span>
          </div>
          <button class="text-button" data-restore-version="${item.id}">Restore</button>
        </div>
      `,
        )
        .join("")
    : `<div class="empty-state"><span>No history yet.</span></div>`;
  dom.historyDialog.showModal();
}

function closeMenus(except = null) {
  $$(".menu-wrap").forEach((wrap) => {
    if (wrap === except) return;
    wrap.querySelector("[data-menu]")?.classList.add("hidden");
    wrap.querySelector("[data-menu-button]")?.setAttribute("aria-expanded", "false");
  });
}

function toggleMenu(wrap) {
  const menu = wrap.querySelector("[data-menu]");
  const button = wrap.querySelector("[data-menu-button]");
  const open = menu.classList.contains("hidden");
  if (open && window.matchMedia("(max-width: 820px)").matches) {
    const topbar = $(".topbar").getBoundingClientRect();
    document.documentElement.style.setProperty("--mobile-menu-top", `${Math.round(topbar.bottom + 6)}px`);
  }
  closeMenus(open ? wrap : null);
  menu.classList.toggle("hidden", !open);
  button.setAttribute("aria-expanded", String(open));
}

function showDocumentDialog() {
  closeMenus();
  updateStorageMeter();
  dom.documentDialog.showModal();
}

function showInputListDialog() {
  closeMenus();
  renderInputList();
  dom.inputListDialog.showModal();
}

function showAboutDialog() {
  closeMenus();
  if (!dom.aboutDialog.open) dom.aboutDialog.showModal();
}

function autoPlaceAllEdges() {
  closeMenus();
  if (state.activeLayer === "power") {
    autoPlacePowerEdgesForNodeIds(state.nodes.map((node) => node.id));
  } else {
    autoPlacePortsForEdges();
  }
  renderEdges();
  renderNodes();
  renderPowerOutlets();
  renderInputList();
  renderInspector();
  renderMinimap();
  scheduleAutosave("Autosaved");
  toast(state.activeLayer === "power" ? "Power endpoints auto-placed" : "Cable endpoints auto-placed");
}

function showStartDialog() {
  closeMenus();
  if (!confirmReplaceCurrentFlow("Start a new flow? The current gear and cables will be replaced after you choose an option.")) return;
  state.pendingNewConfirmed = true;
  if (!dom.startDialog.open) dom.startDialog.showModal();
}

function closeStartDialog() {
  state.pendingNewConfirmed = false;
  if (dom.startDialog.open) dom.startDialog.close();
}

function closeAboutDialog() {
  if (dom.aboutDialog.open) dom.aboutDialog.close();
}

function setMobilePanel(panel) {
  const next = ["library", "inspector"].includes(panel) ? panel : "canvas";
  document.body.classList.toggle("mobile-panel-library", next === "library");
  document.body.classList.toggle("mobile-panel-inspector", next === "inspector");
  dom.mobilePanelButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mobilePanel === next);
  });
}

function startBlankFlow() {
  if (!consumeNewFlowConfirmation()) return;
  pushHistory();
  state.name = "Live PA";
  state.notes = "";
  state.nodes = [];
  state.edges = [];
  state.powerOutlets = [];
  state.powerEdges = [];
  state.activeLayer = "signal";
  resetTransientState();
  resetViewportToFieldCenter(1);
  closeStartDialog();
  commit("Started blank flow");
  toast("Started blank flow");
}

function restoreVersion(id) {
  const item = readVersions().find((version) => version.id === id);
  if (!item) return;
  restoreSnapshot(JSON.parse(item.payload));
  dom.historyDialog.close();
  toast("Restored from history");
}

function loadFile(file) {
  if (!confirmReplaceCurrentFlow("Load this file? The current gear and cables will be replaced.")) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      restoreSnapshot(JSON.parse(reader.result));
      toast("File loaded");
    } catch {
      toast("Could not load JSON");
    }
  };
  reader.readAsText(file);
}

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  dom.toastStack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function toastDownloadLink(url, fileName) {
  const el = document.createElement("div");
  el.className = "toast download-toast";
  const label = document.createElement("span");
  label.textContent = "Download ready";
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.textContent = fileName;
  el.append(label, link);
  dom.toastStack.appendChild(el);
  setTimeout(() => el.remove(), 20000);
}

function templateNode(type, dx, dy, overrides = {}) {
  const template = visibleTemplateByType(type);
  if (!template) return null;
  const center = fieldCenter();
  return { ...makeNode(template, center.x + dx, center.y + dy), ...overrides };
}

function templateCable(fromNode, toNode, config = {}) {
  if (!fromNode || !toNode) return null;
  const fromKind = config.fromKind || "xlr-m";
  const toKind = config.toKind || "xlr-f";
  const signalType = config.signalType || inferSignalType(fromKind, toKind);
  const style = SIGNAL_TYPES[signalType] || SIGNAL_TYPES.audio;
  return {
    id: uid("edge"),
    from: {
      nodeId: fromNode.id,
      side: config.fromSide || "right",
      offset: config.fromOffset ?? 0.5,
      kind: fromKind,
      label: config.fromLabel,
    },
    to: {
      nodeId: toNode.id,
      side: config.toSide || "left",
      offset: config.toOffset ?? 0.5,
      kind: toKind,
      label: config.toLabel,
    },
    signalType,
    direction: config.direction || "forward",
    lineStyle: config.lineStyle || "solid",
    color: config.color || style.color,
    width: config.width || style.width,
  };
}

function seedBandTemplate() {
  const vocal = templateNode("microphone", -760, -360, { title: "Vocal Mic", subtitle: "Microphone" });
  const guitar = templateNode("guitar", -760, -90, { title: "Guitar", subtitle: "Guitar" });
  const bass = templateNode("bass", -760, 180, { title: "Bass", subtitle: "Bass" });
  const guitarAmp = templateNode("guitar-amplifier", -390, -90, { title: "Guitar Amp", subtitle: "Amp" });
  const bassAmp = templateNode("bass-amplifier", -390, 180, { title: "Bass Amp", subtitle: "Amp" });
  const mixer = templateNode("mixer", 0, -40, { title: "Sub Mixer", subtitle: "Mixer" });
  const speakerL = templateNode("speaker", 420, -210, { title: "Main Speaker L", subtitle: "Speaker" });
  const speakerR = templateNode("speaker", 420, 160, { title: "Main Speaker R", subtitle: "Speaker" });

  state.name = "3pc Band";
  state.notes = "";
  state.nodes = [vocal, guitar, bass, guitarAmp, bassAmp, mixer, speakerL, speakerR].filter(Boolean);
  state.edges = [
    templateCable(vocal, mixer, { fromKind: "xlr-m", toKind: "xlr-f", fromLabel: "Vocal out", toLabel: "Mic in" }),
    templateCable(guitar, guitarAmp, { fromKind: "ts", toKind: "ts", fromLabel: "Instrument out", toLabel: "Guitar in" }),
    templateCable(guitarAmp, mixer, { fromKind: "xlr-m", toKind: "xlr-f", fromLabel: "Mic out", toLabel: "Guitar mic in" }),
    templateCable(bass, bassAmp, { fromKind: "ts", toKind: "ts", fromLabel: "Instrument out", toLabel: "Bass in" }),
    templateCable(bassAmp, mixer, { fromKind: "xlr-m", toKind: "xlr-f", fromLabel: "DI out", toLabel: "Bass in" }),
    templateCable(mixer, speakerL, { fromKind: "xlr-m", toKind: "xlr-f", fromLabel: "Main L", toLabel: "Audio in" }),
    templateCable(mixer, speakerR, { fromKind: "xlr-m", toKind: "xlr-f", fromLabel: "Main R", toLabel: "Audio in" }),
  ].filter(Boolean);
  autoPlacePortsForEdges();
}

function seedDjTemplate() {
  const cdjA = templateNode("cdj", -780, -330, { title: "CDJ 1", subtitle: "CDJ" });
  const cdjB = templateNode("cdj", -780, -110, { title: "CDJ 2", subtitle: "CDJ" });
  const turntable = templateNode("turntable", -780, 120, { title: "Turntable", subtitle: "Turntable" });
  const laptop = templateNode("laptop", -780, 360, { title: "Laptop PC", subtitle: "Laptop PC" });
  const audioInterface = templateNode("audio-interface", -420, 340, { title: "Audio Interface", subtitle: "Audio I/O" });
  const mixer = templateNode("mixer", -80, -40, { title: "Sub Mixer", subtitle: "Mixer" });
  const speakerL = templateNode("speaker", 420, -220, { title: "Main Speaker L", subtitle: "Speaker" });
  const speakerR = templateNode("speaker", 420, 150, { title: "Main Speaker R", subtitle: "Speaker" });

  state.name = "DJ Set";
  state.notes = "";
  state.nodes = [cdjA, cdjB, turntable, laptop, audioInterface, mixer, speakerL, speakerR].filter(Boolean);
  state.edges = [
    templateCable(cdjA, mixer, { fromKind: "rca", toKind: "rca", fromLabel: "Stereo out", toLabel: "Line in 1", lineStyle: "double" }),
    templateCable(cdjB, mixer, { fromKind: "rca", toKind: "rca", fromLabel: "Stereo out", toLabel: "Line in 2", lineStyle: "double" }),
    templateCable(turntable, mixer, { fromKind: "rca", toKind: "rca", fromLabel: "Phono out", toLabel: "Phono in", lineStyle: "double" }),
    templateCable(laptop, audioInterface, { fromKind: "usb-c", toKind: "usb-c", fromLabel: "USB out", toLabel: "USB in" }),
    templateCable(audioInterface, mixer, { fromKind: "trs", toKind: "trs", fromLabel: "Stereo out", toLabel: "Line in 3/4", lineStyle: "double" }),
    templateCable(mixer, speakerL, { fromKind: "xlr-m", toKind: "xlr-f", fromLabel: "Main L", toLabel: "Audio in" }),
    templateCable(mixer, speakerR, { fromKind: "xlr-m", toKind: "xlr-f", fromLabel: "Main R", toLabel: "Audio in" }),
  ].filter(Boolean);
  autoPlacePortsForEdges();
}

function seedProject() {
  seedBandTemplate();
}

function applyTemplate(kind) {
  if (!consumeNewFlowConfirmation()) return;
  pushHistory();
  if (kind === "dj") seedDjTemplate();
  else seedBandTemplate();
  state.powerOutlets = [];
  state.powerEdges = [];
  state.activeLayer = "signal";
  resetTransientState();
  resetViewportToFieldCenter(1);
  closeStartDialog();
  commit("Template applied");
  toast("Template applied");
}

function bindEvents() {
  $("#aboutBrandBtn").addEventListener("click", showAboutDialog);
  dom.mobilePanelButtons.forEach((button) => {
    button.addEventListener("click", () => setMobilePanel(button.dataset.mobilePanel));
  });
  dom.librarySearch.addEventListener("input", renderLibrary);
  dom.canvasFrame.addEventListener("pointerdown", startPan);
  $(".toolbar").addEventListener("pointerup", (event) => {
    event.target.closest("button")?.blur();
  });
  dom.edgeLayer.addEventListener("click", (event) => {
    if (event.target.classList.contains("patch-cable-hit")) return;
    if (event.target.classList.contains("power-cable-hit")) return;
    if (state.activeLayer === "power") {
      clearSelection();
      return;
    }
    if (!selectNearestEdgeAt(event.clientX, event.clientY)) clearSelection();
  });
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  dom.canvasFrame.addEventListener("wheel", (event) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.08 : 0.08;
    setZoom(state.viewport.scale + direction, { x: event.clientX, y: event.clientY });
  }, { passive: false });

  dom.canvasFrame.addEventListener("dragover", (event) => {
    if (event.dataTransfer.types.includes(TEMPLATE_MIME)) {
      event.preventDefault();
      document.body.classList.add("drop-active");
    }
  });
  dom.canvasFrame.addEventListener("dragleave", () => document.body.classList.remove("drop-active"));
  dom.canvasFrame.addEventListener("drop", (event) => {
    document.body.classList.remove("drop-active");
    const type = event.dataTransfer.getData(TEMPLATE_MIME);
    if (!type) return;
    event.preventDefault();
    const template = templates.find((item) => item.type === type);
    if (!template) return;
    const point = screenToWorld(event.clientX, event.clientY);
    addNode(template, { x: point.x - template.w / 2, y: point.y - template.h / 2 });
  });

  window.addEventListener("dragover", (event) => {
    if (event.dataTransfer.types.includes("Files")) event.preventDefault();
  });
  window.addEventListener("drop", (event) => {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    loadFile(event.dataTransfer.files[0]);
  });

  $("#undoBtn").addEventListener("click", undo);
  $("#redoBtn").addEventListener("click", redo);
  $("#alignVerticalCenterBtn").addEventListener("click", () => alignSelectedCenter("y"));
  $("#alignHorizontalCenterBtn").addEventListener("click", () => alignSelectedCenter("x"));
  dom.signalLayerBtn.addEventListener("click", () => setActiveLayer("signal"));
  dom.powerLayerBtn.addEventListener("click", () => setActiveLayer("power"));
  $$("[data-menu-button]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu(button.closest(".menu-wrap"));
    });
  });
  $("#newMenuItem").addEventListener("click", showStartDialog);
  $("#loadMenuItem").addEventListener("click", () => {
    closeMenus();
    dom.fileInput.click();
  });
  $("#jsonMenuItem").addEventListener("click", () => {
    closeMenus();
    downloadJson();
  });
  $("#pngMenuItem").addEventListener("click", () => {
    closeMenus();
    downloadPng();
  });
  $("#svgMenuItem").addEventListener("click", () => {
    closeMenus();
    downloadSvg();
  });
  $("#pdfMenuItem").addEventListener("click", () => {
    closeMenus();
    downloadPdf();
  });
  $("#documentMenuItem").addEventListener("click", showDocumentDialog);
  $("#inputListMenuItem").addEventListener("click", showInputListDialog);
  $("#autoPlaceMenuItem").addEventListener("click", autoPlaceAllEdges);
  $("#powerOutletMenuItem").addEventListener("click", () => {
    closeMenus();
    addPowerOutlet();
  });
  $("#historyMenuItem").addEventListener("click", showHistory);
  $("#closeHistoryBtn").addEventListener("click", () => dom.historyDialog.close());
  $("#closeDocumentBtn").addEventListener("click", () => dom.documentDialog.close());
  $("#closeInputListBtn").addEventListener("click", () => dom.inputListDialog.close());
  $("#closeStartBtn").addEventListener("click", closeStartDialog);
  $("#closeAboutBtn").addEventListener("click", closeAboutDialog);
  $("#startBlankBtn").addEventListener("click", startBlankFlow);
  $("#startBandBtn").addEventListener("click", () => applyTemplate("band"));
  $("#startDjBtn").addEventListener("click", () => applyTemplate("dj"));
  $("#zoomInBtn").addEventListener("click", () => {
    const rect = dom.canvasFrame.getBoundingClientRect();
    setZoom(state.viewport.scale + 0.12, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  });
  $("#zoomOutBtn").addEventListener("click", () => {
    const rect = dom.canvasFrame.getBoundingClientRect();
    setZoom(state.viewport.scale - 0.12, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  });
  dom.zoomReadout.addEventListener("click", resetZoomTo100);
  dom.minimap.addEventListener("pointerdown", jumpToMinimapPoint);
  $("#addBlankBtn").addEventListener("click", () =>
    addNode(
      {
        type: "custom",
        label: "Custom Gear",
        title: "",
        subtitle: "Custom Gear",
        category: "Gear",
        icon: "box",
        w: 180,
        h: 112,
        tags: [],
        ports: [],
      },
      screenToWorld(window.innerWidth / 2, window.innerHeight / 2),
    ),
  );
  dom.edgeInspector.addEventListener("input", handleEdgeInspectorInput);
  dom.edgeInspector.addEventListener("change", handleEdgeInspectorChange);
  dom.edgeInspector.addEventListener("click", handleEdgeInspectorClick);
  $("#addPowerOutletBtn").addEventListener("click", () => addPowerOutlet());
  dom.powerOutletNameInput.addEventListener("input", updateSelectedPowerOutletFromInspector);
  dom.powerOutletLimitInput.addEventListener("input", updateSelectedPowerOutletFromInspector);
  dom.edgeColorSwatches.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edge-color]");
    const edge = getSelectedEdge();
    if (!button || !edge) return;
    edge.color = button.dataset.edgeColor;
    dom.edgeColorInput.value = edge.color;
    renderEdges();
    renderInspector();
    scheduleAutosave("Autosaved");
  });
  dom.fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) loadFile(file);
    dom.fileInput.value = "";
  });
  dom.projectNameInput.addEventListener("input", () => {
    state.name = dom.projectNameInput.value;
    scheduleAutosave("Autosaved");
  });
  dom.notesInput.addEventListener("input", () => {
    state.notes = dom.notesInput.value;
    scheduleAutosave("Autosaved");
  });
  dom.nodeInspector.addEventListener("input", updateSelectedNodeFromInspector);
  dom.nodeIconPicker.addEventListener("click", updateSelectedNodeIcon);
  dom.portPopover.addEventListener("input", handlePortPopoverInput);
  dom.portPopover.addEventListener("change", handlePortPopoverChange);
  dom.portPopover.addEventListener("click", handlePortPopoverClick);
  dom.historyList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-restore-version]");
    if (button) restoreVersion(button.dataset.restoreVersion);
  });
  window.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".menu-wrap")) closeMenus();
  });
  window.addEventListener("keydown", (event) => {
    const isTextField = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
    if (isTextField && (event.metaKey || event.ctrlKey)) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) {
      event.preventDefault();
      redo();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      copySelection();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
      event.preventDefault();
      pasteSelection();
    } else if (event.key === "Delete" || event.key === "Backspace") {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      deleteSelected();
    } else if (event.key === "Escape") {
      closeMenus();
      closeStartDialog();
      closeAboutDialog();
      setMobilePanel("canvas");
      state.connecting = null;
      state.portDrag = null;
      state.powerDrag = null;
      state.selectedEdge = null;
      state.selectedPowerEdge = null;
      state.selectedPowerOutlet = null;
      state.portPopover = null;
      render();
    }
  });
  window.addEventListener("resize", renderMinimap);
}

function updateSelectedNodeIcon(event) {
  const button = event.target.closest("[data-node-icon]");
  if (!button) return;
  const node = state.nodes.find((item) => state.selected.has(item.id));
  if (!node) return;
  node.icon = button.dataset.nodeIcon;
  renderNodes();
  renderInspector();
  scheduleAutosave("Autosaved");
}

function updateSelectedNodeFromInspector() {
  const node = state.nodes.find((item) => state.selected.has(item.id));
  if (!node) return;
  node.title = dom.nodeTitleInput.value;
  node.subtitle = dom.nodeSubtitleInput.value;
  if (state.activeLayer === "power") node.powerWatts = dom.nodePowerInput.value;
  renderEdges();
  renderNodes();
  renderPowerOutlets();
  renderInputList();
  renderMinimap();
  scheduleAutosave("Autosaved");
}

function updateSelectedEdgeFromInspector() {
  const edge = getSelectedEdge();
  if (!edge) return;
  const style = cableVisualStyle(edge);
  edge.color = dom.edgeColorInput.value || style.color;
  edge.width = Number(dom.edgeWidthInput.value) || style.width;
  renderEdges();
  scheduleAutosave("Autosaved");
}

function updateSelectedPowerOutletFromInspector() {
  const outlet = getSelectedPowerOutlet() || getPowerOutlet(getSelectedPowerEdge()?.to?.outletId);
  if (!outlet) return;
  outlet.name = dom.powerOutletNameInput.value;
  outlet.limitWatts = dom.powerOutletLimitInput.value;
  renderEdges();
  renderPowerOutlets();
  renderInspector();
  scheduleAutosave("Autosaved");
}

function edgeEndpointPort(edge, endpoint) {
  const ref = edge?.[endpoint];
  const node = ref ? getNode(ref.nodeId) : null;
  const port = node ? getPort(node, ref.portId) : null;
  return { node, port };
}

function handleEdgeInspectorInput(event) {
  const edge = getSelectedEdge();
  if (!edge) return;
  if (event.target === dom.edgeColorInput || event.target === dom.edgeWidthInput) {
    updateSelectedEdgeFromInspector();
    renderInspector();
    return;
  }
  const labelEndpoint = event.target.dataset.edgeEndpointLabel;
  if (labelEndpoint) {
    ensureEdgeEndpoint(edge, labelEndpoint).label = event.target.value;
    renderEdges();
    renderInputList();
    scheduleAutosave("Autosaved");
    return;
  }
  const customKindEndpoint = event.target.dataset.edgeEndpointCustomKind;
  if (customKindEndpoint) {
    const ref = ensureEdgeEndpoint(edge, customKindEndpoint);
    ref.kind = event.target.value.trim() || "custom";
    edge.signalType = inferSignalType(edgeEndpointKind(edge, "from"), edgeEndpointKind(edge, "to"));
    renderEdges();
    renderInputList();
    dom.edgeSummary.innerHTML = edgeSummaryMarkup(edge);
    scheduleAutosave("Autosaved");
  }
}

function handleEdgeInspectorChange(event) {
  const edge = getSelectedEdge();
  const kindEndpoint = event.target.dataset.edgeEndpointKind;
  if (!edge || !kindEndpoint) return;
  const ref = ensureEdgeEndpoint(edge, kindEndpoint);
  if (event.target.value === "__custom__") {
    const input = event.target.closest(".edge-endpoint")?.querySelector("[data-edge-endpoint-custom-kind]");
    ref.kind = input?.value.trim() || "Custom";
  } else {
    ref.kind = event.target.value;
  }
  edge.signalType = inferSignalType(edgeEndpointKind(edge, "from"), edgeEndpointKind(edge, "to"));
  renderEdges();
  renderInputList();
  renderInspector();
  scheduleAutosave("Autosaved");
}

function handleEdgeInspectorClick(event) {
  const edge = getSelectedEdge();
  if (!edge) return;
  const genderButton = event.target.closest("[data-edge-endpoint-gender]");
  if (genderButton) {
    const ref = ensureEdgeEndpoint(edge, genderButton.dataset.edgeEndpointGender);
    ref.gender = genderButton.dataset.gender;
    renderEdges();
    renderInputList();
    renderInspector();
    scheduleAutosave("Autosaved");
    return;
  }
  const lineButton = event.target.closest("[data-edge-line]");
  if (lineButton) {
    edge.lineStyle = lineButton.dataset.edgeLine;
    renderEdges();
    renderInspector();
    renderInputList();
    scheduleAutosave("Autosaved");
    return;
  }
  const directionButton = event.target.closest("[data-edge-direction]");
  if (directionButton) {
    edge.direction = directionButton.dataset.edgeDirection;
    renderEdges();
    renderInspector();
    renderInputList();
    scheduleAutosave("Autosaved");
    return;
  }
  if (event.target.closest("#autoPlaceEdgeBtn")) {
    autoPlaceConnectedPortsForNodeIds([edge.from.nodeId, edge.to.nodeId]);
    renderEdges();
    renderNodes();
    renderInspector();
    toast("Endpoints moved to the nearest sides");
  }
}

function updatePortButtonLabel(nodeId, portId, label) {
  const button = $$(".port").find((item) => item.dataset.nodeId === nodeId && item.dataset.portId === portId);
  const text = button?.querySelector(".port-label");
  if (text) text.textContent = label;
}

function handlePortPopoverInput(event) {
  const { node, port } = getOpenPopoverPort();
  if (!node || !port) return;
  if (event.target.matches("[data-popover-port-label]")) {
    port.label = event.target.value;
    updatePortButtonLabel(node.id, port.id, port.label);
    renderInputList();
    renderInspector();
    scheduleAutosave("Autosaved");
  } else if (event.target.matches("[data-popover-port-offset]")) {
    port.offset = Math.min(0.92, Math.max(0.08, Number(event.target.value)));
    renderEdges();
    renderNodes();
    renderInputList();
    renderInspector();
    renderPortPopover();
    scheduleAutosave("Autosaved");
  }
}

function handlePortPopoverChange(event) {
  const { node, port } = getOpenPopoverPort();
  if (!node || !port) return;
  if (event.target.matches("[data-popover-port-kind]")) {
    port.kind = event.target.value;
    renderEdges();
    renderNodes();
    renderInputList();
    renderInspector();
    renderPortPopover();
    scheduleAutosave("Autosaved");
  }
}

function handlePortPopoverClick(event) {
  const { node, port } = getOpenPopoverPort();
  if (event.target.closest("[data-port-popover-close]")) {
    state.portPopover = null;
    renderPortPopover();
    return;
  }
  if (!node || !port) return;
  const sideButton = event.target.closest("[data-popover-side]");
  if (sideButton) {
    port.side = sideButton.dataset.popoverSide;
    renderEdges();
    renderNodes();
    renderInputList();
    renderInspector();
    renderPortPopover();
    scheduleAutosave("Autosaved");
    return;
  }
  if (event.target.closest("[data-port-start-connect]")) {
    startPortConnection(node.id, port.id);
    return;
  }
  if (event.target.closest("[data-port-delete]")) {
    node.ports = node.ports.filter((item) => item.id !== port.id);
    state.edges = state.edges.filter((edge) => edge.from.portId !== port.id && edge.to.portId !== port.id);
    state.portPopover = null;
    commit("Deleted port");
  }
}

function updatePortFromInspector(event) {
  const node = state.nodes.find((item) => state.selected.has(item.id));
  if (!node) return;
  const input = event.target;
  const labelId = input.dataset.portLabel;
  const kindId = input.dataset.portKind;
  const offsetId = input.dataset.portOffset;
  if (labelId) getPort(node, labelId).label = input.value;
  if (kindId) getPort(node, kindId).kind = input.value.trim() || "trs";
  if (offsetId) getPort(node, offsetId).offset = Math.min(0.92, Math.max(0.08, Number(input.value)));
  renderEdges();
  renderNodes();
  renderInputList();
  scheduleAutosave("Autosaved");
}

function handlePortInspectorClick(event) {
  const deleteButton = event.target.closest("[data-delete-port]");
  const sideButton = event.target.closest("[data-side]");
  const node = state.nodes.find((item) => state.selected.has(item.id));
  if (!node) return;
  if (deleteButton) {
    const portId = deleteButton.dataset.deletePort;
    node.ports = node.ports.filter((port) => port.id !== portId);
    state.edges = state.edges.filter((edge) => edge.from.portId !== portId && edge.to.portId !== portId);
    commit("Deleted port");
  }
  if (sideButton) {
    const portId = sideButton.parentElement.dataset.portSide;
    getPort(node, portId).side = sideButton.dataset.side;
    commit("Moved port");
  }
}

function loadInitial() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  const savedKey = localStorage.getItem(STORAGE_KEY) ? STORAGE_KEY : LEGACY_STORAGE_KEY;
  if (saved) {
    try {
      restoreSnapshot(JSON.parse(saved));
      toast("Previous session restored");
      return;
    } catch {
      localStorage.removeItem(savedKey);
    }
  }
  pushHistory();
  render();
  showStartDialog();
  dom.saveStatus.textContent = "New flow";
}

ensureExportIconData();
bindEvents();
loadInitial();
updateStorageMeter();
