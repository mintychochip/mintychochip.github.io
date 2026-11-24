const types = [
  {
    id: "classic",
    name: "Classic",
    note: "Cormorant / Great Vibes",
    display: "'Cormorant Garamond', serif",
    nameWeight: 300,
    nameSize: "46px",
    nameTracking: "0",
    nameTransform: "none",
    script: "'Great Vibes', cursive",
    scriptStyle: "normal",
    scriptWeight: 400,
    body: "'Cormorant Garamond', serif",
    label: "'Cormorant Garamond', serif",
    labelWeight: 500,
    labelTracking: "0.2em",
  },
  {
    id: "editorial",
    name: "Editorial",
    note: "Bodoni / Pinyon",
    display: "'Bodoni Moda', serif",
    nameWeight: 400,
    nameSize: "40px",
    nameTracking: "0.01em",
    nameTransform: "none",
    script: "'Pinyon Script', cursive",
    scriptStyle: "normal",
    scriptWeight: 400,
    body: "'Cormorant Garamond', serif",
    label: "'Jost', sans-serif",
    labelWeight: 400,
    labelTracking: "0.26em",
  },
  {
    id: "modern",
    name: "Modern",
    note: "Jost / Cormorant",
    display: "'Jost', sans-serif",
    nameWeight: 300,
    nameSize: "30px",
    nameTracking: "0.1em",
    nameTransform: "uppercase",
    script: "'Cormorant Garamond', serif",
    scriptStyle: "italic",
    scriptWeight: 400,
    body: "'Cormorant Garamond', serif",
    label: "'Jost', sans-serif",
    labelWeight: 400,
    labelTracking: "0.3em",
  },
  {
    id: "garden",
    name: "Garden",
    note: "Marcellus / Italianno",
    display: "'Marcellus', serif",
    nameWeight: 400,
    nameSize: "38px",
    nameTracking: "0.03em",
    nameTransform: "none",
    script: "'Italianno', cursive",
    scriptStyle: "normal",
    scriptWeight: 400,
    body: "'Cormorant Garamond', serif",
    label: "'Jost', sans-serif",
    labelWeight: 300,
    labelTracking: "0.28em",
  },
  {
    id: "romantic",
    name: "Romantic",
    note: "Cormorant / Monsieur",
    display: "'Cormorant Garamond', serif",
    nameWeight: 300,
    nameSize: "46px",
    nameTracking: "0",
    nameTransform: "none",
    script: "'Monsieur La Doulaise', cursive",
    scriptStyle: "normal",
    scriptWeight: 400,
    body: "'Cormorant Garamond', serif",
    label: "'Jost', sans-serif",
    labelWeight: 400,
    labelTracking: "0.24em",
  },
  {
    id: "stationery",
    name: "Stationery",
    note: "EB Garamond / Alex Brush",
    display: "'EB Garamond', serif",
    nameWeight: 500,
    nameSize: "42px",
    nameTracking: "0",
    nameTransform: "none",
    script: "'Alex Brush', cursive",
    scriptStyle: "normal",
    scriptWeight: 400,
    body: "'EB Garamond', serif",
    label: "'EB Garamond', serif",
    labelWeight: 500,
    labelTracking: "0.18em",
  },
  {
    id: "floral",
    name: "Floral",
    note: "Playfair / Parisienne",
    display: "'Playfair Display', serif",
    nameWeight: 400,
    nameSize: "40px",
    nameTracking: "0",
    nameTransform: "none",
    script: "'Parisienne', cursive",
    scriptStyle: "normal",
    scriptWeight: 400,
    body: "'EB Garamond', serif",
    label: "'Jost', sans-serif",
    labelWeight: 400,
    labelTracking: "0.24em",
  },
  {
    id: "calligraphy",
    name: "Calligraphy",
    note: "Cormorant / Tangerine",
    display: "'Cormorant Garamond', serif",
    nameWeight: 300,
    nameSize: "46px",
    nameTracking: "0",
    nameTransform: "none",
    script: "'Tangerine', cursive",
    scriptStyle: "normal",
    scriptWeight: 700,
    body: "'Cormorant Garamond', serif",
    label: "'Jost', sans-serif",
    labelWeight: 400,
    labelTracking: "0.22em",
  },
  {
    id: "literary",
    name: "Literary",
    note: "EB Garamond / Cormorant",
    display: "'EB Garamond', serif",
    nameWeight: 400,
    nameSize: "42px",
    nameTracking: "0.01em",
    nameTransform: "none",
    script: "'Cormorant Garamond', serif",
    scriptStyle: "italic",
    scriptWeight: 400,
    body: "'EB Garamond', serif",
    label: "'Jost', sans-serif",
    labelWeight: 400,
    labelTracking: "0.24em",
  },
  {
    id: "deco",
    name: "Deco",
    note: "Cinzel / Cormorant",
    display: "'Cinzel', serif",
    nameWeight: 400,
    nameSize: "32px",
    nameTracking: "0.1em",
    nameTransform: "uppercase",
    script: "'Cormorant Garamond', serif",
    scriptStyle: "italic",
    scriptWeight: 400,
    body: "'Cormorant Garamond', serif",
    label: "'Jost', sans-serif",
    labelWeight: 400,
    labelTracking: "0.32em",
  },
  {
    id: "novel",
    name: "Novel",
    note: "Libre Baskerville / Great Vibes",
    display: "'Libre Baskerville', serif",
    nameWeight: 400,
    nameSize: "34px",
    nameTracking: "0.01em",
    nameTransform: "none",
    script: "'Great Vibes', cursive",
    scriptStyle: "normal",
    scriptWeight: 400,
    body: "'Libre Baskerville', serif",
    label: "'Jost', sans-serif",
    labelWeight: 400,
    labelTracking: "0.24em",
  },
  {
    id: "quiet",
    name: "Quiet",
    note: "Manrope / Cormorant",
    display: "'Manrope', sans-serif",
    nameWeight: 300,
    nameSize: "30px",
    nameTracking: "0.12em",
    nameTransform: "uppercase",
    script: "'Cormorant Garamond', serif",
    scriptStyle: "italic",
    scriptWeight: 400,
    body: "'Cormorant Garamond', serif",
    label: "'Manrope', sans-serif",
    labelWeight: 400,
    labelTracking: "0.26em",
  },
];

