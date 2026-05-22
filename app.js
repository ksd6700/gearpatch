const STORAGE_KEY = "gearflow.document.v5";
const HISTORY_KEY = "gearflow.versions.v5";
const VERSION = "0.1.0";
const WORLD_W = 5000;
const WORLD_H = 3500;
const GRID_SIZE = 24;
const HANDLE_SIDES = ["left", "right", "top", "bottom"];
const TERMINAL_MIN_SPACING = {
  horizontal: 46,
  vertical: 54,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const state = {
  name: "ライブPA",
  notes: "",
  nodes: [],
  edges: [],
  selected: new Set(),
  selectedEdge: null,
  connecting: null,
  portDrag: null,
  portPopover: null,
  viewport: { x: -420, y: -420, scale: 0.86 },
  history: [],
  future: [],
  autosaveTimer: null,
  drag: null,
  pan: null,
  resize: null,
  clipboard: null,
};

const templates = [
  {
    type: "vocal",
    title: "Vocal Mic",
    subtitle: "Lead vocal",
    category: "Mic",
    icon: "mic",
    w: 168,
    h: 104,
    tags: ["XLR", "Mic"],
    ports: [{ id: "xlr-out", label: "XLR OUT", kind: "xlr-m", side: "right", offset: 0.52 }],
  },
  {
    type: "di",
    title: "DI Box",
    subtitle: "Active DI",
    category: "Utility",
    icon: "box",
    w: 160,
    h: 112,
    tags: ["DI", "PAD"],
    ports: [
      { id: "inst-in", label: "TS IN", kind: "ts", side: "left", offset: 0.36 },
      { id: "link-out", label: "LINK", kind: "ts", side: "left", offset: 0.66 },
      { id: "xlr-out", label: "XLR OUT", kind: "xlr-m", side: "right", offset: 0.5 },
    ],
  },
  {
    type: "mixer",
    title: "FOH Mixer",
    subtitle: "House console",
    category: "PA",
    icon: "mixer",
    w: 214,
    h: 154,
    tags: ["FOH", "Inputs"],
    ports: [
      { id: "ch1", label: "CH 1", kind: "xlr-f", side: "left", offset: 0.18 },
      { id: "ch2", label: "CH 2", kind: "xlr-f", side: "left", offset: 0.34 },
      { id: "ch3", label: "CH 3", kind: "trs", side: "left", offset: 0.5 },
      { id: "main-l", label: "MAIN L", kind: "xlr-m", side: "right", offset: 0.36 },
      { id: "main-r", label: "MAIN R", kind: "xlr-m", side: "right", offset: 0.58 },
    ],
  },
  {
    type: "stagebox",
    title: "Stagebox",
    subtitle: "Venue input box",
    category: "PA",
    icon: "rack",
    w: 198,
    h: 148,
    tags: ["Stage", "Snake"],
    ports: [
      { id: "in1", label: "IN 1", kind: "xlr-f", side: "left", offset: 0.18 },
      { id: "in2", label: "IN 2", kind: "xlr-f", side: "left", offset: 0.34 },
      { id: "in3", label: "IN 3", kind: "xlr-f", side: "left", offset: 0.5 },
      { id: "in4", label: "IN 4", kind: "xlr-f", side: "left", offset: 0.66 },
      { id: "returns", label: "RETURN", kind: "trs", side: "right", offset: 0.45 },
    ],
  },
  {
    type: "synth",
    title: "Synth",
    subtitle: "Stereo keys",
    category: "Instrument",
    icon: "keys",
    w: 188,
    h: 116,
    tags: ["L/R", "TRS"],
    ports: [
      { id: "out-l", label: "TRS OUT L", kind: "trs", side: "right", offset: 0.36 },
      { id: "out-r", label: "TRS OUT R", kind: "trs", side: "right", offset: 0.62 },
      { id: "midi-in", label: "MIDI IN", kind: "midi", side: "left", offset: 0.5 },
    ],
  },
  {
    type: "dj",
    title: "DJ Mixer",
    subtitle: "Club setup",
    category: "DJ",
    icon: "turntable",
    w: 206,
    h: 132,
    tags: ["RCA", "XLR"],
    ports: [
      { id: "rca-l", label: "RCA L", kind: "rca", side: "right", offset: 0.34 },
      { id: "rca-r", label: "RCA R", kind: "rca", side: "right", offset: 0.52 },
      { id: "xlr-l", label: "XLR L", kind: "xlr-m", side: "right", offset: 0.7 },
      { id: "usb", label: "USB-B", kind: "usb", side: "left", offset: 0.5 },
    ],
  },
  {
    type: "interface",
    title: "Audio Interface",
    subtitle: "Playback rig",
    category: "Studio",
    icon: "interface",
    w: 198,
    h: 126,
    tags: ["USB-C", "TRS"],
    ports: [
      { id: "usb-c", label: "USB-C", kind: "usb-c", side: "left", offset: 0.5 },
      { id: "out1", label: "OUT 1", kind: "trs", side: "right", offset: 0.36 },
      { id: "out2", label: "OUT 2", kind: "trs", side: "right", offset: 0.62 },
    ],
  },
  {
    type: "monitor",
    title: "Monitor Wedge",
    subtitle: "Mix 1",
    category: "Monitor",
    icon: "speaker",
    w: 168,
    h: 108,
    tags: ["Return", "XLR"],
    ports: [{ id: "input", label: "XLR IN", kind: "xlr-f", side: "left", offset: 0.52 }],
  },
  {
    type: "amp",
    title: "Guitar Amp",
    subtitle: "Mic or line",
    category: "Backline",
    icon: "amp",
    w: 178,
    h: 122,
    tags: ["Amp", "Mic"],
    ports: [
      { id: "inst-in", label: "TS IN", kind: "ts", side: "left", offset: 0.42 },
      { id: "speaker", label: "SPK", kind: "speakon", side: "right", offset: 0.58 },
    ],
  },
];

const strokeIcon = (body, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;

const iconSvg = {
  mic: strokeIcon(`<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/><path d="M8 22h8"/>`),
  box: strokeIcon(`<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>`),
  mixer: strokeIcon(`<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M16 7v10"/><path d="M7 11h2"/><path d="M11 15h2"/><path d="M15 9h2"/>`),
  rack: strokeIcon(`<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01"/><path d="M7 16.5h.01"/><path d="M11 7.5h6"/><path d="M11 16.5h6"/>`),
  keys: strokeIcon(`<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 6v12"/><path d="M11 6v12"/><path d="M15 6v12"/><path d="M19 6v12"/><path d="M5 12h14"/><path d="M9 6v6"/><path d="M13 6v6"/><path d="M17 6v6"/>`),
  turntable: strokeIcon(`<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="4"/><circle cx="9" cy="12" r="1"/><path d="M16 8h2"/><path d="M16 12h2"/><path d="M16 16h2"/>`),
  interface: strokeIcon(`<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="8" cy="12" r="2.5"/><path d="M13 10h5"/><path d="M13 14h5"/><path d="M6 18v2"/><path d="M18 18v2"/>`),
  speaker: strokeIcon(`<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>`),
  amp: strokeIcon(`<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M7 10h10"/><path d="M7 14h2"/><path d="M12 14h2"/><path d="M17 14h.01"/><path d="M6 18v2"/><path d="M18 18v2"/>`),
};

const ICON_OPTIONS = [
  { id: "mic", label: "Mic" },
  { id: "box", label: "DI / Box" },
  { id: "mixer", label: "Mixer" },
  { id: "rack", label: "Stagebox" },
  { id: "keys", label: "Keys" },
  { id: "turntable", label: "DJ" },
  { id: "interface", label: "Interface" },
  { id: "speaker", label: "Monitor" },
  { id: "amp", label: "Amp" },
];

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

const PORT_KIND_OPTIONS = ["xlr-m", "xlr-f", "ts", "trs", "trrs", "rca", "usb", "usb-c", "hdmi", "speakon", "midi"];
const CONNECTOR_SHAPE_OPTIONS = ["xlr", "ts", "trs", "trrs", "rca", "usb", "usb-c", "hdmi", "speakon", "midi"];
const CABLE_COLORS = ["#111111", "#d92d20", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0f766e", "#e11d48"];
const LINE_STYLES = {
  solid: { label: "Solid", dash: "" },
  dashed: { label: "Dashed", dash: "10 7" },
  dotted: { label: "Dotted", dash: "2 7" },
  double: { label: "Double", dash: "", double: true },
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
  terminalLayer: $("#terminalLayer"),
  canvasHint: $("#canvasHint"),
  minimap: $("#minimap"),
  zoomReadout: $("#zoomReadout"),
  saveStatus: $("#saveStatus"),
  fileInput: $("#fileInput"),
  toastStack: $("#toastStack"),
  startDialog: $("#startDialog"),
  menuBtn: $("#menuBtn"),
  appMenu: $("#appMenu"),
  documentDialog: $("#documentDialog"),
  historyDialog: $("#historyDialog"),
  historyList: $("#historyList"),
  selectionCount: $("#selectionCount"),
  emptyInspector: $("#emptyInspector"),
  nodeInspector: $("#nodeInspector"),
  nodeTitleInput: $("#nodeTitleInput"),
  nodeSubtitleInput: $("#nodeSubtitleInput"),
  nodeIconPicker: $("#nodeIconPicker"),
  edgeInspector: $("#edgeInspector"),
  edgeSummary: $("#edgeSummary"),
  edgeSignalTypes: $("#edgeSignalTypes"),
  edgeEndpointEditor: $("#edgeEndpointEditor"),
  edgeColorInput: $("#edgeColorInput"),
  edgeColorSwatches: $("#edgeColorSwatches"),
  edgeWidthInput: $("#edgeWidthInput"),
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
    viewport: clone(state.viewport),
    metadata: {
      notes: state.notes,
      app: "GearFlow",
      format: "gearflow-json",
    },
  };
}

function snapshot() {
  return {
    name: state.name,
    notes: state.notes,
    nodes: clone(state.nodes),
    edges: clone(state.edges),
    viewport: clone(state.viewport),
  };
}

function restoreSnapshot(snap) {
  state.name = snap.name || "ライブPA";
  state.notes = snap.notes || snap.metadata?.notes || "";
  state.nodes = clone(snap.nodes || []);
  state.edges = clone(snap.edges || []);
  state.viewport = snap.viewport || { x: -620, y: -420, scale: 1 };
  state.selected = new Set();
  state.selectedEdge = null;
  state.connecting = null;
  state.portDrag = null;
  state.portPopover = null;
  autoPlacePortsForEdges();
  dom.projectNameInput.value = state.name;
  dom.notesInput.value = state.notes;
  render();
  scheduleAutosave("復元しました");
}

function pushHistory() {
  state.history.push(snapshot());
  if (state.history.length > 80) state.history.shift();
  state.future = [];
}

function commit(message = "更新しました") {
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
    edges: data.edges.length,
    payload: current,
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(versions.slice(0, 20)));
}

function readVersions() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
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
  if (bytes > 4 * 1024 * 1024) toast("localStorageが4MBを超えました。JSON保存をおすすめします。");
}

