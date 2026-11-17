(() => {
  const STORAGE_KEY = "personal_directory_v2_data";
  const ADMIN_SESSION_KEY = "personal_directory_v2_admin";
  const state = { data: null, isAdmin: false, activeTab: null };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
  const uid = () => Math.random().toString(36).slice(2, 10);

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
  }
  function nl2brSafe(s) { return escapeHtml(s).replace(/\n/g, "<br>"); }

  async function loadDefaultData() {
    const res = await fetch("assets/data.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load default data.json");
    return await res.json();
  }
  function loadSavedData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
      return true;
    } catch (err) {
      alert("Could not save: this browser's local storage is full or unavailable.\n\nTry a smaller image, or remove another large image first. (" + err.message + ")");
      return false;
    }
  }
  function mergeData(base, saved) {
    if (!saved) return deepClone(base);
    // shallow-merge top-level objects/arrays from saved over base for simplicity
    const out = deepClone(base);
    for (const k of Object.keys(saved)) out[k] = saved[k];
    // ensure required structures exist
    out.settings = Object.assign({}, base.settings || {}, saved.settings || {});
    out.profile = Object.assign({}, base.profile || {}, saved.profile || {});
    if (!Array.isArray(out.tabs) || !out.tabs.length) out.tabs = deepClone(base.tabs || []);
    if (!Array.isArray(out.experience)) out.experience = deepClone(base.experience || []);
    if (!Array.isArray(out.education)) out.education = deepClone(base.education || []);
    if (!Array.isArray(out.certifications)) out.certifications = deepClone(base.certifications || []);
    if (!Array.isArray(out.projects)) out.projects = deepClone(base.projects || []);
    if (!Array.isArray(out.events)) out.events = deepClone(base.events || []);
    if (!Array.isArray(out.gallery)) out.gallery = deepClone(base.gallery || []);
    if (!out.skills) out.skills = deepClone(base.skills || { groups: [] });
    if (!out.about) out.about = deepClone(base.about || {});
    if (!out.values) out.values = deepClone(base.values || {});
    return out;
  }

  function isAdminRequested() {
    const p = new URLSearchParams(location.search);
    return p.has("admin") || location.hash.toLowerCase().includes("admin");
  }
  function ensureAdminSession() {
    if (!isAdminRequested()) return false;
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "1") return true;
    const expected = (state.data.settings && state.data.settings.adminPasscode) || "";
    const entered = window.prompt("Enter admin passcode:");
    if (entered === null) return false;
    if (String(entered) === String(expected)) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      return true;
    }
    alert("Incorrect passcode. Showing visitor view.");
    return false;
  }

  function setActiveTab(id) {
    const tabs = getVisibleTabs();
    if (!tabs.length) return;
    const found = tabs.find(t => t.id === id) ? id : tabs[0].id;
    state.activeTab = found;
    $$(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === found));
    $$(".section").forEach(s => s.classList.toggle("active", s.id === `section-${found}`));
    try { history.replaceState(null, "", `${location.pathname}${location.search}#${found}`); } catch {}
  }
  function getVisibleTabs() {
    return (state.data.tabs || []).filter(t => t.visible !== false);
  }

  function renderHero() {
    const p = state.data.profile || {};
    const heroBg = $("#heroBg");
    const bg = p.heroBackground || "assets/1775470668186.jpg";
    heroBg.style.backgroundImage = `url('${String(bg).replace(/'/g, "%27")}')`;
    const overlay = $("#heroOverlay");
    const o = Number(state.data.settings?.heroOverlay ?? 0.55);
    overlay.style.background = `linear-gradient(120deg, rgba(4,10,18,${Math.min(0.92, o + 0.22)}) 0%, rgba(8,20,28,${o}) 45%, rgba(10,12,20,${Math.min(0.9, o + 0.18)}) 100%)`;
    document.title = state.data.settings?.siteTitle || `${p.name || "Profile"} | Personal Directory`;
    $("#profileName").textContent = p.name || "";
    $("#profileHeadline").textContent = p.headline || "";
    $("#profileSubheadline").textContent = p.subheadline || "";
    const photo = (p.photo || "").trim();
    const img = $("#profilePhoto");
    const fallback = $("#profilePhotoFallback");
    if (photo) {
      img.src = photo; img.style.display = "block"; fallback.style.display = "none";
      img.onerror = () => { img.style.display = "none"; fallback.style.display = "grid"; };
    } else {
      img.style.display = "none"; fallback.style.display = "grid";
      fallback.textContent = (p.name || "A").trim().charAt(0).toUpperCase() || "A";
    }
    const photoBtn = $("#photoEditBtn");
    if (photoBtn) {
      photoBtn.classList.toggle("hidden", !state.isAdmin);
      photoBtn.onclick = openProfileEditor;
    }
    const li = $("#linkedinLink");
    if (p.linkedin) { li.href = p.linkedin; li.style.display = ""; } else li.style.display = "none";
    const em = $("#emailLink");
    if (p.email) { em.href = `mailto:${p.email}`; em.style.display = ""; } else em.style.display = "none";
    const rl = $("#resumeLink");
    if (p.resumeLink) { rl.href = p.resumeLink; rl.style.display = ""; } else rl.style.display = "none";
    const meta = [];
    if (p.location) meta.push(`<span>📍 ${escapeHtml(p.location)}</span>`);
    if (p.email) meta.push(`<span>✉️ ${escapeHtml(p.email)}</span>`);
    if (p.phone) meta.push(`<span>📞 ${escapeHtml(p.phone)}</span>`);
    $("#heroMeta").innerHTML = meta.join("");
    $("#footerText").innerHTML = `&copy; ${new Date().getFullYear()} ${escapeHtml(p.name || "Personal Directory")}. Built with integrity and professionalism.`;
  }

  function adminBtn(label, onclick, extraClass = "") {
    if (!state.isAdmin) return "";
    return `<button class="edit-chip ${extraClass}" data-action="${escapeHtml(onclick)}">${escapeHtml(label)}</button>`;
  }

  function renderTabsNav() {
    const list = $("#tabsList");
    const tabs = state.isAdmin ? (state.data.tabs || []) : getVisibleTabs();
    list.innerHTML = tabs.map(t => {
      const hiddenMark = (state.isAdmin && t.visible === false) ? " (hidden)" : "";
      const dragAttrs = state.isAdmin ? ` draggable="true" title="Drag to reorder"` : "";
      return `<button class="tab-btn ${t.id === state.activeTab ? "active" : ""}" data-tab="${escapeHtml(t.id)}" role="tab"${dragAttrs}>${escapeHtml(t.label)}${hiddenMark}</button>`;
    }).join("") + (state.isAdmin ? `<button class="tab-btn" data-manage-tabs="1">+ Tabs</button>` : "");
    $$(".tab-btn[data-tab]", list).forEach(btn => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));
    const manage = $('[data-manage-tabs="1"]', list);
    if (manage) manage.addEventListener("click", openTabsManager);
    if (state.isAdmin) bindTabReorder(list);
  }

  function moveTab(fromId, toId) {
    const tabs = state.data.tabs || [];
    const from = tabs.findIndex(t => t.id === fromId);
    const to = tabs.findIndex(t => t.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = tabs.splice(from, 1);
    tabs.splice(to, 0, moved);
    saveData();
    renderAll();
  }

  // Admin-only: drag a tab left/right on the tab bar to reorder it.
  function bindTabReorder(list) {
    let dragId = null;
    $$(".tab-btn[data-tab]", list).forEach(btn => {
      btn.addEventListener("dragstart", e => {
        dragId = btn.dataset.tab;
        btn.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", dragId); } catch {}
      });
      btn.addEventListener("dragend", () => { dragId = null; btn.classList.remove("dragging"); });
      btn.addEventListener("dragover", e => {
        if (!dragId || btn.dataset.tab === dragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        btn.classList.add("drop-target");
      });
      btn.addEventListener("dragleave", () => btn.classList.remove("drop-target"));
      btn.addEventListener("drop", e => {
        e.preventDefault();
        btn.classList.remove("drop-target");
        const from = dragId, to = btn.dataset.tab;
        dragId = null;
        if (!from || !to || from === to) return;
        moveTab(from, to);
      });
    });
  }

  function sectionAdminBar(tab) {
    if (!state.isAdmin) return "";
    return `<div class="section-admin-bar"><span class="muted">Admin:</span>
      <button class="edit-chip" data-edit-section="${escapeHtml(tab.type)}" data-tab-id="${escapeHtml(tab.id)}">Edit section content</button>
      <button class="edit-chip" data-edit-profile="1">Edit profile/hero</button>
    </div>`;
  }

  function renderSection(tab) {
    const type = tab.type;
    if (type === "about") return renderAbout(tab);
    if (type === "values") return renderValues(tab);
    if (type === "experience") return renderExperience(tab);
    if (type === "education") return renderEducation(tab);
    if (type === "skills") return renderSkills(tab);
    if (type === "projects") return renderCardsSection(tab, "projects", "Projects");
    if (type === "events") return renderCardsSection(tab, "events", "Events");
    if (type === "gallery") return renderGallery(tab);
    return `<section class="section ${state.activeTab===tab.id?"active":""}" id="section-${escapeHtml(tab.id)}"><div class="card">Unknown section type.</div></section>`;
  }

  function renderAbout(tab) {
    const a = state.data.about || {};
    const highlights = (a.highlights || []).map((h, i) => `<li class="reveal" style="--d:${i*60}ms">${escapeHtml(h)}</li>`).join("");
    return `<section class="section ${state.activeTab===tab.id?"active":""}" id="section-${tab.id}">
      ${sectionAdminBar(tab)}
      <div class="section-header reveal"><div><h2>${escapeHtml(a.heading || tab.label)}</h2><p>Profile overview</p></div></div>
      <div class="grid grid-2">
        <div class="card reveal">
          <p class="lead">${nl2brSafe(a.body || "")}</p>
          ${a.quote ? `<div class="quote-block reveal" style="--d:120ms">${nl2brSafe(a.quote)}</div>` : ""}
        </div>
        <div class="card reveal reveal-right" style="--d:80ms">
          <h3 style="margin-top:0;color:var(--heading)">Highlights</h3>
          <ul class="highlight-list">${highlights || '<li class="muted">No highlights yet.</li>'}</ul>
        </div>
      </div>
    </section>`;
  }

  function renderValues(tab) {
    const v = state.data.values || {};
    const principles = (v.principles || []).map((p, i) => `
      <div class="card principle reveal reveal-pop" style="--d:${i*90}ms">
        <h3>${escapeHtml(p.title || "")}</h3>
        <p>${nl2brSafe(p.text || "")}</p>
      </div>`).join("");
    return `<section class="section ${state.activeTab===tab.id?"active":""}" id="section-${tab.id}">
      ${sectionAdminBar(tab)}
      <div class="section-header reveal"><div><h2>${escapeHtml(v.heading || tab.label)}</h2><p>${escapeHtml(v.intro || "")}</p></div></div>
      <div class="principles">${principles || '<div class="card muted">No principles added yet.</div>'}</div>
      ${v.closing ? `<div class="card reveal" style="margin-top:1rem;--d:120ms"><p style="margin:0">${nl2brSafe(v.closing)}</p></div>` : ""}
    </section>`;
  }

  function renderExperience(tab) {
    const items = state.data.experience || [];
    const cards = items.map((e, i) => `
      <article class="card item-card reveal" style="--d:${Math.min(i*80,320)}ms">
        <h3>${escapeHtml(e.role || "")}</h3>
        <div class="item-meta">${escapeHtml(e.company || "")}</div>
        <div class="item-sub">${escapeHtml([e.period, e.location].filter(Boolean).join(" · "))}</div>
        ${e.description ? `<p>${nl2brSafe(e.description)}</p>` : ""}
        ${(e.bullets && e.bullets.length) ? `<ul>${e.bullets.map(b=>`<li>${escapeHtml(b)}</li>`).join("")}</ul>` : ""}
        ${state.isAdmin ? `<div class="admin-controls"><button class="edit-chip" data-edit-item="experience" data-index="${i}">Edit</button><button class="edit-chip" data-del-item="experience" data-index="${i}">Delete</button><button class="edit-chip" data-move-item="experience" data-index="${i}" data-dir="-1">↑</button><button class="edit-chip" data-move-item="experience" data-index="${i}" data-dir="1">↓</button></div>` : ""}
      </article>`).join("");
    return `<section class="section ${state.activeTab===tab.id?"active":""}" id="section-${tab.id}">
      ${sectionAdminBar(tab)}
      <div class="section-header reveal"><div><h2>${escapeHtml(tab.label)}</h2><p>Professional experience and roles</p></div>
        ${state.isAdmin ? `<button class="btn small" data-add-item="experience">+ Add experience</button>` : ""}
      </div>
      <div class="timeline">${cards || '<div class="card muted">No experience entries yet.</div>'}</div>
    </section>`;
  }

  function renderEducation(tab) {
    const edu = state.data.education || [];
    const certs = state.data.certifications || [];
    const eduCards = edu.map((e, i) => `
      <article class="card item-card reveal" style="--d:${i*70}ms">
        <h3>${escapeHtml(e.degree || "")}</h3>
        <div class="item-meta">${escapeHtml(e.institution || "")}</div>
        <div class="item-sub">${escapeHtml(e.period || "")}</div>
        ${e.details ? `<p>${nl2brSafe(e.details)}</p>` : ""}
        ${state.isAdmin ? `<div class="admin-controls"><button class="edit-chip" data-edit-item="education" data-index="${i}">Edit</button><button class="edit-chip" data-del-item="education" data-index="${i}">Delete</button><button class="edit-chip" data-move-item="education" data-index="${i}" data-dir="-1">↑</button><button class="edit-chip" data-move-item="education" data-index="${i}" data-dir="1">↓</button></div>` : ""}
      </article>`).join("");
    const certCards = certs.map((c, i) => `
      <article class="card item-card reveal" style="--d:${i*70}ms">
        <h3>${escapeHtml(c.name || "")}</h3>
        <div class="item-meta">${escapeHtml(c.issuer || "")}</div>
        <div class="item-sub">${escapeHtml(c.date || "")}</div>
        ${c.link ? `<p><a href="${escapeHtml(c.link)}" target="_blank" rel="noopener">View credential</a></p>` : ""}
        ${state.isAdmin ? `<div class="admin-controls"><button class="edit-chip" data-edit-item="certifications" data-index="${i}">Edit</button><button class="edit-chip" data-del-item="certifications" data-index="${i}">Delete</button><button class="edit-chip" data-move-item="certifications" data-index="${i}" data-dir="-1">↑</button><button class="edit-chip" data-move-item="certifications" data-index="${i}" data-dir="1">↓</button></div>` : ""}
      </article>`).join("");
    return `<section class="section ${state.activeTab===tab.id?"active":""}" id="section-${tab.id}">
      ${sectionAdminBar(tab)}
      <div class="section-header reveal"><div><h2>${escapeHtml(tab.label)}</h2><p>Academic background and professional certifications</p></div></div>
      <div class="grid grid-2">
        <div class="stack">
          <div class="section-header" style="margin:0"><h3 style="margin:0;color:var(--heading)">Education</h3>${state.isAdmin?`<button class="btn small" data-add-item="education">+ Add</button>`:""}</div>
          ${eduCards || '<div class="card muted">No education entries yet.</div>'}
        </div>
        <div class="stack">
          <div class="section-header" style="margin:0"><h3 style="margin:0;color:var(--heading)">Certifications</h3>${state.isAdmin?`<button class="btn small" data-add-item="certifications">+ Add</button>`:""}</div>
          ${certCards || '<div class="card muted">No certifications yet.</div>'}
        </div>
      </div>
    </section>`;
  }

  function renderSkills(tab) {
    const groups = (state.data.skills && state.data.skills.groups) || [];
    const cards = groups.map((g, gi) => `
      <div class="card skill-group reveal" style="--d:${gi*80}ms">
        <h3>${escapeHtml(g.category || "")}</h3>
        <div class="chips">${(g.items||[]).map(it=>`<span class="chip">${escapeHtml(it)}</span>`).join("") || '<span class="muted">No skills listed.</span>'}</div>
        ${state.isAdmin ? `<div class="admin-controls"><button class="edit-chip" data-edit-skill-group="${gi}">Edit group</button><button class="edit-chip" data-del-skill-group="${gi}">Delete group</button><button class="edit-chip" data-move-skill-group="${gi}" data-dir="-1">↑</button><button class="edit-chip" data-move-skill-group="${gi}" data-dir="1">↓</button></div>` : ""}
      </div>`).join("");
    return `<section class="section ${state.activeTab===tab.id?"active":""}" id="section-${tab.id}">
      ${sectionAdminBar(tab)}
      <div class="section-header reveal"><div><h2>${escapeHtml(tab.label)}</h2><p>Core competencies and tools</p></div>
        ${state.isAdmin ? `<button class="btn small" data-add-skill-group="1">+ Add skill group</button>` : ""}
      </div>
      <div class="grid grid-2">${cards || '<div class="card muted">No skills added yet.</div>'}</div>
    </section>`;
  }

  function renderCardsSection(tab, key, title) {
    const items = state.data[key] || [];
    const cards = items.map((it, i) => `
      <article class="card item-card reveal" style="--d:${Math.min(i*80,320)}ms">
        ${it.image ? `<img class="item-image" src="${escapeHtml(it.image)}" alt="${escapeHtml(it.title||title)}" onerror="this.style.display='none'">` : ""}
        <h3>${escapeHtml(it.title || "")}</h3>
        ${it.date ? `<div class="item-meta">${escapeHtml(it.date)}</div>` : ""}
        ${it.summary ? `<p>${nl2brSafe(it.summary)}</p>` : ""}
        ${it.link ? `<p><a href="${escapeHtml(it.link)}" target="_blank" rel="noopener">Open link</a></p>` : ""}
        ${(it.tags && it.tags.length) ? `<div class="tags">${it.tags.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
        ${state.isAdmin ? `<div class="admin-controls"><button class="edit-chip" data-edit-item="${key}" data-index="${i}">Edit</button><button class="edit-chip" data-del-item="${key}" data-index="${i}">Delete</button><button class="edit-chip" data-move-item="${key}" data-index="${i}" data-dir="-1">↑</button><button class="edit-chip" data-move-item="${key}" data-index="${i}" data-dir="1">↓</button></div>` : ""}
      </article>`).join("");
    return `<section class="section ${state.activeTab===tab.id?"active":""}" id="section-${tab.id}">
      ${sectionAdminBar(tab)}
      <div class="section-header reveal"><div><h2>${escapeHtml(tab.label)}</h2><p>${key === 'projects' ? 'Projects and work highlights' : 'Events, activities, and milestones'} (easy to add more anytime)</p></div>
        ${state.isAdmin ? `<button class="btn small" data-add-item="${key}">+ Add ${key === 'projects' ? 'project' : 'event'}</button>` : ""}
      </div>
      <div class="grid grid-2">${cards || `<div class="card muted">No ${key} yet.</div>`}</div>
    </section>`;
  }

  function renderGallery(tab) {
    const items = state.data.gallery || [];
    const cards = items.map((it, i) => `
      <article class="card gallery-card reveal" style="--d:${i*70}ms">
        ${it.image ? `<img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.title||'Gallery image')}" onerror="this.style.display='none'">` : ""}
        <h4>${escapeHtml(it.title || "")}</h4>
        ${it.caption ? `<p>${nl2brSafe(it.caption)}</p>` : ""}
        ${state.isAdmin ? `<div class="admin-controls"><button class="edit-chip" data-edit-item="gallery" data-index="${i}">Edit</button><button class="edit-chip" data-del-item="gallery" data-index="${i}">Delete</button><button class="edit-chip" data-move-item="gallery" data-index="${i}" data-dir="-1">↑</button><button class="edit-chip" data-move-item="gallery" data-index="${i}" data-dir="1">↓</button></div>` : ""}
      </article>`).join("");
    return `<section class="section ${state.activeTab===tab.id?"active":""}" id="section-${tab.id}">
      ${sectionAdminBar(tab)}
      <div class="section-header reveal"><div><h2>${escapeHtml(tab.label)}</h2><p>Photos and media</p></div>
        ${state.isAdmin ? `<button class="btn small" data-add-item="gallery">+ Add image</button>` : ""}
      </div>
      <div class="gallery-grid">${cards || '<div class="card muted">No gallery items yet.</div>'}</div>
    </section>`;
  }

  function renderAll() {
    renderHero();
    const tabs = getVisibleTabs();
    if (!state.activeTab || !tabs.find(t => t.id === state.activeTab)) {
      const hash = location.hash.replace('#','');
      state.activeTab = tabs.find(t => t.id === hash)?.id || (tabs[0] && tabs[0].id) || null;
    }
    renderTabsNav();
    const main = $("#mainContent");
    const sections = (state.data.tabs || []).map(t => renderSection(t)).join("");
    main.innerHTML = sections || '<div class="card">No sections configured.</div>';
    // ensure active
    if (state.activeTab) setActiveTab(state.activeTab);
    bindDynamicEvents();
    setupReveal();
  }

  function bindDynamicEvents() {
    $$('[data-edit-profile]').forEach(b => b.onclick = openProfileEditor);
    $$('[data-edit-section]').forEach(b => b.onclick = () => openSectionEditor(b.dataset.editSection, b.dataset.tabId));
    $$('[data-add-item]').forEach(b => b.onclick = () => addItem(b.dataset.addItem));
    $$('[data-edit-item]').forEach(b => b.onclick = () => editItem(b.dataset.editItem, Number(b.dataset.index)));
    $$('[data-del-item]').forEach(b => b.onclick = () => deleteItem(b.dataset.delItem, Number(b.dataset.index)));
    $$('[data-move-item]').forEach(b => b.onclick = () => moveItem(b.dataset.moveItem, Number(b.dataset.index), Number(b.dataset.dir)));
    $$('[data-add-skill-group]').forEach(b => b.onclick = addSkillGroup);
    $$('[data-edit-skill-group]').forEach(b => b.onclick = () => editSkillGroup(Number(b.dataset.editSkillGroup)));
    $$('[data-del-skill-group]').forEach(b => b.onclick = () => deleteSkillGroup(Number(b.dataset.delSkillGroup)));
    $$('[data-move-skill-group]').forEach(b => b.onclick = () => moveSkillGroup(Number(b.dataset.moveSkillGroup), Number(b.dataset.dir)));
  }

  // Modal helpers
  function openModal(title, bodyHtml, footerHtml) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = bodyHtml;
    $("#modalFooter").innerHTML = footerHtml || `<button class="btn small" data-close-modal>Close</button>`;
    $("#adminModal").classList.remove("hidden");
    $("#adminModal").setAttribute("aria-hidden", "false");
    $$('[data-close-modal]').forEach(el => el.onclick = closeModal);
  }
  function closeModal() {
    $("#adminModal").classList.add("hidden");
    $("#adminModal").setAttribute("aria-hidden", "true");
  }

  function field(label, name, value, type = "text", hint = "") {
    const v = value ?? "";
    if (type === "textarea") {
      return `<label class="field"><span>${escapeHtml(label)}</span><textarea name="${escapeHtml(name)}">${escapeHtml(v)}</textarea>${hint?`<div class="form-hint">${escapeHtml(hint)}</div>`:""}</label>`;
    }
    return `<label class="field"><span>${escapeHtml(label)}</span><input type="${escapeHtml(type)}" name="${escapeHtml(name)}" value="${escapeHtml(String(v))}">${hint?`<div class="form-hint">${escapeHtml(hint)}</div>`:""}</label>`;
  }
  function getFormValues(form) {
    const data = {};
    new FormData(form).forEach((val, key) => { data[key] = val; });
    // include unchecked checkboxes? not used much; textareas included
    $$("textarea, input, select", form).forEach(el => { if (el.name) data[el.name] = el.value; });
    return data;
  }

  // Image upload helpers
  function readImageFile(file, maxDim, quality = 0.85) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//i.test(file.type)) return reject(new Error("Please choose an image file (JPG, PNG, WebP…)."));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#0b1220";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const webp = canvas.toDataURL("image/webp", quality);
        resolve(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That image could not be read.")); };
      img.src = url;
    });
  }

  function imagePicker(label, name, value, hint, shape = "") {
    const v = (value || "").trim();
    const preview = v
      ? `<img src="${escapeHtml(v)}" alt="Current selection" onerror="this.style.display='none'">`
      : `<span class="image-picker-empty">No image</span>`;
    return `<div class="field image-picker" data-picker="${name}">
      <span>${escapeHtml(label)}</span>
      <div class="image-picker-row">
        <div class="image-picker-preview ${shape}">${preview}</div>
        <div class="image-picker-actions">
          <label class="btn small file-label">Upload image<input type="file" accept="image/*" data-image-input="${name}" hidden></label>
          <button type="button" class="btn small" data-image-clear="${name}">Remove</button>
          ${hint ? `<div class="form-hint">${escapeHtml(hint)}</div>` : ""}
        </div>
      </div>
      <input type="hidden" name="${name}" value="${escapeHtml(v)}">
      <input type="text" data-image-url="${name}" placeholder="…or paste an image path / URL" value="${v.startsWith("data:") ? "" : escapeHtml(v)}">
    </div>`;
  }

  function bindImagePickers() {
    $$("[data-image-input]").forEach(input => {
      const name = input.dataset.imageInput;
      const wrap = input.closest(".image-picker");
      const hidden = wrap.querySelector(`input[type="hidden"][name="${name}"]`);
      const urlInput = wrap.querySelector(`[data-image-url="${name}"]`);
      const preview = wrap.querySelector(".image-picker-preview");
      const maxDim = name === "heroBackground" ? 1600 : 720;
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
          const dataUrl = await readImageFile(file, maxDim, 0.85);
          hidden.value = dataUrl;
          if (urlInput) urlInput.value = "";
          preview.innerHTML = `<img src="${dataUrl}" alt="New selection">`;
        } catch (err) {
          alert(err.message);
        } finally {
          input.value = "";
        }
      };
      if (urlInput) urlInput.oninput = () => {
        hidden.value = urlInput.value.trim();
        preview.innerHTML = hidden.value
          ? `<img src="${escapeHtml(hidden.value)}" alt="Preview" onerror="this.style.display='none'">`
          : `<span class="image-picker-empty">No image</span>`;
      };
    });
    $$("[data-image-clear]").forEach(btn => {
      btn.onclick = () => {
        const name = btn.dataset.imageClear;
        const wrap = btn.closest(".image-picker");
        wrap.querySelector(`input[type="hidden"][name="${name}"]`).value = "";
        const urlInput = wrap.querySelector(`[data-image-url="${name}"]`);
        if (urlInput) urlInput.value = "";
        wrap.querySelector(".image-picker-preview").innerHTML = `<span class="image-picker-empty">No image</span>`;
      };
    });
  }

  // Editors
  function openProfileEditor() {
    const p = state.data.profile || {};
    const s = state.data.settings || {};
    const body = `<form id="profileForm" class="form-grid">
      <div class="form-grid two">
        ${field("Full name", "name", p.name)}
        ${field("Headline", "headline", p.headline)}
        ${field("Subheadline", "subheadline", p.subheadline)}
        ${field("Location", "location", p.location)}
        ${field("Email", "email", p.email, "email")}
        ${field("Phone", "phone", p.phone)}
        ${field("LinkedIn URL", "linkedin", p.linkedin, "url")}
        ${field("Resume/file URL", "resumeLink", p.resumeLink, "url", "Optional link to a PDF/resume file")}
      </div>
      <div class="form-grid two">
        ${imagePicker("Profile photo", "photo", p.photo, "Upload from your device (auto-resized). Saved in this browser — to publish for everyone, add the image to assets/ on GitHub and paste its path.", "round")}
        ${imagePicker("Hero background (cover)", "heroBackground", p.heroBackground || "assets/1775470668186.jpg", "Upload a cover image (auto-resized). Remove resets to the default cover.")}
      </div>
      ${field("Summary (hero/about context optional)", "summary", p.summary, "textarea")}
      <hr class="sep">
      <div class="form-grid two">
        ${field("Site title", "siteTitle", s.siteTitle)}
        ${field("Admin passcode", "adminPasscode", s.adminPasscode, "text", "Used for ?admin access on this browser/site copy")}
      </div>
    </form>`;
    openModal("Edit profile & site settings", body, `<button class="btn small" data-close-modal>Cancel</button><button class="btn small primary" id="saveProfileBtn">Save</button>`);
    bindImagePickers();
    $("#saveProfileBtn").onclick = () => {
      const v = getFormValues($("#profileForm"));
      Object.assign(state.data.profile, {
        name:v.name, headline:v.headline, subheadline:v.subheadline, location:v.location,
        email:v.email, phone:v.phone, linkedin:v.linkedin, resumeLink:v.resumeLink, photo:v.photo,
        heroBackground:v.heroBackground, summary:v.summary
      });
      Object.assign(state.data.settings, { siteTitle:v.siteTitle, adminPasscode:v.adminPasscode });
      if (!saveData()) return;
      closeModal(); renderAll();
    };
  }

  function openSectionEditor(type, tabId) {
    if (type === "about") return openAboutEditor();
    if (type === "values") return openValuesEditor();
    if (type === "skills") return openSkillsEditor();
    // for list/timeline sections, profile editor or item editors cover most; show info
    openProfileEditor();
  }

  function openAboutEditor() {
    const a = state.data.about || {};
    const highlights = (a.highlights || []).join("\n");
    const body = `<form id="aboutForm" class="form-grid">
      ${field("Section heading", "heading", a.heading || "About Me")}
      ${field("About text", "body", a.body, "textarea")}
      ${field("Highlights (one per line)", "highlights", highlights, "textarea")}
      ${field("Quote / closing line", "quote", a.quote, "textarea")}
    </form>`;
    openModal("Edit About section", body, `<button class="btn small" data-close-modal>Cancel</button><button class="btn small primary" id="saveAboutBtn">Save</button>`);
    $("#saveAboutBtn").onclick = () => {
      const v = getFormValues($("#aboutForm"));
      state.data.about = {
        heading: v.heading, body: v.body, quote: v.quote,
        highlights: v.highlights.split("\n").map(s=>s.trim()).filter(Boolean)
      };
      saveData(); closeModal(); renderAll();
    };
  }

  function openValuesEditor() {
    const v = state.data.values || { principles: [] };
    const p = v.principles || [];
    // edit up to 6 principles for simplicity + allow json-like via lines? simpler: fixed 3-5 slots
    let rows = "";
    for (let i=0;i<5;i++) {
      const it = p[i] || { title:"", text:"" };
      rows += `<div class="card" style="padding:.8rem"><div class="form-grid two">
        ${field(`Principle ${i+1} title`, `p_title_${i}`, it.title)}
      </div>${field(`Principle ${i+1} text`, `p_text_${i}`, it.text, "textarea")}</div>`;
    }
    const body = `<form id="valuesForm" class="form-grid">
      ${field("Section heading", "heading", v.heading || "Values & Faith")}
      ${field("Intro text", "intro", v.intro, "textarea")}
      ${rows}
      ${field("Closing text", "closing", v.closing, "textarea")}
    </form>`;
    openModal("Edit Values & Faith", body, `<button class="btn small" data-close-modal>Cancel</button><button class="btn small primary" id="saveValuesBtn">Save</button>`);
    $("#saveValuesBtn").onclick = () => {
      const f = $("#valuesForm");
      const val = getFormValues(f);
      const principles = [];
      for (let i=0;i<5;i++) {
        const title = (val[`p_title_${i}`]||"").trim();
        const text = (val[`p_text_${i}`]||"").trim();
        if (title || text) principles.push({ title, text });
      }
      state.data.values = { heading: val.heading, intro: val.intro, closing: val.closing, principles };
      saveData(); closeModal(); renderAll();
    };
  }

  function openSkillsEditor() {
    // quick editor: each group as "Category | skill1, skill2" per block not easy; do structured
    const groups = (state.data.skills && state.data.skills.groups) || [];
    let rows = groups.map((g,i)=>skillGroupFields(g,i)).join("");
    if (!rows) rows = '<div class="muted">No groups yet. Use "Add skill group" on the section.</div>';
    openModal("Edit skill groups", `<div class="form-grid">${rows}<p class="form-hint">Tip: use Add/Edit/Delete on each group from the Skills tab for easier changes.</p></div>`, `<button class="btn small primary" data-close-modal>Done</button>`);
  }
  function skillGroupFields(g,i){ return ""; }

  function addSkillGroup() {
    const body = `<form id="sgForm" class="form-grid">${field("Category", "category", "")}${field("Skills (comma-separated)", "items", "", "textarea")}</form>`;
    openModal("Add skill group", body, `<button class="btn small" data-close-modal>Cancel</button><button class="btn small primary" id="saveSg">Add</button>`);
    $("#saveSg").onclick = () => {
      const v = getFormValues($("#sgForm"));
      const items = v.items.split(",").map(s=>s.trim()).filter(Boolean);
      if (!state.data.skills) state.data.skills = { groups: [] };
      state.data.skills.groups.push({ category: v.category, items });
      saveData(); closeModal(); renderAll();
    };
  }
  function editSkillGroup(i) {
    const g = state.data.skills.groups[i]; if (!g) return;
    const body = `<form id="sgForm" class="form-grid">${field("Category", "category", g.category)}${field("Skills (comma-separated)", "items", (g.items||[]).join(", "), "textarea")}</form>`;
    openModal("Edit skill group", body, `<button class="btn small" data-close-modal>Cancel</button><button class="btn small primary" id="saveSg">Save</button>`);
    $("#saveSg").onclick = () => {
      const v = getFormValues($("#sgForm"));
      g.category = v.category; g.items = v.items.split(",").map(s=>s.trim()).filter(Boolean);
      saveData(); closeModal(); renderAll();
    };
  }
  function deleteSkillGroup(i) { if (!confirm("Delete this skill group?")) return; state.data.skills.groups.splice(i,1); saveData(); renderAll(); }
  function moveSkillGroup(i, dir) { const arr=state.data.skills.groups; const j=i+dir; if(j<0||j>=arr.length) return; [arr[i],arr[j]]=[arr[j],arr[i]]; saveData(); renderAll(); }

  // Generic item CRUD
  function itemDefaults(key) {
    if (key==="experience") return { role:"", company:"", period:"", location:"", description:"", bullets:[] };
    if (key==="education") return { degree:"", institution:"", period:"", details:"" };
    if (key==="certifications") return { name:"", issuer:"", date:"", link:"" };
    if (key==="projects") return { title:"", date:"", summary:"", image:"", link:"", tags:[] };
    if (key==="events") return { title:"", date:"", summary:"", image:"", link:"", tags:[] };
    if (key==="gallery") return { title:"", caption:"", image:"" };
    return {};
  }
  function openItemEditor(key, index, isNew=false) {
    const arr = state.data[key] || [];
    const item = isNew ? itemDefaults(key) : deepClone(arr[index]);
    let body = '<form id="itemForm" class="form-grid">';
    if (key==="experience") {
      body += `<div class="form-grid two">${field("Role / Title","role",item.role)}${field("Company","company",item.company)}${field("Period","period",item.period)}${field("Location","location",item.location)}</div>`;
      body += field("Description","description",item.description,"textarea");
      body += field("Bullets (one per line)","bullets",(item.bullets||[]).join("\n"),"textarea");
    } else if (key==="education") {
      body += `<div class="form-grid two">${field("Degree / Program","degree",item.degree)}${field("Institution","institution",item.institution)}</div>`;
      body += `<div class="form-grid two">${field("Period / Status","period",item.period)}${field("Details","details",item.details)}</div>`;
    } else if (key==="certifications") {
      body += `<div class="form-grid two">${field("Certification name","name",item.name)}${field("Issuer","issuer",item.issuer)}${field("Date","date",item.date)}${field("Credential link","link",item.link,"url")}</div>`;
    } else if (key==="projects" || key==="events") {
      body += `<div class="form-grid two">${field("Title","title",item.title)}${field("Date / period","date",item.date)}</div>`;
      body += field("Summary / description","summary",item.summary,"textarea");
      body += `<div class="form-grid two">${field("Image path/URL","image",item.image,"text")}${field("Link URL","link",item.link,"url")}</div>`;
      body += field("Tags (comma-separated)","tags",(item.tags||[]).join(", "),"text");
    } else if (key==="gallery") {
      body += field("Title","title",item.title);
      body += field("Caption","caption",item.caption,"textarea");
      body += field("Image path/URL","image",item.image,"text","Use assets/filename.jpg for local images in this folder");
    }
    body += '</form>';
    openModal((isNew?"Add ":"Edit ")+key, body, `<button class="btn small" data-close-modal>Cancel</button><button class="btn small primary" id="saveItemBtn">Save</button>`);
    $("#saveItemBtn").onclick = () => {
      const v = getFormValues($("#itemForm"));
      let out = {};
      if (key==="experience") out = { role:v.role, company:v.company, period:v.period, location:v.location, description:v.description, bullets:v.bullets.split("\n").map(s=>s.trim()).filter(Boolean) };
      else if (key==="education") out = { degree:v.degree, institution:v.institution, period:v.period, details:v.details };
      else if (key==="certifications") out = { name:v.name, issuer:v.issuer, date:v.date, link:v.link };
      else if (key==="projects" || key==="events") out = { title:v.title, date:v.date, summary:v.summary, image:v.image, link:v.link, tags:v.tags.split(",").map(s=>s.trim()).filter(Boolean) };
      else if (key==="gallery") out = { title:v.title, caption:v.caption, image:v.image };
      if (isNew) arr.push(out); else arr[index] = out;
      state.data[key] = arr; saveData(); closeModal(); renderAll();
    };
  }
  function addItem(key) { if (!state.data[key]) state.data[key]=[]; openItemEditor(key, -1, true); }
  function editItem(key, i) { openItemEditor(key, i, false); }
  function deleteItem(key, i) { if (!confirm("Delete this item?")) return; state.data[key].splice(i,1); saveData(); renderAll(); }
  function moveItem(key, i, dir) { const arr=state.data[key]; const j=i+dir; if(j<0||j>=arr.length) return; [arr[i],arr[j]]=[arr[j],arr[i]]; saveData(); renderAll(); }

  function openTabsManager() {
    const tabs = state.data.tabs || [];
    const rows = tabs.map((t,i)=>`<div class="card" style="padding:.7rem"><div class="form-grid two">
      ${field("Label","label_"+i,t.label)}${field("ID","id_"+i,t.id)}
    </div><div class="form-grid two">
      <label class="field"><span>Type</span><select name="type_${i}">
        ${["about","values","experience","education","skills","projects","events","gallery"].map(tp=>`<option value="${tp}" ${t.type===tp?"selected":""}>${tp}</option>`).join("")}
      </select></label>
      <label class="field"><span>Visible</span><select name="vis_${i}"><option value="1" ${t.visible!==false?"selected":""}>Yes</option><option value="0" ${t.visible===false?"selected":""}>No</option></select></label>
    </div>
    <div class="admin-controls"><button type="button" class="edit-chip" data-tab-move="${i}" data-dir="-1" title="Move earlier">← Move left</button><button type="button" class="edit-chip" data-tab-move="${i}" data-dir="1" title="Move later">Move right →</button><button type="button" class="edit-chip danger" data-tab-del="${i}">Delete</button></div></div>`).join("");
    const body = `<form id="tabsForm" class="form-grid">
      <p class="form-hint">Order here is the order visitors see. Tip: in admin mode you can also drag the tabs on the tab bar to rearrange them.</p>
      ${rows || '<div class="muted">No tabs.</div>'}
      <hr class="sep"><h4 style="margin:0">Add new tab</h4>
      <div class="form-grid two">${field("New tab label","new_label","")}${field("New tab ID","new_id","")}
      <label class="field"><span>New tab type</span><select name="new_type">${["about","values","experience","education","skills","projects","events","gallery"].map(tp=>`<option value="${tp}">${tp}</option>`).join("")}</select></label></div>
    </form>`;
    openModal("Manage tabs", body, `<button class="btn small" data-close-modal>Cancel</button><button class="btn small primary" id="saveTabsBtn">Save tabs</button>`);
    // bind move/delete inside modal (operate on temp by re-reading on save? easier: mutate live then rerender modal/save)
    $$('[data-tab-move]').forEach(b=>b.onclick=()=>{ const i=Number(b.dataset.tabMove), d=Number(b.dataset.dir), j=i+d; if(j<0||j>=tabs.length)return; [tabs[i],tabs[j]]=[tabs[j],tabs[i]]; saveData(); closeModal(); renderAll(); openTabsManager(); });
    $$('[data-tab-del]').forEach(b=>b.onclick=()=>{ if(!confirm('Delete this tab?'))return; tabs.splice(Number(b.dataset.tabDel),1); saveData(); closeModal(); renderAll(); openTabsManager(); });
    $("#saveTabsBtn").onclick = () => {
      const v = getFormValues($("#tabsForm"));
      tabs.forEach((t,i)=>{
        t.label = v['label_'+i] ?? t.label; t.id = v['id_'+i] ?? t.id; t.type = v['type_'+i] ?? t.type; t.visible = v['vis_'+i] !== '0';
      });
      const nl = (v.new_label||"").trim(), nid = (v.new_id||"").trim() || nl.toLowerCase().replace(/[^a-z0-9]+/g,'-');
      if (nl) tabs.push({ id: nid || ('tab-'+uid()), label: nl, type: v.new_type || 'about', visible: true });
      state.data.tabs = tabs; saveData(); closeModal(); renderAll();
    };
  }

  // Scroll reveal
  let revealObserver;
  function setupReveal() {
    if (revealObserver) revealObserver.disconnect();
    const els = $$(".reveal:not(.in-view)");
    if (!("IntersectionObserver" in window)) { els.forEach(el=>el.classList.add("in-view")); return; }
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(el => revealObserver.observe(el));
  }

  // Admin bar actions
  function bindAdminBar() {
    $("#btnExport").onclick = () => {
      const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "personal-directory-data.json"; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    };
    $("#importFile").onchange = (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result);
          if (!imported || typeof imported !== 'object') throw new Error("Invalid JSON");
          state.data = imported;
          saveData(); renderAll(); alert("Data imported successfully.");
        } catch (err) { alert("Import failed: " + err.message); }
      };
      reader.readAsText(f);
      e.target.value = "";
    };
    $("#btnReset").onclick = async () => {
      if (!confirm("Reset all content to default data.json? This clears saved edits in this browser.")) return;
      localStorage.removeItem(STORAGE_KEY);
      state.data = await loadDefaultData();
      renderAll();
    };
    $("#btnExitAdmin").onclick = () => {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      const url = new URL(location.href); url.searchParams.delete("admin"); url.hash = "";
      location.href = url.toString();
    };
  }

  async function init() {
    try {
      const base = await loadDefaultData();
      const saved = loadSavedData();
      state.data = mergeData(base, saved);
      state.isAdmin = ensureAdminSession();
      if (state.isAdmin) $("#adminBar").classList.remove("hidden");
      bindAdminBar();
      renderAll();
    } catch (err) {
      console.error(err);
      $("#mainContent").innerHTML = `<div class="card" style="margin:2rem 0;color:#fecaca">Failed to load page data: ${escapeHtml(err.message)}. If you opened this file directly, try serving it via a local server or GitHub Pages (fetching data.json may be blocked for file://).</div>`;
    } finally {
      $("#app-loading").classList.add("hidden");
    }
  }

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  init();
})();
