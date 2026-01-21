const CSV_PATH = "./pages.csv";

// Element
const gridEl = document.getElementById("grid");
const groupsEl = document.getElementById("filterGroups");
const countEl = document.getElementById("resultsCount");
const sortEl = document.getElementById("sortSelect");
const clearBtn = document.getElementById("clearBtn");
const activeFiltersEl = document.getElementById("activeFilters");

// State
let rows = [];
const state = {
  sort: "relevant",
  filters: {
    page_type: new Set(),
    category: new Set(),
    activity: new Set(),
  }
};

// Helpers
function normText(v){
  return (v ?? "").toString().trim();
}
function normKey(v){
  return (v ?? "").toString().trim().toLowerCase();
}

function uniqSorted(values){
  return [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}

function parseDate(d){
  // expects YYYY-MM-DD; fallback to epoch 0
  const s = normText(d);
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

function getTemplateImage(pageType){
  // If your CSV already has image_url per row, use that.
  // Otherwise fallback by type.
  switch ((pageType || "").toLowerCase()){
    case "technology": return "images/technology.jpg";
    case "inspiration": return "images/inspiration.jpg";
    case "news": return "images/news.jpg";
    case "helmets": return "images/helmets.jpg";
    default: return "images/helmets.jpg";
  }
}

function buildFilterGroup(key, label, values, openByDefault=true){
  const details = document.createElement("details");
  if(openByDefault) details.open = true;

  const summary = document.createElement("summary");
  summary.textContent = label;
  details.appendChild(summary);

  const box = document.createElement("div");
  box.className = "group";

  values.forEach(v=>{
    const vv = normKey(v);
    const id = `${key}:${vv}`.replace(/\s+/g,"_").toLowerCase();

    const wrap = document.createElement("label");
    wrap.className = "check";
    wrap.setAttribute("for", id);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.dataset.filterKey = key;
    input.value = vv;

    input.addEventListener("change", (e)=>{
      const k = e.target.dataset.filterKey;
      const val = e.target.value;
      if(e.target.checked) state.filters[k].add(val);
      else state.filters[k].delete(val);
      render();
    });

    const text = document.createElement("span");
    text.textContent = vv;
    const cnt = document.createElement("span");
    cnt.className = "count";
    cnt.textContent = ""; // fylls vid render()
    cnt.dataset.countKey = key;
    cnt.dataset.countValue = vv;
    wrap.appendChild(input);
    wrap.appendChild(text);
    wrap.appendChild(cnt);
    box.appendChild(wrap);
  });

  details.appendChild(box);
  return details;
}

function buildFiltersFromData(){
  const pageTypes = uniqSorted(rows.map(r=>normKey(r.page_type)));
  const categories = uniqSorted(rows.map(r=>normKey(r.category)));
  const activities = uniqSorted(rows.map(r=>normKey(r.activity)));

  groupsEl.innerHTML = "";
  groupsEl.appendChild(buildFilterGroup("page_type", "Page type", pageTypes, true));
  groupsEl.appendChild(buildFilterGroup("category", "Category", categories, true));
  groupsEl.appendChild(buildFilterGroup("activity", "Activity", activities, false));
}

function matchesFilters(r){
  // OR within group, AND across groups
  const checks = ["page_type","category","activity"].map(k=>{
    const active = state.filters[k];
    if(active.size === 0) return true;
    return active.has(normKey(r[k]));
  });
  return checks.every(Boolean);
}

function relevanceScore(r){
  // simple scoring: how many active groups does this row match?
  // (only counts groups that actually have active selections)
  let score = 0;
  ["page_type","category","activity"].forEach(k=>{
    const active = state.filters[k];
    if(active.size === 0) return;
    if(active.has(normKey(r[k]))) score += 1;
  });
  return score;
}

function sortRows(list){
  if(state.sort === "newest"){
    return [...list].sort((a,b)=>parseDate(b.publish_date) - parseDate(a.publish_date));
  }
  // "Most relevant": score desc, then newest desc as tie-breaker
  return [...list].sort((a,b)=>{
    const s = relevanceScore(b) - relevanceScore(a);
    if(s !== 0) return s;
    return parseDate(b.publish_date) - parseDate(a.publish_date);
  });
}

function renderActiveFilters(){
    const items = [];
  
    ["page_type","category","activity"].forEach(k=>{
      state.filters[k].forEach(v=>{
        items.push({ key: k, value: v });
      });
    });
  
    activeFiltersEl.innerHTML = "";
  
    if(items.length === 0){
      const label = document.createElement("span");
      label.className = "active-filters__label";
      label.textContent = "All content";
      activeFiltersEl.appendChild(label);
      return;
    }
  
    const label = document.createElement("span");
    label.className = "active-filters__label";
    label.textContent = "Active:";
    activeFiltersEl.appendChild(label);
  
    items.forEach(({key,value})=>{
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = `${value} ×`;
      btn.setAttribute("aria-label", `Remove ${value} filter`);

      btn.addEventListener("click", ()=>{
        state.filters[key].delete(value);
  
        // uncheck corresponding checkbox
        const id = `${key}:${normKey(value)}`.replace(/\s+/g,"_").toLowerCase();
        const cb = document.getElementById(id);
        if (cb) cb.checked = false;
  
        render();
      });
  
      activeFiltersEl.appendChild(btn);
    });
  }

  function computeCounts(){
    // För varje filterval, räkna hur många rader som skulle matcha
    // med nuvarande filter i de andra grupperna.
    const keys = ["page_type","category","activity"];
  
    const counts = {
      page_type: new Map(),
      category: new Map(),
      activity: new Map(),
    };
  
    keys.forEach(targetKey=>{
      // bygg en “matcher” som ignorerar targetKey men respekterar övriga
      const otherKeys = keys.filter(k=>k!==targetKey);
  
      rows.forEach(r=>{
        // matcha andra grupper
        const ok = otherKeys.every(k=>{
          const active = state.filters[k];
          if(active.size === 0) return true;
          return active.has(normKey(r[k]));
        });
        if(!ok) return;
  
        const v = normKey(r[targetKey]);
        if(!v) return;
        counts[targetKey].set(v, (counts[targetKey].get(v) || 0) + 1);
      });
    });
  
    // uppdatera DOM
    groupsEl.querySelectorAll(".count").forEach(span=>{
      const k = span.dataset.countKey;
      const v = span.dataset.countValue;
      const n = counts[k]?.get(v) ?? 0;
      span.textContent = `${n}`;
    });
  }

function renderCard(r){
  const url = normText(r.url);
  const title = normText(r.title) || "Untitled";
  const pageType = normKey(r.page_type);
  const category = normKey(r.category);
  const activity = normKey(r.activity);

  const img = normText(r.image_url) || getTemplateImage(pageType);

  const card = document.createElement("article");
  card.className = "card";
  card.setAttribute("role","listitem");

  const media = document.createElement("div");
  media.className = "card__media";
  media.style.backgroundImage = `url("${img}")`;

  const body = document.createElement("div");
  body.className = "card__body";

  const h3 = document.createElement("h3");
  h3.className = "card__title";
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.textContent = title;
  h3.appendChild(a);

  const chips = document.createElement("div");
  chips.className = "chips";

  function chip(text, key, accent=false){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = accent ? "chip chip--accent" : "chip";
    btn.textContent = text;

    if (!key) return btn;
    btn.setAttribute("aria-label", `Filter by ${key.replace("_", " ")}: ${text}`);
  
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
  
      // Toggle filter state
      const set = state.filters[key];
      if (set.has(text)) set.delete(text);
      else set.add(text);
  
      // Sync checkbox UI
      const id = `${key}:${normKey(text)}`.replace(/\s+/g,"_").toLowerCase();
      const cb = document.getElementById(id);
      if (cb) cb.checked = set.has(text);
  
      render();
    });
  
    return btn;
  }

  if(pageType) chips.appendChild(chip(pageType, "page_type", true));
  if(category) chips.appendChild(chip(category, "category", false));
  if(activity) chips.appendChild(chip(activity, "activity", false));

  body.appendChild(h3);
  body.appendChild(chips);

  card.appendChild(media);
  card.appendChild(body);

  card.tabIndex = 0;
  card.dataset.url = url;
  card.setAttribute("aria-label", `${title} - Press Enter to open`);

card.addEventListener("click", (e) => {
  // om man klickar på en länk/chip ska vi inte dubbel-öppna
  const isInteractive = e.target.closest("a, button, input, label");
  if (isInteractive) return;
  window.open(url, "_blank", "noreferrer");
});

card.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    window.open(url, "_blank", "noreferrer");
  }
});

  return card;
}

