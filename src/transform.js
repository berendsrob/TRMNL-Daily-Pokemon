// TRMNL Serverless transform (Node v20) — Markup Editor > Serverless tab.
// No external hosting. Network access is available inside this runtime.
// Budget: 128 MB, 5 seconds.

const GENERATIONS = {
  1: { from: 1,   to: 151,  region: "Kanto"  },
  2: { from: 152, to: 251,  region: "Johto"  },
  3: { from: 252, to: 386,  region: "Hoenn"  },
  4: { from: 387, to: 493,  region: "Sinnoh" },
  5: { from: 494, to: 649,  region: "Unova"  },
  6: { from: 650, to: 721,  region: "Kalos"  },
  7: { from: 722, to: 809,  region: "Alola"  },
  8: { from: 810, to: 905,  region: "Galar"  },
  9: { from: 906, to: 1025, region: "Paldea" },
};

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const API = "https://pokeapi.co/api/v2";
const ART = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
const SPRITE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const FALLBACK_TZ = "Europe/Amsterdam";

// --- i18n -------------------------------------------------------------------
//
// api: PokeAPI language code used for the genus and flavor lines. PokeAPI has
//      no Dutch, so nl falls back to English there.
// Month names are hardcoded rather than using toLocaleDateString, because a
// slim Node image may ship small-icu (English locale data only) and would
// silently return English month names for es/fr/nl. The same small-icu
// behaviour is why dayIndex() uses formatToParts instead of parsing a string.

const I18N = {
  en: {
    api: "en",
    title: "Pokémon of the Day",
    number: "No.",
    height: "Height",
    weight: "Weight",
    total: "Total",
    abilities: "Abilities",
    hidden: "hidden",
    evolution: "Evolution chain",
    legendary: "Legendary",
    mythical: "Mythical",
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  },
  es: {
    api: "es",
    title: "Pokémon del Día",
    number: "N.º",
    height: "Altura",
    weight: "Peso",
    total: "Total",
    abilities: "Habilidades",
    hidden: "oculta",
    evolution: "Cadena evolutiva",
    legendary: "Legendario",
    mythical: "Singular",
    months: ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"],
  },
  fr: {
    api: "fr",
    title: "Pokémon du Jour",
    number: "Nº",
    height: "Taille",
    weight: "Poids",
    total: "Total",
    abilities: "Talents",
    hidden: "caché",
    evolution: "Chaîne d'évolution",
    legendary: "Légendaire",
    mythical: "Fabuleux",
    months: ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."],
  },
  nl: {
    api: "en", // no Dutch in PokeAPI
    title: "Pokémon van de Dag",
    number: "Nr.",
    height: "Lengte",
    weight: "Gewicht",
    total: "Totaal",
    abilities: "Vaardigheden",
    hidden: "verborgen",
    evolution: "Evolutielijn",
    legendary: "Legendarisch",
    mythical: "Mythisch",
    months: ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"],
  },
};

// Type names. Hardcoded instead of calling /type/{name} 1-2x per render:
// that would cost extra round trips against a 5 second budget for data that
// never changes. Dutch is unofficial (no Dutch Pokemon localization exists).
const TYPES = {
  normal:   { en: "Normal",   es: "Normal",     fr: "Normal",   nl: "Normaal"    },
  fighting: { en: "Fighting", es: "Lucha",      fr: "Combat",   nl: "Vecht"      },
  flying:   { en: "Flying",   es: "Volador",    fr: "Vol",      nl: "Vliegend"   },
  poison:   { en: "Poison",   es: "Veneno",     fr: "Poison",   nl: "Gif"        },
  ground:   { en: "Ground",   es: "Tierra",     fr: "Sol",      nl: "Grond"      },
  rock:     { en: "Rock",     es: "Roca",       fr: "Roche",    nl: "Steen"      },
  bug:      { en: "Bug",      es: "Bicho",      fr: "Insecte",  nl: "Insect"     },
  ghost:    { en: "Ghost",    es: "Fantasma",   fr: "Spectre",  nl: "Spook"      },
  steel:    { en: "Steel",    es: "Acero",      fr: "Acier",    nl: "Staal"      },
  fire:     { en: "Fire",     es: "Fuego",      fr: "Feu",      nl: "Vuur"       },
  water:    { en: "Water",    es: "Agua",       fr: "Eau",      nl: "Water"      },
  grass:    { en: "Grass",    es: "Planta",     fr: "Plante",   nl: "Gras"       },
  electric: { en: "Electric", es: "Eléctrico",  fr: "Électrik", nl: "Elektrisch" },
  psychic:  { en: "Psychic",  es: "Psíquico",   fr: "Psy",      nl: "Psychisch"  },
  ice:      { en: "Ice",      es: "Hielo",      fr: "Glace",    nl: "IJs"        },
  dragon:   { en: "Dragon",   es: "Dragón",     fr: "Dragon",   nl: "Draak"      },
  dark:     { en: "Dark",     es: "Siniestro",  fr: "Ténèbres", nl: "Duister"    },
  fairy:    { en: "Fairy",    es: "Hada",       fr: "Fée",      nl: "Fee"        },
};

