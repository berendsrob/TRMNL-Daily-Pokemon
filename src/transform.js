const GENERATIONS = {
  1: { from: 1,   to: 151,  region: "Kanto"  },
  2: { from: 152, to: 251,  region: "Johto"  },
  3: { from: 252, to: 386,  region: "Hoenn"  },
  4: { from: 387, to: 493,  region: "Sinnoh" },
  5: { from: 494, to: 649,  region: "Unova"  },
  6: { from: 650, to: 721,  region: "Kalos"  },
  7: { from: 722, to: 809,  region: "Alola"  },
  8: { from: 810, to: 905,  region: "Galar"  },
  9: { from: 906, to: 1025, region: "Paldea" }
};

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const API = "https://pokeapi.co/api/v2";
const ART = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
const SPRITE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const FALLBACK_TZ = "Europe/Amsterdam";

const I18N = {
  en: {
    api: "en",
    title: "Pokemon of the Day",
    number: "No.",
    height: "Height",
    weight: "Weight",
    evolution: "Evolution chain",
    legendary: "Legendary",
    mythical: "Mythical",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  },
  es: {
    api: "es",
    title: "Pokemon del Dia",
    number: "N.\u00BA",
    height: "Altura",
    weight: "Peso",
    evolution: "Cadena evolutiva",
    legendary: "Legendario",
    mythical: "Singular",
    months: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  },
  fr: {
    api: "fr",
    title: "Pokemon du Jour",
    number: "N\u00BA",
    height: "Taille",
    weight: "Poids",
    evolution: "Chaine d'evolution",
    legendary: "Legendaire",
    mythical: "Fabuleux",
    months: ["janv.", "fevr.", "mars", "avr.", "mai", "juin", "juil.", "aout", "sept.", "oct.", "nov.", "dec."]
  },
  nl: {
    api: "en",
    title: "Pokemon van de Dag",
    number: "Nr.",
    height: "Lengte",
    weight: "Gewicht",
    evolution: "Evolutielijn",
    legendary: "Legendarisch",
    mythical: "Mythisch",
    months: ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]
  }
};

const TYPES = {
  normal:   { en: "Normal",   es: "Normal",    fr: "Normal",   nl: "Normaal" },
  fighting: { en: "Fighting", es: "Lucha",     fr: "Combat",   nl: "Vecht" },
  flying:   { en: "Flying",   es: "Volador",   fr: "Vol",      nl: "Vliegend" },
  poison:   { en: "Poison",   es: "Veneno",    fr: "Poison",   nl: "Gif" },
  ground:   { en: "Ground",   es: "Tierra",    fr: "Sol",      nl: "Grond" },
  rock:     { en: "Rock",     es: "Roca",      fr: "Roche",    nl: "Steen" },
  bug:      { en: "Bug",      es: "Bicho",     fr: "Insecte",  nl: "Insect" },
  ghost:    { en: "Ghost",    es: "Fantasma",  fr: "Spectre",  nl: "Spook" },
  steel:    { en: "Steel",    es: "Acero",     fr: "Acier",    nl: "Staal" },
  fire:     { en: "Fire",     es: "Fuego",     fr: "Feu",      nl: "Vuur" },
  water:    { en: "Water",    es: "Agua",      fr: "Eau",      nl: "Water" },
  grass:    { en: "Grass",    es: "Planta",    fr: "Plante",   nl: "Gras" },
  electric: { en: "Electric", es: "Electrico", fr: "Electrik", nl: "Elektrisch" },
  psychic:  { en: "Psychic",  es: "Psiquico",  fr: "Psy",      nl: "Psychisch" },
  ice:      { en: "Ice",      es: "Hielo",     fr: "Glace",    nl: "IJs" },
  dragon:   { en: "Dragon",   es: "Dragon",    fr: "Dragon",   nl: "Draak" },
  dark:     { en: "Dark",     es: "Siniestro", fr: "Tenebres", nl: "Duister" },
  fairy:    { en: "Fairy",    es: "Hada",      fr: "Fee",      nl: "Fee" }
};

function fields(input) {
  if (!input) return {};
  if (!input.trmnl) return {};
  if (!input.trmnl.plugin_settings) return {};
  return input.trmnl.plugin_settings.custom_fields_values || {};
}

function language(input) {
  const raw = String(fields(input).language || "en").toLowerCase().trim();
  return I18N[raw] ? raw : "en";
}

function selectedGens(input) {
  let raw = fields(input).generations;
  if (raw === undefined || raw === null || raw === "") return ALL;
  if (!Array.isArray(raw)) raw = String(raw).split(",");
  const seen = {};
  const gens = [];
  for (const v of raw) {
    const num = parseInt(String(v).trim(), 10);
    if (GENERATIONS[num] && !seen[num]) {
      seen[num] = true;
      gens.push(num);
    }
  }
  gens.sort(function (a, b) { return a - b; });
  return gens.length ? gens : ALL;
}

function timeZone(input) {
  const user = (input && input.trmnl && input.trmnl.user) || {};
  return fields(input).time_zone || user.time_zone || FALLBACK_TZ;
}

