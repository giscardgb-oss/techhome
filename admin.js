/* Tech Home — espace administrateur.
   Deux modes :
   - Aperçu : les modifications sont gardées dans ce navigateur (pratique pour essayer).
   - GitHub : « Publier » enregistre data.json (et les photos) dans le dépôt du site, qui se met à jour en ligne. */
(function () {
  "use strict";
  const T = window.TH;
  const { esc, ICONS } = T;
  const GH_KEY = "techhome.github";
  const STORES = ["Amazon.fr", "Amazon.com", "Amazon.de", "Amazon.co.uk", "Amazon.es", "Amazon.it", "Amazon.ca", "Jumia", "AliExpress", "Autre"];
  const REGIONS = ["Europe", "International", "Afrique", "Amérique du Nord", "Royaume-Uni"];

  const $ = (s) => document.querySelector(s);
  const state = { data: null, gh: null, sha: null, dirty: false, editing: null, image: "", pendingLinks: [] };

  /* ---------- Outils ---------- */
  let toastTimer;
  function toast(msg, isErr) {
    const el = $("#toast");
    el.textContent = msg;
    el.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = "toast"; }, isErr ? 7000 : 4000);
  }
  function lines(v) { return String(v || "").split("\n").map(s => s.trim()).filter(Boolean); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function setDirty(v) { state.dirty = v; $("#dirty").hidden = !v; }
  function readGh() { try { return JSON.parse(localStorage.getItem(GH_KEY) || "null"); } catch (e) { return null; } }
  function writeGh(v) { try { v ? localStorage.setItem(GH_KEY, JSON.stringify(v)) : localStorage.removeItem(GH_KEY); } catch (e) { /* rien */ } }

  function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64ToUtf8(b64) {
    const bin = atob(String(b64).replace(/\s/g, ""));
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  }

  /* ---------- API GitHub ---------- */
  async function gh(path, opts) {
    const g = state.gh;
    const res = await fetch("https://api.github.com/repos/" + encodeURIComponent(g.owner) + "/" + encodeURIComponent(g.repo) + path, Object.assign({
      headers: { "Authorization": "Bearer " + g.token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }
    }, opts || {}));
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).message || ""; } catch (e) { /* rien */ }
      const err = new Error(detail || ("Erreur GitHub " + res.status));
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  function ghErrorText(err) {
    if (err.status === 401) return "La clé GitHub est refusée. Vérifiez-la ou créez-en une nouvelle.";
    if (err.status === 403) return "La clé n’a pas le droit d’écrire. Donnez-lui l’autorisation « Contents : Read and write ».";
    if (err.status === 404) return "Dépôt ou fichier introuvable. Vérifiez le nom du compte, du dépôt et de la branche.";
    if (err.status === 409) return "Le catalogue a été modifié ailleurs entre-temps. Rechargez la page puis recommencez.";
    if (err instanceof TypeError) return "Impossible de joindre GitHub. Vérifiez votre connexion internet.";
    return "GitHub a répondu : " + err.message;
  }
  async function ghLoad() {
    const file = await gh("/contents/data.json?ref=" + encodeURIComponent(state.gh.branch));
    state.sha = file.sha;
    return T.cleanData(JSON.parse(b64ToUtf8(file.content)));
  }
  async function ghPutFile(path, b64, message, sha) {
    const body = { message, content: b64, branch: state.gh.branch };
    if (sha) body.sha = sha;
    return gh("/contents/" + path.split("/").map(encodeURIComponent).join("/"), { method: "PUT", body: JSON.stringify(body) });
  }

  /* ---------- Mode ---------- */
  function renderMode() {
    const on = !!state.gh;
    $("#mode-dot").classList.toggle("on", on);
    $("#mode-label").textContent = on ? "Connecté à GitHub : " + state.gh.owner + "/" + state.gh.repo : "Mode aperçu (ce navigateur)";
    $("#save").textContent = on ? "Publier en ligne" : "Enregistrer l’aperçu";
    $("#mode-help").textContent = on
      ? "« Publier en ligne » met à jour le site pour tous les visiteurs. Comptez environ une minute avant que les changements apparaissent."
      : "Vos modifications sont gardées dans ce navigateur pour que vous puissiez les voir sur le site. Pour les mettre en ligne, connectez GitHub dans « Mise en ligne » plus bas.";
    $("#gh-logout").hidden = !on;
    if (on) {
      $("#gh-owner").value = state.gh.owner;
      $("#gh-repo").value = state.gh.repo;
      $("#gh-branch").value = state.gh.branch;
      $("#gh-token").value = "";
      $("#gh-token").placeholder = "Clé enregistrée dans ce navigateur";
    }
  }

  /* ---------- Liste ---------- */
  function thumb(p) {
    const src = T.safeImage(p.image);
    return '<div class="thumb">' + (src ? '<img src="' + esc(src) + '" alt="">' : T.illusFor(p.category)) + "</div>";
  }
  function renderList() {
    const list = state.data.products.slice().sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    $("#list-count").textContent = list.length + " produit" + (list.length > 1 ? "s" : "");
    $("#drop-demo").hidden = !list.some(p => p.demo);
    if (!list.length) {
      $("#plist").innerHTML = '<div class="empty">Aucun produit pour l’instant. Cliquez sur « Ajouter un produit ».</div>';
      return;
    }
    $("#plist").innerHTML = list.map(p => {
      const nLinks = (p.links || []).filter(l => T.safeUrl(l.url)).length;
      return '<div class="pitem">' + thumb(p) +
        '<div style="min-width:0;display:grid;gap:4px"><h3>' + esc(p.name) + (p.demo ? ' <span class="badge demo" style="vertical-align:middle">Exemple</span>' : "") + "</h3>" +
          '<div class="pmeta"><span>' + esc(p.category || "Sans catégorie") + "</span><span>" + nLinks + " lien" + (nLinks > 1 ? "s" : "") + " d’achat</span>" +
          (p.featured ? "<span>Coup de cœur</span>" : "") + (nLinks ? "" : '<span style="color:var(--bad);font-weight:600">Aucun lien</span>') + "</div></div>" +
        '<div class="row-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-edit="' + esc(p.id) + '">Modifier</button>' +
          '<button type="button" class="btn btn-ghost btn-sm btn-danger" data-del="' + esc(p.id) + '">Supprimer</button>' +
        "</div></div>";
    }).join("");
  }

  function renderSettings() {
    document.querySelectorAll("[data-setting]").forEach(el => { el.value = state.data.settings[el.dataset.setting] || ""; });
  }
  function renderBackup() { $("#backup").value = JSON.stringify(state.data, null, 2); }
  function renderAll() { renderMode(); renderList(); renderSettings(); renderBackup(); }

  /* ---------- Éditeur ---------- */
  function linkRow(l, i) {
    const store = STORES.includes(l.store) ? l.store : (l.store ? "Autre" : "Amazon.fr");
    const custom = store === "Autre" ? (l.store && l.store !== "Autre" ? l.store : "") : "";
    return '<div class="link-row" data-i="' + i + '">' +
      '<div class="field"><label for="l-store-' + i + '" class="sr-only">Boutique</label><select class="input" id="l-store-' + i + '" data-k="store">' +
        STORES.map(s => "<option" + (s === store ? " selected" : "") + ">" + esc(s) + "</option>").join("") + "</select>" +
        '<input class="input" id="l-custom-' + i + '" data-k="custom" placeholder="Nom de la boutique" value="' + esc(custom) + '"' + (store === "Autre" ? "" : " hidden") + ' aria-label="Nom de la boutique"></div>' +
      '<div class="field"><label for="l-region-' + i + '" class="sr-only">Zone</label><input class="input" id="l-region-' + i + '" data-k="region" list="region-list" placeholder="Zone" value="' + esc(l.region || "") + '"></div>' +
      '<div class="field url"><label for="l-url-' + i + '" class="sr-only">Lien partenaire</label><input class="input" id="l-url-' + i + '" data-k="url" type="url" inputmode="url" placeholder="https://amzn.to/… ou lien avec tag=…" value="' + esc(l.url || "") + '"></div>' +
      '<button type="button" class="btn btn-ghost btn-sm btn-danger" data-rmlink="' + i + '" aria-label="Retirer ce lien">Retirer</button>' +
      '<span class="warn" id="l-warn-' + i + '" hidden></span>' +
    "</div>";
  }
  function collectLinks() {
    return Array.from(document.querySelectorAll(".link-row")).map(row => {
      const get = (k) => row.querySelector('[data-k="' + k + '"]').value.trim();
      const store = get("store") === "Autre" ? (get("custom") || "Autre") : get("store");
      return { store, region: get("region"), url: get("url") };
    });
  }
  function renderLinks(links) {
    $("#links").innerHTML = links.map(linkRow).join("") +
      '<datalist id="region-list">' + REGIONS.map(r => '<option value="' + esc(r) + '">').join("") + "</datalist>";
    links.forEach((_, i) => checkLink(i));
  }
  function checkLink(i) {
    const row = document.querySelector('.link-row[data-i="' + i + '"]');
    if (!row) return true;
    const raw = row.querySelector('[data-k="url"]').value.trim();
    const warn = row.querySelector(".warn");
    let msg = "";
    if (raw && !T.safeUrl(raw)) msg = "Ce lien n’est pas valide. Il doit commencer par https://";
    else if (raw) {
      const u = new URL(T.safeUrl(raw));
      const isAmazon = /(^|\.)amazon\./i.test(u.hostname);
      const isShort = /^(amzn\.to|amzn\.eu)$/i.test(u.hostname);
      if (isAmazon && !u.searchParams.get("tag") && !isShort) msg = "Ce lien Amazon ne contient pas votre identifiant partenaire (tag=…). Créez-le avec la barre SiteStripe pour toucher la commission.";
    }
    warn.textContent = msg;
    warn.hidden = !msg;
    return !msg || !msg.startsWith("Ce lien n’est pas valide");
  }

  function setPreview() {
    const src = T.safeImage(state.image);
    $("#img-preview").innerHTML = src ? '<img src="' + esc(src) + '" alt="Aperçu de la photo">' : T.illusFor($("#f-category").value);
  }

  function openEditor(id) {
    const p = id ? state.data.products.find(x => x.id === id) : null;
    state.editing = p ? p.id : null;
    $("#editor-title").textContent = p ? "Modifier le produit" : "Nouveau produit";
    $("#f-name").value = p ? p.name : "";
    $("#f-brand").value = p ? (p.brand || "") : "";
    $("#f-category").value = p ? (p.category || "") : "";
    $("#f-summary").value = p ? (p.summary || "") : "";
    $("#f-description").value = p ? (p.description || "") : "";
    $("#f-specs").value = p ? (p.specs || []).join("\n") : "";
    $("#f-pros").value = p ? (p.pros || []).join("\n") : "";
    $("#f-cons").value = p ? (p.cons || []).join("\n") : "";
    $("#f-badge").value = p ? (p.badge || "") : "";
    $("#f-score").value = p && p.score ? p.score : "";
    $("#f-price").value = p ? (p.price || "") : "";
    $("#f-featured").checked = !!(p && p.featured);
    state.image = p ? (p.image || "") : "";
    $("#f-image").value = /^data:/.test(state.image) ? "" : state.image;
    $("#name-err").hidden = true;
    const cats = Array.from(new Set(state.data.products.map(x => x.category).filter(Boolean)));
    $("#cat-list").innerHTML = cats.map(c => '<option value="' + esc(c) + '">').join("");
    renderLinks(p && p.links && p.links.length ? p.links : [{ store: "Amazon.fr", region: "Europe", url: "" }]);
    setPreview();
    const ov = $("#editor");
    ov.classList.add("open");
    ov.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    ov.scrollTop = 0;
    $("#f-name").focus();
  }
  function closeEditor() {
    const ov = $("#editor");
    ov.classList.remove("open");
    ov.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function uniqueId(base, except) {
    let id = T.slugify(base), n = 2;
    while (state.data.products.some(p => p.id === id && p.id !== except)) id = T.slugify(base) + "-" + n++;
    return id;
  }

  function submitEditor(e) {
    e.preventDefault();
    const name = $("#f-name").value.trim();
    if (!name) { $("#name-err").hidden = false; $("#f-name").focus(); return; }
    const linkRows = document.querySelectorAll(".link-row");
    let ok = true;
    linkRows.forEach((_, i) => { if (!checkLink(i)) ok = false; });
    if (!ok) { toast("Corrigez le lien d’achat signalé en rouge.", true); return; }
    const old = state.editing ? state.data.products.find(p => p.id === state.editing) : null;
    const score = parseFloat(String($("#f-score").value).replace(",", "."));
    const product = {
      id: old ? old.id : uniqueId(name),
      name,
      brand: $("#f-brand").value.trim(),
      category: $("#f-category").value.trim(),
      image: state.image,
      badge: $("#f-badge").value.trim(),
      featured: $("#f-featured").checked,
      score: isFinite(score) ? Math.max(0, Math.min(10, Math.round(score * 10) / 10)) : null,
      summary: $("#f-summary").value.trim(),
      description: $("#f-description").value.trim(),
      specs: lines($("#f-specs").value),
      pros: lines($("#f-pros").value),
      cons: lines($("#f-cons").value),
      price: $("#f-price").value.trim(),
      links: collectLinks().filter(l => l.url).map(l => ({ store: l.store, region: l.region, url: T.safeUrl(l.url) })),
      updatedAt: today()
    };
    if (old) state.data.products[state.data.products.indexOf(old)] = product;
    else state.data.products.push(product);
    closeEditor();
    setDirty(true);
    renderList();
    renderBackup();
    toast("Produit validé. Pensez à cliquer sur « " + $("#save").textContent + " ».");
  }

  /* ---------- Photos ---------- */
  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Ce fichier n’est pas une image lisible"));
        img.onload = () => {
          const max = 900;
          const ratio = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * ratio);
          c.height = Math.round(img.height * ratio);
          const ctx = c.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast("Photo trop lourde (15 Mo maximum).", true); return; }
    try {
      const dataUrl = await resizeImage(file);
      if (state.gh) {
        toast("Envoi de la photo…");
        const name = "images/" + T.slugify($("#f-name").value || "produit") + "-" + Date.now().toString(36) + ".jpg";
        await ghPutFile(name, dataUrl.split(",")[1], "Ajout photo " + name);
        state.image = name;
        // L'aperçu utilise la version locale : la photo publiée met environ une minute à apparaître en ligne.
        $("#img-preview").innerHTML = '<img src="' + dataUrl + '" alt="Aperçu de la photo">';
        $("#f-image").value = name;
        toast("Photo envoyée.");
      } else {
        state.image = dataUrl;
        $("#f-image").value = "";
        setPreview();
      }
    } catch (err) {
      toast(err.status ? ghErrorText(err) : err.message, true);
    }
  }

  /* ---------- Enregistrer / publier ---------- */
  async function save() {
    readSettingsInputs();
    if (!state.gh) {
      if (T.writeLocal(state.data)) { setDirty(false); toast("Aperçu enregistré. Ouvrez « Voir le site » pour le regarder."); }
      else toast("Ce navigateur refuse l’enregistrement (mémoire pleine ou navigation privée). Utilisez des photos par lien ou connectez GitHub.", true);
      return;
    }
    const btn = $("#save");
    btn.disabled = true;
    btn.textContent = "Publication…";
    try {
      await uploadInlineImages();
      const res = await ghPutFile("data.json", utf8ToB64(JSON.stringify(state.data, null, 2) + "\n"), "Mise à jour du catalogue (" + state.data.products.length + " produits)", state.sha);
      state.sha = res.content.sha;
      T.clearLocal();
      setDirty(false);
      toast("Publié ! Le site en ligne sera à jour dans environ une minute.");
    } catch (err) {
      toast(ghErrorText(err), true);
    } finally {
      btn.disabled = false;
      renderMode();
    }
  }
  // Photos ajoutées en mode aperçu : on les envoie dans le dépôt avant de publier.
  async function uploadInlineImages() {
    for (const p of state.data.products) {
      if (!/^data:image\/jpeg;base64,/.test(p.image || "")) continue;
      const name = "images/" + p.id + "-" + Date.now().toString(36) + ".jpg";
      await ghPutFile(name, p.image.split(",")[1], "Ajout photo " + name);
      p.image = name;
    }
  }

  function readSettingsInputs() {
    document.querySelectorAll("[data-setting]").forEach(el => { state.data.settings[el.dataset.setting] = el.value.trim(); });
  }

  async function connect(e) {
    e.preventDefault();
    const prev = state.gh;
    const g = {
      owner: $("#gh-owner").value.trim(),
      repo: $("#gh-repo").value.trim(),
      branch: $("#gh-branch").value.trim() || "main",
      token: $("#gh-token").value.trim() || (prev && prev.token) || ""
    };
    if (!g.owner || !g.repo || !g.token) { toast("Remplissez le compte, le dépôt et la clé d’accès.", true); return; }
    state.gh = g;
    try {
      const data = await ghLoad();
      writeGh(g);
      state.data = data;
      setDirty(false);
      renderAll();
      toast("Connecté. Le catalogue en ligne est chargé.");
    } catch (err) {
      state.gh = prev;
      toast(ghErrorText(err), true);
    }
  }

  /* ---------- Évènements ---------- */
  function bind() {
    $("#add").addEventListener("click", () => openEditor(null));
    $("#save").addEventListener("click", save);
    $("#editor-form").addEventListener("submit", submitEditor);
    $("#editor-close").innerHTML = ICONS.close;
    $("#editor-close").addEventListener("click", closeEditor);
    $("#editor-cancel").addEventListener("click", closeEditor);
    $("#editor").addEventListener("click", (e) => { if (e.target === $("#editor")) closeEditor(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#editor").classList.contains("open")) closeEditor(); });
    $("#add-link").addEventListener("click", () => {
      const links = collectLinks();
      links.push({ store: "Amazon.com", region: "International", url: "" });
      renderLinks(links);
    });
    $("#links").addEventListener("click", (e) => {
      const rm = e.target.closest("[data-rmlink]");
      if (!rm) return;
      const links = collectLinks();
      links.splice(Number(rm.dataset.rmlink), 1);
      renderLinks(links.length ? links : [{ store: "Amazon.fr", region: "Europe", url: "" }]);
    });
    $("#links").addEventListener("change", (e) => {
      if (e.target.dataset.k === "store") {
        const row = e.target.closest(".link-row");
        row.querySelector('[data-k="custom"]').hidden = e.target.value !== "Autre";
      }
    });
    $("#links").addEventListener("input", (e) => {
      if (e.target.dataset.k === "url") checkLink(Number(e.target.closest(".link-row").dataset.i));
    });
    $("#f-file").addEventListener("change", onFile);
    $("#f-image").addEventListener("input", (e) => { state.image = e.target.value.trim(); setPreview(); });
    $("#f-category").addEventListener("input", setPreview);

    $("#plist").addEventListener("click", (e) => {
      const ed = e.target.closest("[data-edit]");
      if (ed) { openEditor(ed.dataset.edit); return; }
      const del = e.target.closest("[data-del]");
      if (!del) return;
      if (!del.classList.contains("armed")) {
        del.classList.add("armed");
        del.textContent = "Confirmer";
        setTimeout(() => { if (del.isConnected) { del.classList.remove("armed"); del.textContent = "Supprimer"; } }, 4000);
        return;
      }
      state.data.products = state.data.products.filter(p => p.id !== del.dataset.del);
      setDirty(true);
      renderList();
      renderBackup();
      toast("Produit supprimé. Cliquez sur « " + $("#save").textContent + " » pour confirmer.");
    });
    $("#drop-demo").addEventListener("click", (e) => {
      const b = e.currentTarget;
      if (!b.classList.contains("armed")) {
        b.classList.add("armed");
        b.textContent = "Confirmer la suppression des exemples";
        setTimeout(() => { b.classList.remove("armed"); b.textContent = "Supprimer les exemples"; }, 4000);
        return;
      }
      state.data.products = state.data.products.filter(p => !p.demo);
      b.classList.remove("armed");
      b.textContent = "Supprimer les exemples";
      setDirty(true);
      renderList();
      renderBackup();
    });
    document.querySelectorAll("[data-setting]").forEach(el => el.addEventListener("input", () => { readSettingsInputs(); setDirty(true); renderBackup(); }));

    $("#gh-form").addEventListener("submit", connect);
    $("#gh-logout").addEventListener("click", async () => {
      writeGh(null);
      state.gh = null;
      state.sha = null;
      await loadInitial();
      toast("Déconnecté de GitHub. La clé a été retirée de ce navigateur.");
    });

    $("#backup-copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("#backup").value); toast("Sauvegarde copiée."); }
      catch (e) { $("#backup").select(); toast("Copie automatique refusée : le texte est sélectionné, copiez-le à la main.", true); }
    });
    $("#backup-restore").addEventListener("click", () => {
      try {
        const parsed = T.cleanData(JSON.parse($("#backup").value));
        state.data = parsed;
        setDirty(true);
        renderList();
        renderSettings();
        toast("Sauvegarde chargée. Cliquez sur « " + $("#save").textContent + " » pour la garder.");
      } catch (e) { toast("Ce texte n’est pas une sauvegarde valide.", true); }
    });
    window.addEventListener("beforeunload", (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ""; } });
  }

  async function loadInitial() {
    state.gh = readGh();
    try {
      if (state.gh) state.data = await ghLoad();
      else state.data = T.readLocal() ? T.cleanData(T.readLocal()) : await T.loadPublished();
    } catch (err) {
      if (state.gh) toast(ghErrorText(err), true);
      state.gh = null;
      state.data = T.readLocal() ? T.cleanData(T.readLocal()) : await T.loadPublished().catch(() => T.cleanData({}));
    }
    setDirty(false);
    renderAll();
  }

  $("#logo-mark").innerHTML = ICONS.logo;
  bind();
  loadInitial();
})();