// Base stat labels, kept short so the bar rows stay narrow.
const STAT_KEYS = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
const STAT_LABELS = {
  "hp":              { en: "HP",      es: "PS",       fr: "PV",       nl: "HP"       },
  "attack":          { en: "Attack",  es: "Ataque",   fr: "Attaque",  nl: "Aanval"   },
  "defense":         { en: "Defense", es: "Defensa",  fr: "Défense",  nl: "Verded."  },
  "special-attack":  { en: "Sp. Atk", es: "At. Esp.", fr: "Att. Spé", nl: "Sp. Aanv" },
  "special-defense": { en: "Sp. Def", es: "Df. Esp.", fr: "Déf. Spé", nl: "Sp. Verd" },
  "speed":           { en: "Speed",   es: "Velocid.", fr: "Vitesse",  nl: "Snelheid" },
};
const STAT_SCALE = 200; // bars saturate here; only a handful of stats exceed it

// --- config -----------------------------------------------------------------

function fields(input) {
  return (input && input.trmnl && input.trmnl.plugin_settings
    && input.trmnl.plugin_settings.custom_fields_values) || {};
}

function language(input) {
  const raw = String(fields(input).language || "en").toLowerCase().trim();
  return I18N[raw] ? raw : "en";
}

// Empty / unset means the full National Dex.
function selectedGens(input) {
  let raw = fields(input).generations;
  if (raw === undefined || raw === null || raw === "") return ALL;
  if (!Array.isArray(raw)) raw = String(raw).split(",");
  const gens = [...new Set(
    raw.map((v) => parseInt(String(v).trim(), 10)).filter((n) => GENERATIONS[n])
  )].sort((a, b) => a - b);
  return gens.length ? gens : ALL;
}

function timeZone(input) {
  const user = (input && input.trmnl && input.trmnl.user) || {};
  return fields(input).time_zone || user.time_zone || FALLBACK_TZ;
}

// --- deterministic daily pick -----------------------------------------------

function dayIndex(tz) {
  const opts = { year: "numeric", month: "2-digit", day: "2-digit" };
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts })
      .formatToParts(new Date());
  } catch (_) {
    try {
      parts = new Intl.DateTimeFormat("en-US", { timeZone: FALLBACK_TZ, ...opts })
        .formatToParts(new Date());
    } catch (_) {
      parts = null;
    }
  }

  let y, m, d;
  if (parts) {
    const get = (type) => Number((parts.find((p) => p.type === type) || {}).value);
    y = get("year"); m = get("month"); d = get("day");
  }
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    const now = new Date();                    // last resort: UTC
    y = now.getUTCFullYear(); m = now.getUTCMonth() + 1; d = now.getUTCDate();
  }

  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { y, m, d, iso, index: Math.floor(Date.UTC(y, m - 1, d) / 86400000) };
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

// A stride coprime with the pool size walks every entry exactly once
// before repeating. ~0.618 spreads consecutive days far apart.
function stride(n) {
  if (n < 3) return 1;
  let s = Math.max(1, Math.round(n * 0.6180339887));
  while (gcd(s, n) !== 1) s = (s % n) + 1;
  return s;
}

function buildPool(gens) {
  const pool = [];
  for (const g of gens) {
    const { from, to } = GENERATIONS[g];
    for (let i = from; i <= to; i++) pool.push(i);
  }
  return pool;
}

// --- data -------------------------------------------------------------------

async function json(url, ms) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function pretty(slug) { return slug.split("-").map(cap).join(" "); }

// Chain nodes carry .../pokemon-species/25/ — the id is free, no extra fetch.
function speciesId(url) {
  const m = String(url).match(/\/pokemon-species\/(\d+)\/?$/);
  return m ? Number(m[1]) : 0;
}

// PokeAPI flavor text carries hard line breaks, form feeds and soft hyphens
// from the original cartridge layouts. Strip them or the screen shows gaps.
function clean(s) {
  return String(s || "").replace(/[\n\f\r\u000c]/g, " ").replace(/\u00ad/g, "")
    .replace(/\s+/g, " ").trim();
}