function makeNode(template, x = 1200, y = 900) {
  const ports = template.ports.map((port) => ({ ...port, id: uid(port.id) }));
  return {
    id: uid("node"),
    type: template.type,
    title: template.title,
    subtitle: template.subtitle,
    category: template.category,
    icon: template.icon,
    tags: [...template.tags],
    x: snapToGrid(x),
    y: snapToGrid(y),
    w: template.w,
    h: template.h,
    ports,
  };
}

function addNode(template, point) {
  const snapped = snapPoint(point);
  state.nodes.push(makeNode(template, snapped.x, snapped.y));
  state.selected = new Set([state.nodes.at(-1).id]);
  state.selectedEdge = null;
  commit(`${template.title}を追加`);
}

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
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
  renderLibrary();
  renderWorldTransform();
  renderEdges();
  renderNodes();
  renderInspector();
  renderInputList();
  renderMinimap();
  renderPortPopover();
  dom.canvasHint.classList.toggle("hidden", state.nodes.length > 0);
}

function clearSelection() {
  const hadSelection = state.selected.size > 0 || !!state.selectedEdge || !!state.connecting || !!state.portPopover;
  state.selected = new Set();
  state.selectedEdge = null;
  state.connecting = null;
  state.portPopover = null;

  if (!hadSelection) {
    renderInspector();
    renderPortPopover();
    return false;
  }

  renderEdges();
  renderNodes();
  renderInspector();
  renderPortPopover();
  return true;
}

