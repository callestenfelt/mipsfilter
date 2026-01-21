const CSV_PATH = "./pages.csv";

// Elements
const gridEl = document.getElementById("grid");
const groupsEl = document.getElementById("filterGroups");
const countEl = document.getElementById("resultsCount");
const clearBtn = document.getElementById("clearBtn");
const activeFiltersEl = document.getElementById("activeFilters");

// Mobile filter elements
const filtersEl = document.querySelector(".filters");
const filterToggleBtn = document.getElementById("filterToggle");
const filterCloseBtn = document.getElementById("filterClose");
const filterOverlay = document.getElementById("filterOverlay");
const showResultsBtn = document.getElementById("showResultsBtn");
const sortBtns = document.querySelectorAll(".sort-btn");

// SVG icons for expand/collapse
const ICON_CHEVRON_DOWN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/></svg>';
const ICON_CHEVRON_UP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z"/></svg>';

// Category -> Activity mapping
const CATEGORY_ACTIVITIES = {
  "bike": ["cycling", "road cycling", "mtb"],
  "motorcycle": ["motorcycling", "mx", "atv"],
  "snow": ["skiing", "snowboarding", "snow sports"],
  "climbing": ["climbing"],
  "equestrian": ["horse riding"],
  "industrial": ["construction"],
  "team sports": ["hockey"],
  "action sports": ["skateboard"]
};

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

function buildCheckbox(key, value, labelText){
  const id = `${key}:${value}`.replace(/\s+/g,"_").toLowerCase();

  const wrap = document.createElement("label");
  wrap.className = "check";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.dataset.filterKey = key;
  input.value = value;

  input.addEventListener("change", (e)=>{
    const k = e.target.dataset.filterKey;
    const val = e.target.value;
    if(e.target.checked) state.filters[k].add(val);
    else state.filters[k].delete(val);
    render();
  });

  const text = document.createElement("span");
  text.textContent = labelText;
  const cnt = document.createElement("span");
  cnt.className = "count";
  cnt.dataset.countKey = key;
  cnt.dataset.countValue = value;

  wrap.appendChild(input);
  wrap.appendChild(text);
  wrap.appendChild(cnt);

  return wrap;
}

function buildPageTypeSection(pageTypes){
  const section = document.createElement("div");
  section.className = "filter-section";

  const header = document.createElement("div");
  header.className = "filter-section__header";
  header.textContent = "Page type";

  const items = document.createElement("div");
  items.className = "filter-section__items";

  pageTypes.forEach(pt => {
    items.appendChild(buildCheckbox("page_type", pt, pt));
  });

  section.appendChild(header);
  section.appendChild(items);
  return section;
}

function buildCategorySection(){
  const section = document.createElement("div");
  section.className = "filter-section";

  const header = document.createElement("div");
  header.className = "filter-section__header";
  header.textContent = "Category";

  const items = document.createElement("div");
  items.className = "filter-section__items";

  // Build categories in the order defined in CATEGORY_ACTIVITIES
  Object.keys(CATEGORY_ACTIVITIES).forEach(cat => {
    const activities = CATEGORY_ACTIVITIES[cat];
    const catItem = document.createElement("div");
    catItem.className = "category-item";

    // Category header with checkbox and expand button
    const catHeader = document.createElement("div");
    catHeader.className = "category-header";

    const catId = `category:${cat}`.replace(/\s+/g,"_").toLowerCase();
    const catCheckbox = document.createElement("input");
    catCheckbox.type = "checkbox";
    catCheckbox.id = catId;
    catCheckbox.dataset.filterKey = "category";
    catCheckbox.value = cat;

    catCheckbox.addEventListener("change", (e)=>{
      if(e.target.checked) {
        state.filters.category.add(cat);
        // Also select all activities under this category
        activities.forEach(act => {
          state.filters.activity.add(act);
          const actId = `activity:${act}`.replace(/\s+/g,"_").toLowerCase();
          const actCb = document.getElementById(actId);
          if (actCb) actCb.checked = true;
        });
      } else {
        state.filters.category.delete(cat);
        // Also deselect all activities under this category
        activities.forEach(act => {
          state.filters.activity.delete(act);
          const actId = `activity:${act}`.replace(/\s+/g,"_").toLowerCase();
          const actCb = document.getElementById(actId);
          if (actCb) actCb.checked = false;
        });
      }
      render();
    });

    const catLabel = document.createElement("label");
    catLabel.className = "category-label";
    catLabel.setAttribute("for", catId);
    catLabel.innerHTML = `<span>${cat}</span><span class="count" data-count-key="category" data-count-value="${cat}"></span>`;

    const expandBtn = document.createElement("button");
    expandBtn.type = "button";
    expandBtn.className = "category-expand" + (activities.length === 0 ? " is-hidden" : "");
    expandBtn.innerHTML = ICON_CHEVRON_DOWN;
    expandBtn.setAttribute("aria-label", `Expand ${cat} activities`);

    catHeader.appendChild(catCheckbox);
    catHeader.appendChild(catLabel);
    catHeader.appendChild(expandBtn);

    // Activity sub-items
    const activityItems = document.createElement("div");
    activityItems.className = "activity-items";

    activities.forEach(act => {
      activityItems.appendChild(buildCheckbox("activity", act, act));
    });

    // Expand/collapse behavior
    expandBtn.addEventListener("click", ()=>{
      const isOpen = activityItems.classList.toggle("is-open");
      expandBtn.innerHTML = isOpen ? ICON_CHEVRON_UP : ICON_CHEVRON_DOWN;
      expandBtn.setAttribute("aria-label", isOpen ? `Collapse ${cat} activities` : `Expand ${cat} activities`);
    });

    catItem.appendChild(catHeader);
    if(activities.length > 0){
      catItem.appendChild(activityItems);
    }
    items.appendChild(catItem);
  });

  section.appendChild(header);
  section.appendChild(items);
  return section;
}

