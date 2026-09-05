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