function renderLibrary() {
  const query = dom.librarySearch.value.trim().toLowerCase();
  dom.libraryList.innerHTML = "";
  templates
    .filter((item) => `${item.title} ${item.subtitle} ${item.category}`.toLowerCase().includes(query))
    .forEach((template) => {
      const item = document.createElement("button");
      item.className = "library-item";
      item.draggable = true;
      item.dataset.template = template.type;
      item.innerHTML = `
        <span class="library-icon">${iconSvg[template.icon]}</span>
        <span>
          <strong>${escapeHtml(template.title)}</strong>
          <span>${escapeHtml(template.category)} · ${template.tags.join(" / ")}</span>
        </span>
      `;
      item.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("application/x-gearflow-template", template.type);
        event.dataTransfer.effectAllowed = "copy";
      });
      item.addEventListener("click", () => {
        const center = screenToWorld(
          dom.canvasFrame.getBoundingClientRect().left + dom.canvasFrame.clientWidth / 2,
          dom.canvasFrame.getBoundingClientRect().top + dom.canvasFrame.clientHeight / 2,
        );
        addNode(template, { x: center.x - template.w / 2, y: center.y - template.h / 2 });
      });
      dom.libraryList.appendChild(item);
    });
}

function renderWorldTransform() {
  dom.world.style.transform = `translate(${state.viewport.x}px, ${state.viewport.y}px) scale(${state.viewport.scale})`;
  dom.zoomReadout.textContent = `${Math.round(state.viewport.scale * 100)}%`;
}