function buildFiltersFromData(){
  const pageTypes = uniqSorted(rows.map(r=>normKey(r.page_type)));

  groupsEl.innerHTML = "";
  groupsEl.appendChild(buildPageTypeSection(pageTypes));
  groupsEl.appendChild(buildCategorySection());
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
  // "Most relevant": if filters active, sort by match score; otherwise keep original order
  const hasActiveFilters = state.filters.page_type.size > 0 ||
                           state.filters.category.size > 0 ||
                           state.filters.activity.size > 0;
  if(!hasActiveFilters){
    return list; // Keep original CSV order
  }
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
        const id = `${key}:${value}`.replace(/\s+/g,"_").toLowerCase();
        const cb = document.getElementById(id);
        if (cb) cb.checked = false;

        render();
      });

      activeFiltersEl.appendChild(btn);
    });
  }

function computeCounts(){
  const counts = {
    page_type: new Map(),
    category: new Map(),
    activity: new Map(),
  };

  // Count page_type (simple count respecting other filters)
  rows.forEach(r=>{
    const okCat = state.filters.category.size === 0 || state.filters.category.has(normKey(r.category));
    const okAct = state.filters.activity.size === 0 || state.filters.activity.has(normKey(r.activity));
    if(okCat && okAct){
      const v = normKey(r.page_type);
      if(v) counts.page_type.set(v, (counts.page_type.get(v) || 0) + 1);
    }
  });

  // Count activities (respecting page_type filter)
  rows.forEach(r=>{
    const okPt = state.filters.page_type.size === 0 || state.filters.page_type.has(normKey(r.page_type));
    if(okPt){
      const v = normKey(r.activity);
      if(v) counts.activity.set(v, (counts.activity.get(v) || 0) + 1);
    }
  });

  // Count categories = sum of their mapped activities' counts
  Object.keys(CATEGORY_ACTIVITIES).forEach(cat => {
    const activities = CATEGORY_ACTIVITIES[cat];
    let total = 0;
    activities.forEach(act => {
      total += counts.activity.get(act) || 0;
    });
    counts.category.set(cat, total);
  });

  // Update DOM
  document.querySelectorAll(".count[data-count-key]").forEach(span=>{
    const k = span.dataset.countKey;
    const v = span.dataset.countValue;
    const n = counts[k]?.get(v) ?? 0;
    span.textContent = `(${n})`;
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
      const id = `${key}:${text}`.replace(/\s+/g,"_").toLowerCase();
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
  updateShowResultsBtn();

  gridEl.innerHTML = "";
  sorted.forEach(r=> gridEl.appendChild(renderCard(r)));
}

function clearAll(){
  state.filters.page_type.clear();
  state.filters.category.clear();
  state.filters.activity.clear();

  // uncheck all checkboxes in the filter panel
  document.querySelectorAll('.filters input[type="checkbox"]').forEach(cb => cb.checked = false);
  render();
}

// Mobile filter overlay functions
function openFilters(){
  filtersEl.classList.add("is-open");
  filterOverlay.classList.add("is-active");
  document.body.style.overflow = "hidden";
}

function closeFilters(){
  filtersEl.classList.remove("is-open");
  filterOverlay.classList.remove("is-active");
  document.body.style.overflow = "";
}

function updateShowResultsBtn(){
  const count = rows.filter(matchesFilters).length;
  showResultsBtn.textContent = `Show ${count} Results`;
}

function syncSortState(value){
  state.sort = value;
  // Sync sort buttons
  sortBtns.forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.sort === value);
  });
  render();
}

// Events
clearBtn.addEventListener("click", clearAll);

// Mobile filter events
filterToggleBtn.addEventListener("click", openFilters);
filterCloseBtn.addEventListener("click", closeFilters);
filterOverlay.addEventListener("click", closeFilters);
showResultsBtn.addEventListener("click", closeFilters);

// Sort button events
sortBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    syncSortState(btn.dataset.sort);
  });
});

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