// Pick a localized entry, falling back to English then to blank.
function localized(list, key, apiLang) {
  const arr = list || [];
  const hit = arr.find((e) => e.language.name === apiLang)
           || arr.find((e) => e.language.name === "en");
  return hit ? clean(hit[key]) : "";
}

// Newest flavor text in the target language: later entries come from more
// recent games and generally read better than the Gen 1 originals.
function newestFlavor(entries, apiLang) {
  const arr = (entries || []).filter((e) => e.language.name === apiLang);
  const pool = arr.length
    ? arr
    : (entries || []).filter((e) => e.language.name === "en");
  return pool.length ? clean(pool[pool.length - 1].flavor_text) : "";
}

// Flatten the evolution tree into ordered stages. Branching lines
// (Eevee, Wurmple) put every sibling in the same stage.
function flattenChain(root, currentSlug) {
  const levels = [];
  let level = [root];
  while (level.length) {
    levels.push(level.map((n) => {
      const id = speciesId(n.species.url);
      return {
        slug: n.species.name,
        name: pretty(n.species.name),
        id,
        sprite: id ? `${SPRITE}/${id}.png` : "",
        current: n.species.name === currentSlug,
      };
    }));
    level = level.flatMap((n) => n.evolves_to);
  }
  return levels.map((members) => ({
    members,
    label: members.map((m) => m.name).join(" / "),
    current: members.some((m) => m.current),
    count: members.length,
  }));
}

// --- entrypoint -------------------------------------------------------------

async function run(input) {
  const lang = language(input);
  const t = I18N[lang];
  const gens = selectedGens(input);
  const tz = timeZone(input);
  const { y, m, d, iso, index } = dayIndex(tz);

  const pool = buildPool(gens);
  const n = pool.length;
  let pick = (index * stride(n)) % n;
  if (!Number.isFinite(pick) || pick < 0) pick = 0;
  const dex = pool[pick];

  const [mon, species] = await Promise.all([
    json(`${API}/pokemon/${dex}`, 2500),
    json(`${API}/pokemon-species/${dex}`, 2500),
  ]);

  // Non-fatal: a missing chain just hides the evolution row.
  let stages = [];
  try {
    const chain = await json(species.evolution_chain.url, 1500);
    stages = flattenChain(chain.chain, species.name);
  } catch (_) { /* leave blank */ }

  const types = mon.types
    .sort((a, b) => a.slot - b.slot)
    .map((x) => (TYPES[x.type.name] && TYPES[x.type.name][lang]) || cap(x.type.name));

  // Ability names come from the slug, not /ability/{name}. Fetching up to
  // three more endpoints for localized names does not fit the 5s budget.
  const abilities = mon.abilities
    .sort((a, b) => a.slot - b.slot)
    .map((a) => ({ name: pretty(a.ability.name), hidden: a.is_hidden }));

  const rawStats = {};
  for (const s of mon.stats) rawStats[s.stat.name] = s.base_stat;
  const stats = STAT_KEYS.map((k) => ({
    label: (STAT_LABELS[k] && STAT_LABELS[k][lang]) || k,
    value: rawStats[k] || 0,
    pct: Math.min(100, Math.round(((rawStats[k] || 0) / STAT_SCALE) * 100)),
  }));
  const stat_total = STAT_KEYS.reduce((a, k) => a + (rawStats[k] || 0), 0);

  const roman = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };
  const genNum = roman[species.generation.name.replace("generation-", "")] || 0;
  const meta = GENERATIONS[genNum] || {};

  return {
    // chrome, translated
    t,
    lang,
    date: `${d} ${t.months[m - 1]} ${y}`,
    date_iso: iso,
    time_zone: tz,
    // subject — name stays canonical, genus and flavor follow the language
    dex,
    dex_padded: String(dex).padStart(4, "0"),
    name: localized(species.names, "name", "en") || pretty(mon.name),
    genus: localized(species.genera, "genus", t.api),
    flavor: newestFlavor(species.flavor_text_entries, t.api),
    genus_is_english: t.api === "en" && lang !== "en",
    artwork: `${ART}/${dex}.png`,
    types: types.join(" / "),
    type_1: types[0] || "",
    type_2: types[1] || "",
    height_m: (mon.height / 10).toFixed(1),
    weight_kg: (mon.weight / 10).toFixed(1),
    region: meta.region || "",
    generation_label: meta.region ? `Gen ${genNum} · ${meta.region}` : `Gen ${genNum}`,
    is_legendary: species.is_legendary,
    is_mythical: species.is_mythical,
    // abilities + stats
    abilities,
    stats,
    stat_total,
    // evolution chain
    stages,
    has_evolution: stages.length > 1,
    // diagnostics
    pool_size: pool.length,
    generations_active: gens.join(","),
  };
}