function dayIndex(tz) {
  let parts = null;
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
  } catch (e1) {
    try {
      parts = new Intl.DateTimeFormat("en-US", {
        timeZone: FALLBACK_TZ, year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(new Date());
    } catch (e2) {
      parts = null;
    }
  }

  let y = NaN;
  let m = NaN;
  let d = NaN;
  if (parts) {
    for (const p of parts) {
      if (p.type === "year") y = Number(p.value);
      if (p.type === "month") m = Number(p.value);
      if (p.type === "day") d = Number(p.value);
    }
  }
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    const now = new Date();
    y = now.getUTCFullYear();
    m = now.getUTCMonth() + 1;
    d = now.getUTCDate();
  }

  const iso = y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  return { y: y, m: m, d: d, iso: iso, index: Math.floor(Date.UTC(y, m - 1, d) / 86400000) };
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function stride(n) {
  if (n < 3) return 1;
  let s = Math.max(1, Math.round(n * 0.6180339887));
  while (gcd(s, n) !== 1) s = (s % n) + 1;
  return s;
}

function buildPool(gens) {
  const pool = [];
  for (const g of gens) {
    const range = GENERATIONS[g];
    for (let i = range.from; i <= range.to; i++) pool.push(i);
  }
  return pool;
}

async function json(url, ms) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(res.status + " " + url);
  return res.json();
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pretty(slug) {
  return String(slug).split("-").map(cap).join(" ");
}

function speciesId(url) {
  const m = String(url).match(/\/pokemon-species\/(\d+)\/?$/);
  return m ? Number(m[1]) : 0;
}

function clean(s) {
  return String(s || "")
    .replace(/[\n\f\r]/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function localized(list, key, apiLang) {
  const arr = list || [];
  let hit = null;
  for (const e of arr) {
    if (e.language.name === apiLang) { hit = e; break; }
  }
  if (!hit) {
    for (const e of arr) {
      if (e.language.name === "en") { hit = e; break; }
    }
  }
  return hit ? clean(hit[key]) : "";
}

function newestFlavor(entries, apiLang) {
  const arr = entries || [];
  let pool = arr.filter(function (e) { return e.language.name === apiLang; });
  if (!pool.length) {
    pool = arr.filter(function (e) { return e.language.name === "en"; });
  }
  return pool.length ? clean(pool[pool.length - 1].flavor_text) : "";
}

function flattenChain(root, currentSlug) {
  const levels = [];
  let level = [root];
  while (level.length) {
    const row = [];
    for (const node of level) {
      const id = speciesId(node.species.url);
      row.push({
        slug: node.species.name,
        name: pretty(node.species.name),
        id: id,
        sprite: id ? SPRITE + "/" + id + ".png" : "",
        art: id ? ART + "/" + id + ".png" : "",
        current: node.species.name === currentSlug
      });
    }
    levels.push(row);
    const next = [];
    for (const node of level) {
      for (const child of node.evolves_to) next.push(child);
    }
    level = next;
  }

  return levels.map(function (members) {
    let anyCurrent = false;
    const names = [];
    for (const mem of members) {
      if (mem.current) anyCurrent = true;
      names.push(mem.name);
    }
    return {
      members: members,
      label: names.join(" / "),
      current: anyCurrent,
      count: members.length
    };
  });
}

function relativesOnly(stages) {
  const out = [];
  for (const st of stages) {
    if (st.current) {
      out.push({ marker: true, members: [], count: 0 });
      const rest = st.members.filter(function (m) { return !m.current; });
      for (const mem of rest) out.push({ marker: false, members: [mem], count: 1 });
    } else {
      out.push({ marker: false, members: st.members, count: st.members.length });
    }
  }
  return out;
}

async function run(input) {
  const lang = language(input);
  const t = I18N[lang];
  const gens = selectedGens(input);
  const tz = timeZone(input);
  const today = dayIndex(tz);

  const pool = buildPool(gens);
  const n = pool.length;
  let pick = (today.index * stride(n)) % n;
  if (!Number.isFinite(pick) || pick < 0) pick = 0;
  const dex = pool[pick];

  const both = await Promise.all([
    json(API + "/pokemon/" + dex, 2500),
    json(API + "/pokemon-species/" + dex, 2500)
  ]);
  const mon = both[0];
  const species = both[1];

  let stages = [];
  try {
    const chain = await json(species.evolution_chain.url, 1500);
    stages = flattenChain(chain.chain, species.name);
  } catch (e) {
    stages = [];
  }
  const others = relativesOnly(stages);

  let otherCount = 0;
  for (const st of others) otherCount += st.count;

  const sortedTypes = mon.types.slice().sort(function (a, b) { return a.slot - b.slot; });
  const types = sortedTypes.map(function (x) {
    const entry = TYPES[x.type.name];
    return (entry && entry[lang]) || cap(x.type.name);
  });

  const roman = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };
  const genKey = species.generation.name.replace("generation-", "");
  const genNum = roman[genKey] || 0;
  const meta = GENERATIONS[genNum] || {};

  return {
    t: t,
    lang: lang,
    date: today.d + " " + t.months[today.m - 1] + " " + today.y,
    date_iso: today.iso,
    time_zone: tz,
    dex: dex,
    dex_padded: String(dex).padStart(4, "0"),
    name: localized(species.names, "name", "en") || pretty(mon.name),
    genus: localized(species.genera, "genus", t.api),
    flavor: newestFlavor(species.flavor_text_entries, t.api),
    genus_is_english: t.api === "en" && lang !== "en",
    artwork: ART + "/" + dex + ".png",
    types: types.join(" / "),
    type_1: types[0] || "",
    type_2: types[1] || "",
    height_m: (mon.height / 10).toFixed(1),
    weight_kg: (mon.weight / 10).toFixed(1),
    region: meta.region || "",
    generation_label: meta.region ? "Gen " + genNum + " - " + meta.region : "Gen " + genNum,
    is_legendary: species.is_legendary,
    is_mythical: species.is_mythical,
    stages: stages,
    others: others,
    other_count: otherCount,
    has_evolution: otherCount > 0,
    pool_size: pool.length,
    generations_active: gens.join(",")
  };
}