function renderNodes() {
  dom.nodeLayer.innerHTML = "";
  state.nodes.forEach((node) => {
    const el = document.createElement("article");
    el.className = "gear-node";
    if (state.selected.has(node.id)) el.classList.add("selected");
    if (state.selected.size > 1 && state.selected.has(node.id)) el.classList.add("multi-selected");
    el.dataset.nodeId = node.id;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.width = `${node.w}px`;
    el.style.height = `${node.h}px`;
    el.innerHTML = `
      <div class="node-header">
        <div class="node-icon">${iconSvg[node.icon] || iconSvg.box}</div>
        <div>
          <div class="node-title">${escapeHtml(node.title)}</div>
          <div class="node-subtitle">${escapeHtml(node.subtitle)}</div>
        </div>
      </div>
      <div class="resize-handle" title="リサイズ"></div>
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
  button.setAttribute("aria-label", `${node.title} ${side} connector`);
  button.addEventListener("pointerdown", (event) => startConnectorDrag(event, node, side));
  return button;
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
    const cablePaths = cablePathSvgElements(d, style, state.selectedEdge === edge.id);
    hit.addEventListener("click", () => {
      state.selectedEdge = edge.id;
      state.selected = new Set();
      state.portPopover = null;
      render();
    });
    dom.edgeLayer.append(hit, ...cablePaths);
    terminalBadges.push(
      cableEndChipSvg(from, edge, "from", style.color, state.selectedEdge === edge.id, to),
      cableEndChipSvg(to, edge, "to", style.color, state.selectedEdge === edge.id, from),
    );
  });
  dom.terminalLayer.append(...terminalBadges);
  renderPortDragPreview();
}

function renderInspector() {
  const selectedNodes = state.nodes.filter((node) => state.selected.has(node.id));
  const selectedEdge = getSelectedEdge();
  dom.selectionCount.textContent = selectedEdge ? "1 cable" : `${selectedNodes.length} selected`;
  const single = selectedNodes.length === 1 ? selectedNodes[0] : null;
  dom.emptyInspector.classList.toggle("hidden", !!single || !!selectedEdge);
  dom.nodeInspector.classList.toggle("hidden", !single);
  dom.edgeInspector.classList.toggle("hidden", !selectedEdge);

  if (selectedEdge) {
    const style = cableVisualStyle(selectedEdge);
    dom.edgeSummary.innerHTML = edgeSummaryMarkup(selectedEdge);
    dom.edgeSignalTypes.innerHTML = Object.entries(LINE_STYLES)
      .map(([type, config]) => `<button class="${edgeLineStyle(selectedEdge) === type ? "active" : ""}" data-edge-line="${type}">${config.label}</button>`)
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
  dom.nodeIconPicker.innerHTML = ICON_OPTIONS.map(
    (icon) => `
      <button class="icon-choice ${single.icon === icon.id ? "active" : ""}" data-node-icon="${icon.id}" title="${escapeAttr(icon.label)}" aria-label="${escapeAttr(icon.label)}">
        ${iconSvg[icon.id] || iconSvg.box}
      </button>
    `,
  ).join("");
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
    : `<div class="empty-state"><span>接続すると入力表が自動生成されます。</span></div>`;
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
      <button class="icon-button tiny" data-port-popover-close aria-label="閉じる">×</button>
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
      <button class="full-button" data-port-start-connect>${isConnecting ? "接続待機中" : "接続開始"}</button>
      <button class="full-button danger" data-port-delete>端子を削除</button>
    </div>
  `;
}

function edgeSummaryMarkup(edge) {
  const fromNode = getNode(edge.from.nodeId);
  const toNode = getNode(edge.to.nodeId);
  return `
    <span class="signal-pill">${escapeHtml(lineStyleLabel(edgeLineStyle(edge)))}</span>
    <strong>${escapeHtml(fromNode?.title || "Unknown")}</strong>
    <span>→ ${escapeHtml(toNode?.title || "Unknown")}</span>
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
      <strong>${endpoint === "from" ? "From" : "To"} · ${escapeHtml(node.title)}</strong>
      <label>
        Port label
        <input data-edge-endpoint-label="${endpoint}" type="text" value="${escapeHtml(portLabel)}" placeholder="${endpoint === "from" ? "Audio out" : "Audio in"}" />
      </label>
      <label>
        Connector shape
        <select data-edge-endpoint-kind="${endpoint}">
          ${CONNECTOR_SHAPE_OPTIONS.map((option) => `<option value="${option}" ${shapeValue === option ? "selected" : ""}>${connectorLabel(option)}</option>`).join("")}
          <option value="__custom__" ${isCustom ? "selected" : ""}>Custom...</option>
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

function renderMinimap() {
  dom.minimap.innerHTML = "";
  const scale = 0.028;
  state.nodes.forEach((node) => {
    const el = document.createElement("span");
    el.className = "mini-node";
    el.style.left = `${node.x * scale}px`;
    el.style.top = `${node.y * scale}px`;
    el.style.width = `${Math.max(3, node.w * scale)}px`;
    el.style.height = `${Math.max(3, node.h * scale)}px`;
    dom.minimap.appendChild(el);
  });
  const rect = dom.canvasFrame.getBoundingClientRect();
  const view = document.createElement("span");
  view.className = "mini-view";
  view.style.left = `${(-state.viewport.x / state.viewport.scale) * scale}px`;
  view.style.top = `${(-state.viewport.y / state.viewport.scale) * scale}px`;
  view.style.width = `${(rect.width / state.viewport.scale) * scale}px`;
  view.style.height = `${(rect.height / state.viewport.scale) * scale}px`;
  dom.minimap.appendChild(view);
}

function makeInputRows() {
  return state.edges.map((edge, index) => {
    const fromNode = getNode(edge.from.nodeId);
    const toNode = getNode(edge.to.nodeId);
    const fromKind = edgeEndpointKind(edge, "from");
    const toKind = edgeEndpointKind(edge, "to");
    const source = fromNode?.title || "Unknown";
    const to = toNode?.title || "Unknown";
    const connector = `${connectorInfoLabel(fromKind, edgeEndpointGender(edge, "from"))} (${edgeEndpointPortLabel(edge, "from")}) → ${connectorInfoLabel(toKind, edgeEndpointGender(edge, "to"))} (${edgeEndpointPortLabel(edge, "to")})`;
    return {
      ch: index + 1,
      source,
      connector: `${lineStyleLabel(edgeLineStyle(edge))} · ${connector}`,
      to,
      notes: compatibilityNote(fromKind, toKind),
    };
  });
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
  if (kinds.some((kind) => ["usb", "usb-c", "hdmi"].includes(kind))) return "digital";
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
    xlr: "XLR",
    "xlr-m": "XLR male",
    "xlr-f": "XLR female",
    ts: '1/4" TS',
    trs: '1/4" TRS',
    trrs: "TRRS",
    rca: "RCA",
    usb: "USB",
    "usb-c": "USB-C",
    hdmi: "HDMI",
    speakon: "SpeakON",
    midi: "MIDI",
  };
  return labels[kind] || String(kind || "").trim() || "Custom";
}

function startConnectorDrag(event, node, side) {
  event.preventDefault();
  event.stopPropagation();
  state.selected = new Set([node.id]);
  state.selectedEdge = null;
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
  state.portPopover = { nodeId, portId };
  render();
}

function startPortConnection(nodeId, portId) {
  state.connecting = { nodeId, portId };
  state.portPopover = null;
  render();
  toast("接続先の端子をクリック");
}

function completeConnection(nodeId, portId) {
  if (!state.connecting) return;
  if (state.connecting.nodeId === nodeId) {
    state.connecting = null;
    state.portDrag = null;
    state.portPopover = null;
    render();
    toast("別の機材の端子へ接続してください");
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
    color: style.color,
    width: style.width,
  };
  state.edges.push(edge);
  autoPlaceConnectedPortsForNodeIds([edge.from.nodeId, edge.to.nodeId]);
  state.connecting = null;
  state.portDrag = null;
  state.selectedEdge = edge.id;
  state.selected = new Set();
  state.portPopover = null;
  commit("ケーブルを接続");
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
    lineStyle: "solid",
    color: "#111111",
    width: 3,
  };
  state.edges.push(edge);
  autoPlaceConnectedPortsForNodeIds([edge.from.nodeId, edge.to.nodeId]);
  state.connecting = null;
  state.portDrag = null;
  state.selectedEdge = edge.id;
  state.selected = new Set();
  state.portPopover = null;
  commit("ケーブルを接続");
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
  if (event.target !== dom.canvasFrame && event.target !== dom.world && event.target !== dom.nodeLayer && event.target !== dom.edgeLayer) return;
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
    renderEdges();
    renderNodes();
    renderMinimap();
  }
  if (state.resize) {
    const point = screenToWorld(event.clientX, event.clientY);
    const node = getNode(state.resize.nodeId);
    if (!node) return;
    node.w = Math.max(120, Math.round((state.resize.w + point.x - state.resize.start.x) / 10) * 10);
    node.h = Math.max(86, Math.round((state.resize.h + point.y - state.resize.start.y) / 10) * 10);
    autoPlaceConnectedPortsForNodeIds([node.id]);
    renderEdges();
    renderNodes();
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
    toast("接続先の端子で離すとケーブルを作れます");
    return;
  }
  if (state.drag || state.resize || state.pan) {
    const shouldCommit = !!(state.drag || state.resize);
    state.drag = null;
    state.resize = null;
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

function getNode(id) {
  return state.nodes.find((node) => node.id === id);
}

function getPort(node, portId) {
  return node?.ports.find((port) => port.id === portId);
}

function getSelectedEdge() {
  return state.edges.find((edge) => edge.id === state.selectedEdge);
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
  if (["ts", "trs", "trrs"].includes(kind)) return `Phone ${direction}`;
  if (["usb", "usb-c", "hdmi"].includes(kind)) return `Digital ${direction}`;
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

function cablePathMarkup(d, style) {
  const linecap = `stroke-linecap="round" stroke-linejoin="round"`;
  if (style.double) {
    const railWidth = Math.max(style.width + 5, 7);
    const gapWidth = Math.max(style.width + 1.2, 3.2);
    return `<path d="${d}" fill="none" stroke="${style.color}" stroke-width="${railWidth}" ${linecap}/><path d="${d}" fill="none" stroke="#ffffff" stroke-width="${gapWidth}" ${linecap}/>`;
  }
  const dash = style.dash ? ` stroke-dasharray="${style.dash}"` : "";
  return `<path d="${d}" fill="none" stroke="${style.color}" stroke-width="${style.width}" ${linecap}${dash}/>`;
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
      <text x="${layout.connectorX}" y="${layout.connectorY + (layout.bodyY || 0)}" text-anchor="${layout.connectorAnchor}" dominant-baseline="middle" fill="#6e6e72" font-size="12.5" font-weight="760"${connectorTransformMarkup}${connectorFitMarkup}>${escapeHtml(connector)}</text>
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
    trrs: "TRRS",
    rca: "RCA",
    usb: "USB",
    "usb-c": "USB-C",
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
  const normalized = kind === "xlr-m" || kind === "xlr-f" ? "xlr" : kind;
  const stroke = color || "#111111";
  const pinFill = gender === "female" ? "#fff" : stroke;
  const pinStroke = gender === "female" ? stroke : "none";
  if (["usb", "usb-c", "hdmi"].includes(normalized)) {
    return [
      svgEl("rect", { x: -7, y: -5, width: 14, height: 10, rx: normalized === "usb-c" ? 5 : 2, fill: "#fff", stroke, "stroke-width": 2 }),
      svgEl("line", { x1: -3, y1: 0, x2: 3, y2: 0, stroke, "stroke-width": 1.5 }),
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
  if (["ts", "trs", "trrs"].includes(normalized)) {
    return [
      svgEl("circle", { cx: 0, cy: 0, r: 7, fill: "#fff", stroke, "stroke-width": 2 }),
      svgEl("line", { x1: -4, y1: 0, x2: 4, y2: 0, stroke, "stroke-width": 1.8 }),
      svgEl("line", { x1: normalized === "ts" ? 0 : -1.5, y1: -4, x2: normalized === "ts" ? 0 : -1.5, y2: 4, stroke, "stroke-width": 1.2 }),
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

function filename(ext) {
  const date = new Date().toISOString().slice(0, 10);
  const safe = state.name.replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "") || "project";
  return `gearflow_${safe}_${date}.${ext}`;
}

function downloadText(text, ext, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename(ext);
  link.click();
  URL.revokeObjectURL(url);
}

function downloadJson() {
  persist();
  downloadText(JSON.stringify(exportData(), null, 2), "json", "application/json");
  toast("JSONを保存しました");
}

function buildExportSvg() {
  const bounds = contentBounds();
  const pad = 80;
  const x = bounds.x - pad;
  const y = bounds.y - pad;
  const w = bounds.w + pad * 2;
  const h = bounds.h + pad * 2;
  const edgePathMarkup = state.edges
    .map((edge) => {
      const endpoints = edgeEndpointPoints(edge);
      if (!endpoints) return "";
      const style = cableVisualStyle(edge);
      return cablePathMarkup(cablePath(endpoints.from, endpoints.to, endpoints.fromSide, endpoints.toSide), style);
    })
    .join("");
  const terminalMarkup = state.edges
    .map((edge) => {
      const endpoints = edgeEndpointPoints(edge);
      if (!endpoints) return "";
      return `${cableEndChipMarkup(endpoints.from, edge, "from", endpoints.to)}${cableEndChipMarkup(endpoints.to, edge, "to", endpoints.from)}`;
    })
    .join("");
  const nodeMarkup = state.nodes
    .map((node) => {
      return `
        <g>
          <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="8" fill="#f8f8f5" stroke="#111" stroke-width="1.4"/>
          <text x="${node.x + 14}" y="${node.y + 28}" font-size="14" font-weight="800">${escapeHtml(node.title)}</text>
          <text x="${node.x + 14}" y="${node.y + 46}" font-size="10" fill="#666">${escapeHtml(node.subtitle)}</text>
        </g>`;
    })
    .join("");
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
      ${nodeMarkup}
      ${terminalMarkup}
    </svg>
  `.trim();
}

function contentBounds() {
  if (!state.nodes.length) return { x: 0, y: 0, w: 1200, h: 800 };
  const minX = Math.min(...state.nodes.map((node) => node.x));
  const minY = Math.min(...state.nodes.map((node) => node.y));
  const maxX = Math.max(...state.nodes.map((node) => node.x + node.w));
  const maxY = Math.max(...state.nodes.map((node) => node.y + node.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function downloadSvg() {
  downloadText(buildExportSvg(), "svg", "image/svg+xml");
  toast("SVGを書き出しました");
}

async function downloadPng() {
  const svg = buildExportSvg();
  const image = new Image();
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
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
  URL.revokeObjectURL(svgUrl);
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename("png");
    link.click();
    URL.revokeObjectURL(url);
    toast("PNGを書き出しました");
  }, "image/png");
}

function preparePrint() {
  const rows = makeInputRows();
  dom.printTitle.textContent = state.name || "GearFlow";
  dom.printMeta.textContent = `Generated ${new Date().toLocaleString("ja-JP")} · ${state.nodes.length} gear · ${state.edges.length} cables`;
  dom.printNotes.textContent = state.notes || "No notes";
  dom.printDiagram.innerHTML = buildExportSvg();
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
  if (!confirm("すべての機材と接続を削除しますか？")) return;
  state.nodes = [];
  state.edges = [];
  state.selected = new Set();
  state.selectedEdge = null;
  state.connecting = null;
  state.portDrag = null;
  state.portPopover = null;
  commit("クリアしました");
  toast("キャンバスをクリアしました");
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
  if (!ids.size && state.selectedEdge) {
    state.edges = state.edges.filter((edge) => edge.id !== state.selectedEdge);
    state.selectedEdge = null;
    state.connecting = null;
    state.portDrag = null;
    state.portPopover = null;
    commit("ケーブルを削除");
    return;
  }
  state.nodes = state.nodes.filter((node) => !ids.has(node.id));
  state.edges = state.edges.filter((edge) => !ids.has(edge.from.nodeId) && !ids.has(edge.to.nodeId));
  state.selected = new Set();
  state.connecting = null;
  state.portDrag = null;
  state.portPopover = null;
  commit("選択を削除");
}

function copySelection() {
  const ids = new Set(state.selected);
  const nodes = state.nodes.filter((node) => ids.has(node.id));
  if (!nodes.length) {
    toast("コピーする機材を選択してください");
    return;
  }
  const edges = state.edges.filter((edge) => ids.has(edge.from.nodeId) && ids.has(edge.to.nodeId));
  const payload = {
    format: "gearflow.selection",
    version: VERSION,
    nodes: clone(nodes),
    edges: clone(edges),
    pasteCount: 0,
  };
  state.clipboard = payload;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(JSON.stringify(payload)).catch(() => {});
  }
  toast(`${nodes.length}個の機材をコピーしました`);
}

async function pasteSelection() {
  let payload = state.clipboard;
  if (!payload && navigator.clipboard?.readText) {
    try {
      const parsed = JSON.parse(await navigator.clipboard.readText());
      if (parsed?.format === "gearflow.selection") payload = parsed;
    } catch {
      payload = null;
    }
  }
  if (!payload?.nodes?.length) {
    toast("ペーストできる機材がありません");
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
  commit(`${newNodes.length}個の機材をペースト`);
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
  commit(axis === "x" ? "左揃え" : "上揃え");
}

function showHistory() {
  const versions = readVersions();
  dom.historyList.innerHTML = versions.length
    ? versions
        .map(
          (item) => `
        <div class="history-item">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <span>${new Date(item.savedAt).toLocaleString("ja-JP")} · ${item.nodes} nodes · ${item.edges} cables</span>
          </div>
          <button class="text-button" data-restore-version="${item.id}">復元</button>
        </div>
      `,
        )
        .join("")
    : `<div class="empty-state"><span>まだ履歴がありません。</span></div>`;
  dom.historyDialog.showModal();
}

function setMenuOpen(open) {
  dom.appMenu.classList.toggle("hidden", !open);
  dom.menuBtn.setAttribute("aria-expanded", String(open));
}

function toggleMenu() {
  setMenuOpen(dom.appMenu.classList.contains("hidden"));
}

function showDocumentDialog() {
  setMenuOpen(false);
  updateStorageMeter();
  dom.documentDialog.showModal();
}

function showStartDialog() {
  if (!dom.startDialog.open) dom.startDialog.showModal();
}

function closeStartDialog() {
  if (dom.startDialog.open) dom.startDialog.close();
}

function startBlankFlow() {
  state.nodes = [];
  state.edges = [];
  state.selected = new Set();
  state.selectedEdge = null;
  state.connecting = null;
  state.portDrag = null;
  state.portPopover = null;
  closeStartDialog();
  if (!state.history.length) pushHistory();
  render();
  scheduleAutosave("まっさらで開始");
}

function restoreVersion(id) {
  const item = readVersions().find((version) => version.id === id);
  if (!item) return;
  restoreSnapshot(JSON.parse(item.payload));
  dom.historyDialog.close();
  toast("履歴から復元しました");
}

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      restoreSnapshot(JSON.parse(reader.result));
      toast("ファイルを読み込みました");
    } catch {
      toast("JSONの読み込みに失敗しました");
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

function seedProject() {
  state.nodes = [
    { ...makeNode(templates[0], 560, 680), title: "Lead Vocal", subtitle: "SM58" },
    { ...makeNode(templates[4], 560, 910), title: "Main Synth", subtitle: "Stereo out" },
    { ...makeNode(templates[1], 815, 910), title: "DI L", subtitle: "Keys left" },
    { ...makeNode(templates[3], 1110, 690), title: "Stagebox", subtitle: "Venue" },
    { ...makeNode(templates[2], 1100, 930), title: "FOH Mixer", subtitle: "House" },
    { ...makeNode(templates[7], 820, 1160), title: "Monitor 1", subtitle: "Vocal wedge" },
  ];
  const n = state.nodes;
  state.edges = [
    {
      id: uid("edge"),
      from: { nodeId: n[0].id, side: "right", offset: 0.5, kind: "xlr-m" },
      to: { nodeId: n[3].id, side: "left", offset: 0.22, kind: "xlr-f" },
      lineStyle: "solid",
      color: "#111",
      width: 3,
    },
    {
      id: uid("edge"),
      from: { nodeId: n[1].id, side: "right", offset: 0.5, kind: "trs" },
      to: { nodeId: n[2].id, side: "left", offset: 0.45, kind: "ts" },
      lineStyle: "solid",
      color: "#111",
      width: 3,
    },
    {
      id: uid("edge"),
      from: { nodeId: n[2].id, side: "right", offset: 0.5, kind: "xlr-m" },
      to: { nodeId: n[3].id, side: "left", offset: 0.45, kind: "xlr-f" },
      lineStyle: "solid",
      color: "#111",
      width: 3,
    },
    {
      id: uid("edge"),
      from: { nodeId: n[3].id, side: "bottom", offset: 0.55, kind: "trs" },
      to: { nodeId: n[5].id, side: "top", offset: 0.5, kind: "xlr-f" },
      lineStyle: "solid",
      color: "#111",
      width: 3,
    },
  ];
  state.edges.forEach((edge) => {
    edge.signalType = inferSignalType(edgeEndpointKind(edge, "from"), edgeEndpointKind(edge, "to"));
  });
  autoPlacePortsForEdges();
}

function applyTemplate(kind) {
  closeStartDialog();
  pushHistory();
  state.nodes = [];
  state.edges = [];
  if (kind === "dj") {
    state.nodes = [
      { ...makeNode(templates[5], 560, 820), title: "DJ Mixer", subtitle: "Performer" },
      { ...makeNode(templates[1], 835, 760), title: "DI L", subtitle: "RCA to XLR" },
      { ...makeNode(templates[1], 835, 960), title: "DI R", subtitle: "RCA to XLR" },
      { ...makeNode(templates[3], 1120, 860), title: "Stagebox", subtitle: "Venue" },
    ];
    const n = state.nodes;
    state.edges = [
      { id: uid("edge"), from: { nodeId: n[0].id, side: "right", offset: 0.34, kind: "rca" }, to: { nodeId: n[1].id, side: "left", offset: 0.5, kind: "ts" }, lineStyle: "solid", color: "#111", width: 3 },
      { id: uid("edge"), from: { nodeId: n[0].id, side: "right", offset: 0.58, kind: "rca" }, to: { nodeId: n[2].id, side: "left", offset: 0.5, kind: "ts" }, lineStyle: "solid", color: "#111", width: 3 },
      { id: uid("edge"), from: { nodeId: n[1].id, side: "right", offset: 0.5, kind: "xlr-m" }, to: { nodeId: n[3].id, side: "left", offset: 0.34, kind: "xlr-f" }, lineStyle: "solid", color: "#111", width: 3 },
      { id: uid("edge"), from: { nodeId: n[2].id, side: "right", offset: 0.5, kind: "xlr-m" }, to: { nodeId: n[3].id, side: "left", offset: 0.58, kind: "xlr-f" }, lineStyle: "solid", color: "#111", width: 3 },
    ];
    state.edges.forEach((edge) => {
      edge.signalType = inferSignalType(edgeEndpointKind(edge, "from"), edgeEndpointKind(edge, "to"));
    });
    autoPlacePortsForEdges();
  } else {
    seedProject();
  }
  state.selected = new Set();
  state.connecting = null;
  state.portDrag = null;
  render();
  scheduleAutosave("テンプレートを適用");
  toast("テンプレートを適用しました");
}

function bindEvents() {
  dom.librarySearch.addEventListener("input", renderLibrary);
  dom.canvasFrame.addEventListener("pointerdown", startPan);
  dom.edgeLayer.addEventListener("click", (event) => {
    if (event.target.classList.contains("patch-cable-hit")) return;
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
    if (event.dataTransfer.types.includes("application/x-gearflow-template")) {
      event.preventDefault();
      document.body.classList.add("drop-active");
    }
  });
  dom.canvasFrame.addEventListener("dragleave", () => document.body.classList.remove("drop-active"));
  dom.canvasFrame.addEventListener("drop", (event) => {
    document.body.classList.remove("drop-active");
    const type = event.dataTransfer.getData("application/x-gearflow-template");
    if (!type) return;
    event.preventDefault();
    const template = templates.find((item) => item.type === type);
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
  $("#copyBtn").addEventListener("click", copySelection);
  $("#pasteBtn").addEventListener("click", pasteSelection);
  $("#alignLeftBtn").addEventListener("click", () => alignSelected("x"));
  $("#alignTopBtn").addEventListener("click", () => alignSelected("y"));
  $("#saveBtn").addEventListener("click", downloadJson);
  $("#pngBtn").addEventListener("click", downloadPng);
  $("#svgBtn").addEventListener("click", downloadSvg);
  $("#pdfBtn").addEventListener("click", () => {
    preparePrint();
    window.print();
  });
  $("#clearBtn").addEventListener("click", clearAll);
  dom.menuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu();
  });
  $("#documentMenuItem").addEventListener("click", showDocumentDialog);
  $("#historyBtn").addEventListener("click", showHistory);
  $("#loadBtn").addEventListener("click", () => dom.fileInput.click());
  $("#closeHistoryBtn").addEventListener("click", () => dom.historyDialog.close());
  $("#closeDocumentBtn").addEventListener("click", () => dom.documentDialog.close());
  $("#closeStartBtn").addEventListener("click", closeStartDialog);
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
  $("#addBlankBtn").addEventListener("click", () => addNode({ ...templates[1], title: "Custom Gear", subtitle: "New device" }, screenToWorld(window.innerWidth / 2, window.innerHeight / 2)));
  dom.edgeInspector.addEventListener("input", handleEdgeInspectorInput);
  dom.edgeInspector.addEventListener("change", handleEdgeInspectorChange);
  dom.edgeInspector.addEventListener("click", handleEdgeInspectorClick);
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
    if (!event.target.closest(".menu-wrap")) setMenuOpen(false);
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
      setMenuOpen(false);
      closeStartDialog();
      state.connecting = null;
      state.portDrag = null;
      state.selectedEdge = null;
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
  renderEdges();
  renderNodes();
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
  if (event.target.closest("#autoPlaceEdgeBtn")) {
    autoPlaceConnectedPortsForNodeIds([edge.from.nodeId, edge.to.nodeId]);
    renderEdges();
    renderNodes();
    renderInspector();
    toast("端子を近い辺へ自動配置しました");
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
    commit("端子を削除");
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
    commit("端子を削除");
  }
  if (sideButton) {
    const portId = sideButton.parentElement.dataset.portSide;
    getPort(node, portId).side = sideButton.dataset.side;
    commit("端子位置を変更");
  }
}

function loadInitial() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      restoreSnapshot(JSON.parse(saved));
      toast("前回の状態を復元しました");
      return;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  pushHistory();
  render();
  showStartDialog();
  dom.saveStatus.textContent = "New flow";
}

bindEvents();
loadInitial();
updateStorageMeter();
