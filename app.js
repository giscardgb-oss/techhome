/* Tech Home — site public. */
(function () {
  "use strict";
  const { ICONS, esc, normalize, safeUrl, safeImage, illusFor, formatDate, DISCLOSURE } = window.TH;

  const state = { data: null, local: false, category: "Tous", query: "", sort: "recent" };
  const $ = (sel) => document.querySelector(sel);

  function fillIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(el => {
      el.innerHTML = ICONS[el.dataset.icon] || "";
      el.removeAttribute("data-icon");
    });
  }

  function media(p, cls) {
    const src = safeImage(p.image);
    if (src) return '<img src="' + esc(src) + '" alt="' + esc(p.name) + '" loading="lazy" class="' + (cls || "") + '">';
    return illusFor(p.category);
  }

  function validLinks(p) {
    return (p.links || []).map(l => Object.assign({}, l, { url: safeUrl(l.url) })).filter(l => l.url);
  }

  function buyLabel(link) {
    return "Voir sur " + (link.store || "la boutique");
  }

  function linkAttrs(url) {
    // "sponsored" signale aux moteurs de recherche que le lien est un lien partenaire.
    return 'href="' + esc(url) + '" target="_blank" rel="sponsored nofollow noopener"';
  }

  function card(p) {
    const links = validLinks(p);
    const first = links[0];
    const badges = [];
    if (p.demo) badges.push('<span class="badge demo">Exemple</span>');
    if (p.badge) badges.push('<span class="badge">' + esc(p.badge) + "</span>");
    const specs = (p.specs || []).slice(0, 3).map(s => '<span class="spec">' + esc(s) + "</span>").join("");
    const score = Number(p.score) > 0 ? '<span class="score" title="Note Tech Home">' + Number(p.score).toFixed(1).replace(".", ",") + "/10</span>" : "";
    return '<article class="card">' +
      '<div class="card-media">' + media(p) + '<div class="card-badges">' + badges.join("") + "</div></div>" +
      '<div class="card-body">' +
        '<div class="card-meta"><span>' + esc(p.category || "") + "</span>" + score + "</div>" +
        '<h3><button type="button" data-open="' + esc(p.id) + '">' + esc(p.name) + "</button></h3>" +
        (p.summary ? '<p class="summary">' + esc(p.summary) + "</p>" : "") +
        (specs ? '<div class="specs">' + specs + "</div>" : "") +
        '<div class="card-actions">' +
          (first ? '<a class="btn btn-buy" ' + linkAttrs(first.url) + ">" + esc(buyLabel(first)) + ICONS.out + "</a>" : '<span class="aff-note">Lien bientôt disponible</span>') +
          '<button type="button" class="btn btn-ghost" data-open="' + esc(p.id) + '">Détails</button>' +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function sorted(list) {
    const arr = list.slice();
    if (state.sort === "score") arr.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    else if (state.sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    else arr.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    return arr;
  }

  function matches(p) {
    if (state.category !== "Tous" && p.category !== state.category) return false;
    if (!state.query) return true;
    const hay = normalize([p.name, p.brand, p.category, p.summary, p.description, (p.specs || []).join(" ")].join(" "));
    return normalize(state.query).split(/\s+/).every(t => hay.includes(t));
  }

  function renderSettings() {
    const s = state.data.settings;
    document.title = s.siteName || "Tech Home";
    $("#site-name").textContent = s.siteName || "Tech Home";
    $("#footer-name").textContent = s.siteName || "Tech Home";
    if (s.heroTitle) $("#hero-title").textContent = s.heroTitle;
    if (s.heroText) $("#hero-text").textContent = s.heroText;
    $("#disclosure").textContent = DISCLOSURE + " Les liens « Voir sur… » sont des liens partenaires : ils ne changent pas votre prix.";
  }

  function renderChips() {
    const cats = ["Tous"].concat(Array.from(new Set(state.data.products.map(p => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")));
    if (!cats.includes(state.category)) state.category = "Tous";
    $("#chips").innerHTML = cats.map(c => '<button type="button" class="chip" aria-pressed="' + (c === state.category) + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>").join("");
  }

  function renderFeatured() {
    const list = sorted(state.data.products.filter(p => p.featured)).slice(0, 3);
    const section = $("#selection");
    section.hidden = list.length === 0;
    $("#featured").innerHTML = list.map(card).join("");
    $("#sel-count").textContent = list.length ? list.length + " produit" + (list.length > 1 ? "s" : "") : "";
  }

  function renderProducts() {
    const list = sorted(state.data.products.filter(matches));
    const total = state.data.products.length;
    $("#cat-count").textContent = list.length + " sur " + total + " produit" + (total > 1 ? "s" : "");
    if (!list.length) {
      $("#products").innerHTML = '<div class="empty" style="grid-column:1/-1">' +
        (total ? "Aucun produit ne correspond à votre recherche. Essayez un autre mot ou une autre catégorie." : "Le catalogue est vide pour le moment. Ajoutez votre premier produit depuis l'espace administrateur.") +
        "</div>";
      return;
    }
    $("#products").innerHTML = list.map(card).join("");
  }

  function renderAll() {
    renderSettings();
    renderChips();
    renderFeatured();
    renderProducts();
  }

  /* ---------- Fiche produit ---------- */
  function paragraphs(text) {
    return String(text || "").split(/\n\s*\n/).map(t => t.trim()).filter(Boolean).map(t => "<p>" + esc(t).replace(/\n/g, "<br>") + "</p>").join("");
  }

  function openProduct(id) {
    const p = state.data.products.find(x => x.id === id);
    if (!p) return false;
    const links = validLinks(p);
    const score = Number(p.score) > 0
      ? '<div class="verdict"><span class="big">' + Number(p.score).toFixed(1).replace(".", ",") + '</span><div><strong>Note Tech Home</strong><small>Sur 10, selon notre avis sur l’usage à la maison.</small></div></div>'
      : "";
    const stores = links.length
      ? '<div class="store-list">' + links.map((l, i) =>
          '<a class="btn ' + (i === 0 ? "btn-buy" : "btn-dark") + '" ' + linkAttrs(l.url) + "><span>" + esc(buyLabel(l)) + "</span>" +
          (l.region ? '<span class="region">' + esc(l.region) + "</span>" : ICONS.out) + "</a>").join("") +
        '<p class="aff-note">Lien partenaire : nous pouvons toucher une commission, sans frais pour vous. Prix et livraison affichés par la boutique.</p></div>'
      : '<p class="aff-note">Les liens d’achat de ce produit arrivent bientôt.</p>';
    const pros = (p.pros || []).map(x => '<li class="pro">' + ICONS.check + "<span>" + esc(x) + "</span></li>").join("");
    const cons = (p.cons || []).map(x => '<li class="con">' + ICONS.minus + "<span>" + esc(x) + "</span></li>").join("");
    const specs = (p.specs || []).map(s => "<tr><td>" + esc(s) + "</td></tr>").join("");
    $("#sheet").innerHTML =
      '<div class="sheet-top">' +
        '<div class="sheet-media">' + media(p) + "</div>" +
        '<div class="sheet-info">' +
          '<button type="button" class="close" id="close-sheet" aria-label="Fermer la fiche">' + ICONS.close + "</button>" +
          '<p class="eyebrow">' + esc([p.category, p.brand].filter(Boolean).join(" · ")) + "</p>" +
          '<h2 id="sheet-title">' + esc(p.name) + "</h2>" +
          (p.summary ? '<p style="color:var(--muted)">' + esc(p.summary) + "</p>" : "") +
          (p.price ? '<p><strong>Prix indicatif :</strong> ' + esc(p.price) + "</p>" : "") +
          score + stores +
        "</div>" +
      "</div>" +
      '<div class="sheet-body">' +
        '<div><h3>Notre avis</h3><div class="prose">' + (paragraphs(p.description) || "<p>Description à venir.</p>") + "</div>" +
          (p.updatedAt ? '<p class="aff-note" style="margin-top:14px">Fiche mise à jour le ' + esc(formatDate(p.updatedAt)) + "</p>" : "") +
        "</div>" +
        '<div style="display:grid;gap:22px;align-content:start">' +
          (pros || cons ? "<div><h3>Points forts et points faibles</h3><ul class=\"clean pc\">" + pros + cons + "</ul></div>" : "") +
          (specs ? '<div><h3>Caractéristiques</h3><table class="spec-table"><tbody>' + specs + "</tbody></table></div>" : "") +
        "</div>" +
      "</div>";
    const overlay = $("#overlay");
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $("#close-sheet").focus();
    return true;
  }

  function closeProduct(fromHash) {
    const overlay = $("#overlay");
    if (!overlay.classList.contains("open")) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (!fromHash && location.hash.startsWith("#p-")) {
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { location.hash = "catalogue"; }
    }
  }

  function syncHash() {
    const h = location.hash;
    if (h.startsWith("#p-")) { if (!openProduct(h.slice(3))) closeProduct(true); }
    else closeProduct(true);
  }

  /* ---------- Évènements ---------- */
  function bind() {
    document.addEventListener("click", (e) => {
      const open = e.target.closest("[data-open]");
      if (open) { location.hash = "p-" + open.dataset.open; return; }
      const chip = e.target.closest("[data-cat]");
      if (chip) { state.category = chip.dataset.cat; renderChips(); renderProducts(); return; }
      if (e.target.closest("#close-sheet") || e.target === $("#overlay")) closeProduct(false);
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeProduct(false); });
    window.addEventListener("hashchange", syncHash);
    let timer;
    $("#q").addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.query = e.target.value; renderProducts(); }, 150);
    });
    $("#search-form").addEventListener("submit", (e) => {
      e.preventDefault();
      state.query = $("#q").value;
      renderProducts();
      document.getElementById("catalogue").scrollIntoView({ behavior: "smooth" });
    });
    $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderProducts(); });
    $("#drop-local").addEventListener("click", async () => {
      window.TH.clearLocal();
      await start();
    });
  }

  async function start() {
    try {
      const res = await window.TH.loadData();
      state.data = res.data;
      state.local = res.local;
      $("#local-banner").hidden = !res.local;
      renderAll();
      syncHash();
    } catch (err) {
      $("#products").innerHTML = '<div class="empty" style="grid-column:1/-1">Le catalogue n’a pas pu être chargé. Rechargez la page dans un instant.</div>';
    }
  }

  $("#logo-mark").innerHTML = ICONS.logo;
  $("#search-icon").outerHTML = ICONS.search;
  $("#year").textContent = new Date().getFullYear();
  fillIcons();
  bind();
  start();
})();