const monograms = [
  { id: "serif", name: "Serif", note: "Letters, spaced", className: "mono-serif" },
  { id: "script", name: "Script", note: "Handwritten", className: "mono-script" },
  { id: "framed", name: "Framed", note: "A circle and two letters", className: "mono-framed" },
  { id: "none", name: "None", note: "Just the names", className: "mono-none" },
];

const buttons = [
  { id: "pill", name: "Pill", note: "Soft and rounded", className: "btn-pill" },
  { id: "rect", name: "Rectangle", note: "Crisp corners", className: "btn-rect" },
  { id: "rule", name: "Text & rule", note: "Quiet and understated", className: "btn-rule" },
];

const frames = [
  { id: "scallop", name: "Scallop", note: "Our current shape", className: "frame-scallop" },
  { id: "arch", name: "Arch", note: "A soft dome", className: "frame-arch" },
  { id: "round", name: "Rounded", note: "A simple rectangle", className: "frame-round" },
];

const wave = `<svg class="frame-sample__wave" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0,90 L0,46 C70,46 70,16 140,16 C210,16 210,46 280,46 C350,46 350,16 420,16 C490,16 490,46 560,46 C630,46 630,16 700,16 C770,16 770,46 840,46 C910,46 910,16 980,16 C1050,16 1050,46 1120,46 C1160,46 1180,40 1200,34 L1200,90 Z" fill="var(--paper)"/></svg>`;

const defaultState = { type: "classic", monogram: "serif", button: "pill", frame: "scallop" };
const state = { ...defaultState };

const params = new URLSearchParams(location.search);
for (const key of Object.keys(defaultState)) {
  const value = params.get(key);
  const exists =
    key === "type"
      ? types.some((item) => item.id === value)
      : key === "monogram"
        ? monograms.some((item) => item.id === value)
        : key === "button"
          ? buttons.some((item) => item.id === value)
          : frames.some((item) => item.id === value);
  if (value && exists) state[key] = value;
}

const typeGrid = document.getElementById("typeGrid");
const monogramGrid = document.getElementById("monogramGrid");
const buttonGrid = document.getElementById("buttonGrid");
const frameGrid = document.getElementById("frameGrid");
const preview = document.getElementById("preview");
const previewMedia = document.getElementById("previewMedia");
const previewMonogram = document.getElementById("previewMonogram");
const previewButton = document.getElementById("previewButton");
const pickLabel = document.getElementById("pickLabel");
const copyBtn = document.getElementById("copyBtn");
const resetBtn = document.getElementById("resetBtn");

function renderTypes() {
  typeGrid.innerHTML = types
    .map(
      (type) => `
      <label class="type-card${state.type === type.id ? " is-selected" : ""}">
        <input class="sr-only" type="radio" name="type" value="${type.id}" ${state.type === type.id ? "checked" : ""} />
        <span class="type-card__check" aria-hidden="true"></span>
        <span class="type-card__top">
          <span class="type-card__aa" style="font-family:${type.display};font-weight:${type.nameWeight}">Aa</span>
          <span class="type-card__meta">
            <span class="type-card__name" style="font-family:${type.display}">${type.name}</span>
            <span class="type-card__note">${type.note}</span>
          </span>
        </span>
        <span class="type-card__sample" style="font-family:${type.display};font-weight:${type.nameWeight};text-transform:${type.nameTransform};letter-spacing:${type.nameTracking}">Justin &amp; Ashley</span>
        <span class="type-card__script" style="font-family:${type.script};font-style:${type.scriptStyle};font-weight:${type.scriptWeight}">The Journey</span>
        <span class="type-card__label" style="font-family:${type.label};font-weight:${type.labelWeight};letter-spacing:${type.labelTracking}">Together with great joy</span>
        <span class="type-card__body" style="font-family:${type.body}">A quiet lake, a long table, everyone we love.</span>
      </label>`,
    )
    .join("");
}