function render(){
  const filtered = rows.filter(matchesFilters);
  const sorted = sortRows(filtered);

  countEl.textContent = `${sorted.length} results`;

  renderActiveFilters();
  computeCounts();
  
  gridEl.innerHTML = "";
  sorted.forEach(r=> gridEl.appendChild(renderCard(r)));
}

function clearAll(){
  state.filters.page_type.clear();
  state.filters.category.clear();
  state.filters.activity.clear();

  // uncheck all
  groupsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  render();
}

// Events
sortEl.addEventListener("change", (e)=>{
  state.sort = e.target.value;
  render();
});
clearBtn.addEventListener("click", clearAll);

if (!window.Papa) {
  countEl.textContent = "CSV parser not loaded";
}
if (window.Papa) Papa.parse(CSV_PATH, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: (result)=>{
    const pick = (r, keys) => {
      for (const k of keys) {
        if (r && Object.prototype.hasOwnProperty.call(r, k)) return r[k];
      }
      return "";
    };

    rows = (result.data || []).map(r=>({
      url: normText(pick(r, ["url", "URL", "Landing Page", "landing_page"])),
      title: normText(pick(r, ["title", "Title"])),
      image_url: normText(pick(r, ["image_url", "image url", "Image URL", "image"])),
      page_type: normKey(pick(r, ["page_type", "page type", "Page Type"])),
      category: normKey(pick(r, ["category", "Category"])),
      activity: normKey(pick(r, ["activity", "Activity"])),
      publish_date: normText(pick(r, ["publish_date", "publish date", "Publish Date"])),
    })).filter(r=>r.url && r.url.startsWith("http"));

    buildFiltersFromData();
    render();
  },
  error: ()=>{
    countEl.textContent = "Could not load pages.csv";
  }
});