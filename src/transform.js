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