/* 0 → Shipped Resume Parser — mock analyzer (no server, no build step) */

const ALL_SKILLS = [
  "Python", "JavaScript", "TypeScript", "Java", "C#", "Go", "Rust", "SQL",
  "HTML", "CSS", "React", "Node.js", "Django", "Flask", "Spring Boot",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git", "CI/CD",
  "MongoDB", "PostgreSQL", "Redis", "REST APIs", "GraphQL", "Microservices",
  "Machine Learning", "Deep Learning", "Data Analysis", "Pandas", "NumPy",
  "System Design", "Testing", "TDD", "Agile", "Linux", "Bash",
];

const SKILLS_BY_CATEGORY = {
  Languages: ["Python", "JavaScript", "TypeScript", "Java", "C#", "Go", "SQL"],
  Frameworks: ["React", "Node.js", "Django", "Spring Boot", "REST APIs"],
  Cloud & DevOps: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Git", "Linux"],
  Data: ["PostgreSQL", "MongoDB", "Redis", "Pandas", "NumPy"],
  Core CS: ["System Design", "Microservices", "Testing", "Agile"],
  Extras: ["Machine Learning", "GraphQL", "TDD", "Bash", "Go", "Rust", "Flask"],
};

const PIPELINE_STEPS = [
  "Reading file…",
  "Extracting text…",
  "Matching against tracked skills…",
  "Scoring resume…",
  "Building report…",
];

const dom = {
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("file-input"),
  uploadError: document.getElementById("upload-error"),
  progress: document.getElementById("progress"),
  progressBar: document.getElementById("progress-bar"),
  progressStep: document.getElementById("progress-step"),
  progressFile: document.getElementById("progress-file"),
  progressSize: document.getElementById("progress-size"),
  results: document.getElementById("results"),
  resultsFile: document.getElementById("results-file"),
  reset: document.getElementById("reset"),
  scoreValue: document.getElementById("score-value"),
  ringFill: document.getElementById("ring-fill"),
  verdict: document.getElementById("score-verdict"),
  scoreSummary: document.getElementById("score-summary"),
  presentList: document.getElementById("present-list"),
  missingList: document.getElementById("missing-list"),
  presentCount: document.getElementById("present-count"),
  missingCount: document.getElementById("missing-count"),
};

/* ---------- Mock analyzer ----------
 * Deterministic: the same file name + size always produces the same score,
 * so re-uploading the same resume gives a stable demo result.
 */
function mockAnalyze(file) {
  const seed = hashString(`${file.name}:${file.size}`);
  const rng = mulberry32(seed);

  // 12–22 skills present, rest of the categories' skills are missing.
  const presentCount = 12 + Math.floor(rng() * 11);
  const allCategorySkills = [...new Set(Object.values(SKILLS_BY_CATEGORY).flat())];
  const shuffled = [...allCategorySkills].sort(() => rng() - 0.5);
  const present = shuffled.slice(0, presentCount);
  const missing = shuffled.slice(presentCount);

  // Weighted score: coverage across categories + volume, 32–88 range for realism.
  const categoryCoverage =
    Object.keys(SKILLS_BY_CATEGORY).filter((cat) =>
      SKILLS_BY_CATEGORY[cat].some((skill) => present.includes(skill))
    ).length / Object.keys(SKILLS_BY_CATEGORY).length;

  const coverage = categoryCoverage * 60;               // breadth across categories
  const depth = (present.length / allCategorySkills.length) * 25; // volume
  const noise = Math.floor(rng() * 8);                  // a little variance
  const score = Math.min(96, Math.max(32, Math.round(coverage + depth + noise)));

  return { score, present, missing };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Pipeline animation ---------- */

function animatePipeline(file) {
  dom.progress.hidden = false;
  dom.results.hidden = true;
  dom.uploadError.hidden = true;
  dom.progressFile.textContent = file.name;
  dom.progressSize.textContent = formatSize(file.size);

  let stepIndex = 0;
  const stepDuration = 700;

  function tick() {
    dom.progressStep.textContent = PIPELINE_STEPS[stepIndex];
    const progressPct = ((stepIndex + 1) / PIPELINE_STEPS.length) * 100;
    dom.progressBar.style.width = `${progressPct}%`;
    stepIndex++;

    if (stepIndex < PIPELINE_STEPS.length) {
      setTimeout(tick, stepDuration);
    } else {
      setTimeout(() => showResults(file), 400);
      // Wait for the bar to finish before swapping to results.
    }
  }
  tick();
}

/* ---------- Results ---------- */

function showResults(file) {
  const { score, present, missing } = mockAnalyze(file);

  dom.results.hidden = true;
  dom.progress.hidden = true;

  dom.resultsFile.textContent = file.name;
  dom.scoreValue.textContent = score;
  dom.ringFill.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - score / 100));
  dom.verdict.textContent = verdictFor(score);
  dom.scoreSummary.textContent =
    `${present.length} of ${present.length + missing.length} tracked skills matched.`;

  renderChips(dom.presentList, present);
  renderChips(dom.missingList, missing);
  dom.presentCount.textContent = present.length;
  dom.missingCount.textContent = missing.length;

  dom.results.hidden = false;
  dom.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

const CIRCUMFERENCE = 2 * Math.PI * 54;

function verdictFor(score) {
  if (score >= 80) return "Strong resume — ship it.";
  if (score >= 60) return "Good base, tighten the gaps.";
  if (score >= 40) return "Needs work before shipping.";
  return "Barely started — big gaps.";
}

function renderChips(listEl, skills) {
  listEl.innerHTML = "";
  skills.forEach((skill) => {
    const li = document.createElement("li");
    li.textContent = skill;
    listEl.appendChild(li);
  });
}

/* ---------- File handling ---------- */

function handleFile(file) {
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    dom.uploadError.hidden = false;
    dom.uploadError.textContent = "That's not a PDF. Drop a PDF resume and try again.";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    dom.uploadError.textContent = "File too large — 10 MB max for this demo.";
    dom.uploadError.hidden = false;
    return;
  }
  animatePipeline(file);
}

/* ---------- Events ---------- */

dom.dropzone.addEventListener("click", () => dom.fileInput.click());

dom.dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    dom.fileInput.click();
  }
});

["dragenter", "dragover"].forEach((evt) =>
  dom.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dom.dropzone.classList.add("dragover");
  })
);

["dragleave", "drop"].forEach((evt) =>
  dom.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dom.dropzone.classList.remove("dragover");
  })
);

dom.dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  handleFile(file);
});

dom.fileInput.addEventListener("change", () => {
  handleFile(dom.fileInput.files[0]);
  dom.fileInput.value = ""; // allow re-uploading the same file
});

dom.reset.addEventListener("click", () => {
  dom.results.hidden = true;
  dom.progress.hidden = true;
  dom.progressBar.style.width = "0%";
  dom.uploadError.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