function renderMonograms() {
  monogramGrid.innerHTML = monograms
    .map(
      (item) => `
      <label class="option-card${state.monogram === item.id ? " is-selected" : ""}">
        <input class="sr-only" type="radio" name="monogram" value="${item.id}" ${state.monogram === item.id ? "checked" : ""} />
        <span class="option-card__check" aria-hidden="true"></span>
        <span class="monogram-sample ${item.className}">${item.id === "none" ? "—" : "J &amp; A"}</span>
        <span class="option-card__name">${item.name}</span>
        <span class="option-card__note">${item.note}</span>
      </label>`,
    )
    .join("");
}

function renderButtons() {
  buttonGrid.innerHTML = buttons
    .map(
      (item) => `
      <label class="option-card option-card--button${state.button === item.id ? " is-selected" : ""}">
        <input class="sr-only" type="radio" name="button" value="${item.id}" ${state.button === item.id ? "checked" : ""} />
        <span class="option-card__check" aria-hidden="true"></span>
        <span class="button-sample ${item.className}">You’re invited</span>
        <span class="option-card__name">${item.name}</span>
        <span class="option-card__note">${item.note}</span>
      </label>`,
    )
    .join("");
}

function renderFrames() {
  frameGrid.innerHTML = frames
    .map(
      (item) => `
      <label class="option-card option-card--frame${state.frame === item.id ? " is-selected" : ""}">
        <input class="sr-only" type="radio" name="frame" value="${item.id}" ${state.frame === item.id ? "checked" : ""} />
        <span class="option-card__check" aria-hidden="true"></span>
        <span class="frame-sample ${item.className}">
          <img src="hero.jpg" alt="" />
          ${wave}
        </span>
        <span class="option-card__name">${item.name}</span>
        <span class="option-card__note">${item.note}</span>
      </label>`,
    )
    .join("");
}

function markSelected(grid, name, value) {
  for (const label of grid.querySelectorAll("label")) {
    const input = label.querySelector("input");
    const selected = input.value === value;
    label.classList.toggle("is-selected", selected);
    input.checked = selected;
  }
}

function applyPreview() {
  const type = types.find((item) => item.id === state.type) ?? types[0];
  const monogram = monograms.find((item) => item.id === state.monogram) ?? monograms[0];
  const button = buttons.find((item) => item.id === state.button) ?? buttons[0];
  const frame = frames.find((item) => item.id === state.frame) ?? frames[0];

  preview.style.setProperty("--display", type.display);
  preview.style.setProperty("--body", type.body);
  preview.style.setProperty("--script", type.script);
  preview.style.setProperty("--label", type.label);
  preview.style.setProperty("--name-weight", String(type.nameWeight));
  preview.style.setProperty("--name-size", type.nameSize);
  preview.style.setProperty("--name-tracking", type.nameTracking);
  preview.style.setProperty("--name-transform", type.nameTransform);
  preview.style.setProperty("--label-weight", String(type.labelWeight));
  preview.style.setProperty("--label-tracking", type.labelTracking);
  preview.style.setProperty("--script-style", type.scriptStyle);
  preview.style.setProperty("--script-weight", String(type.scriptWeight));

  previewMonogram.className = `preview__monogram ${monogram.className}`;
  previewButton.className = `preview__pill ${button.className}`;
  previewMedia.className = `preview__media ${frame.className}`;

  pickLabel.textContent = `${type.name} · ${monogram.name} · ${button.name} · ${frame.name}`;
}

function syncUrl() {
  const next = new URLSearchParams();
  for (const key of Object.keys(defaultState)) next.set(key, state[key]);
  history.replaceState(null, "", `${location.pathname}?${next.toString()}`);
}

function update() {
  applyPreview();
  syncUrl();
}

renderTypes();
renderMonograms();
renderButtons();
renderFrames();
applyPreview();

typeGrid.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLInputElement)) return;
  state.type = event.target.value;
  markSelected(typeGrid, "type", state.type);
  update();
});

monogramGrid.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLInputElement)) return;
  state.monogram = event.target.value;
  markSelected(monogramGrid, "monogram", state.monogram);
  update();
});

buttonGrid.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLInputElement)) return;
  state.button = event.target.value;
  markSelected(buttonGrid, "button", state.button);
  update();
});

frameGrid.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLInputElement)) return;
  state.frame = event.target.value;
  markSelected(frameGrid, "frame", state.frame);
  update();
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    const old = copyBtn.innerHTML;
    copyBtn.textContent = "Link copied";
    window.setTimeout(() => {
      copyBtn.innerHTML = old;
    }, 2200);
  } catch {
    window.prompt("Copy this link", location.href);
  }
});

resetBtn.addEventListener("click", () => {
  Object.assign(state, defaultState);
  markSelected(typeGrid, "type", state.type);
  markSelected(monogramGrid, "monogram", state.monogram);
  markSelected(buttonGrid, "button", state.button);
  markSelected(frameGrid, "frame", state.frame);
  update();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
