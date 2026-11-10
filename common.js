/* Tech Home — fonctions partagées par le site et l'espace admin. */
(function () {
  "use strict";

  const LOCAL_KEY = "techhome.localData";
  const DISCLOSURE = "En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises.";

  const ICONS = {
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><rect x="9.5" y="13" width="5" height="4" rx="1"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>'
  };

  // Illustrations simples par catégorie, utilisées quand un produit n'a pas encore de photo.
  const ILLUS = {
    audio: '<path d="M14 40v-6a18 18 0 0 1 36 0v6"/><rect x="10" y="38" width="10" height="16" rx="4"/><rect x="44" y="38" width="10" height="16" rx="4"/>',
    maison: '<path d="M10 30 32 12l22 18"/><path d="M16 26v26h32V26"/><path d="M26 38a8 8 0 0 1 12 0"/><path d="M22 33a14 14 0 0 1 20 0"/><circle cx="32" cy="43" r="1.6"/>',
    accessoires: '<rect x="18" y="12" width="28" height="30" rx="6"/><path d="M26 42v10M38 42v10"/><path d="M26 24h12"/><path d="M32 18v12"/>',
    bureau: '<rect x="8" y="18" width="48" height="22" rx="4"/><path d="M14 25h4M22 25h4M30 25h4M38 25h4M46 25h4M18 32h28"/><rect x="26" y="44" width="12" height="12" rx="6"/>',
    gaming: '<path d="M20 22h24a10 10 0 0 1 9.6 7.2l2.6 9.4a6 6 0 0 1-10 5.8L42 40H22l-4.2 4.4a6 6 0 0 1-10-5.8l2.6-9.4A10 10 0 0 1 20 22Z"/><path d="M20 29v8M16 33h8"/><circle cx="42" cy="31" r="1.6"/><circle cx="46" cy="35" r="1.6"/>',
    informatique: '<rect x="12" y="14" width="40" height="26" rx="3"/><path d="M6 48h52l-4-8H10Z"/>',
    smartphone: '<rect x="20" y="8" width="24" height="48" rx="5"/><path d="M29 50h6"/>',
    defaut: '<rect x="14" y="14" width="36" height="36" rx="8"/><circle cx="32" cy="32" r="8"/>'
  };

  function illusFor(category) {
    const c = normalize(category);
    let key = "defaut";
    if (/audio|casque|ecouteur|enceinte|barre de son/.test(c)) key = "audio";
    else if (/maison|domotique|connect|securit|camera/.test(c)) key = "maison";
    else if (/accessoire|charg|cable|batterie/.test(c)) key = "accessoires";
    else if (/bureau|teletravail|clavier|souris/.test(c)) key = "bureau";
    else if (/gaming|jeu|console|manette/.test(c)) key = "gaming";
    else if (/informatique|ordinateur|pc|laptop|ecran/.test(c)) key = "informatique";
    else if (/smartphone|telephone|mobile|tablette/.test(c)) key = "smartphone";
    return '<svg class="illus" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ILLUS[key] + "</svg>";
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }

  function slugify(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "produit";
  }

  // Seuls les liens http(s) sont acceptés pour les boutons d'achat.
  function safeUrl(url) {
    try {
      const u = new URL(String(url || "").trim());
      return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
    } catch (e) { return ""; }
  }

  // Image : URL http(s), chemin relatif du site (images/...) ou image intégrée (data:image/...).
  function safeImage(src) {
    const s = String(src || "").trim();
    if (!s) return "";
    if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s)) return s;
    if (/^images\/[\w.\-\/]+$/.test(s)) return s;
    return safeUrl(s);
  }

  function readLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeLocal(data) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  }
  function clearLocal() {
    try { localStorage.removeItem(LOCAL_KEY); } catch (e) { /* rien */ }
  }

  function cleanData(data) {
    const d = data && typeof data === "object" ? data : {};
    return {
      settings: Object.assign({ siteName: "Tech Home" }, d.settings || {}),
      products: Array.isArray(d.products) ? d.products.filter(p => p && p.id && p.name) : []
    };
  }

  async function loadPublished() {
    const res = await fetch("data.json?v=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("data.json introuvable (" + res.status + ")");
    return cleanData(await res.json());
  }

  // Le site affiche l'aperçu local s'il existe (modifications pas encore publiées), sinon la version en ligne.
  async function loadData() {
    const local = readLocal();
    if (local) return { data: cleanData(local), local: true };
    return { data: await loadPublished(), local: false };
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  window.TH = { LOCAL_KEY, DISCLOSURE, ICONS, illusFor, esc, normalize, slugify, safeUrl, safeImage, readLocal, writeLocal, clearLocal, cleanData, loadPublished, loadData, formatDate };
})();
