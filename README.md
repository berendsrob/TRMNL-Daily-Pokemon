# TRMNL: Pokémon of the Day

No external hosting. Everything runs inside TRMNL.

## Install

1. Plugins > Private Plugins > New. Name it, Save.
2. Settings page: Strategy **Polling**, Verb **GET**, Polling URL
   `https://pokeapi.co/api/v2/pokemon/1` (a throwaway; the transform ignores
   it, but polling requires a valid URL). Refresh **360 min**. Headers and
   Body empty, OAuth off. Bleed margin **No**, Dark Mode **No**.
   Framework CSS version **3.3** or newer. Enable **Debug Logs**.
3. Form Fields: paste `settings.yml`, run the inline YAML verifier, Save.
   Do this before step 4, the transform reads these values.
4. Edit Markup > **Serverless** tab > language **Node** > paste `transform.js`.
5. Edit Markup > **Full** tab > paste `full.liquid`.
6. Force Refresh. Merge variables only appear after the first fetch.
7. Add the plugin to a **Playlist**, or it never reaches the device.

## Configuration

- **Language** — English, Español, Français, Nederlands. Default English.
- **Generations** — ctrl/⌘+click to multi-select. Empty means all 1025.
- **Time Zone** — when the day rolls over. Defaults to your account setting.

## How the daily pick works

The selected generations expand into a pool of dex numbers, then:

```
index = (dayIndex * stride) % pool.length
```

`stride` is the value nearest `0.618 * pool.length` that is coprime with it.
Coprime means the walk visits every entry exactly once before repeating; the
golden-ratio position keeps consecutive days far apart in the dex. Kanto-only
gives 151 unique days, full dex gives 1025. Stateless, no cron, no drift.

## What "language" does and does not cover

Translated: all labels, the title bar, Legendary/Mythical, month names, and
the eighteen type names.

Not translated: Pokémon names, by your request. Region names (Kanto, Hoenn)
are proper nouns and stay as-is.

**Dutch is a real gap.** Pokémon has never had an official Dutch release and
PokeAPI carries no Dutch data. Two consequences:

- The genus line ("Seed Pokémon") stays **English** when you pick Dutch. The
  payload exposes `genus_is_english` if you want to grey it out or hide it.
  Spanish and French come straight from PokeAPI and are official.
- The Dutch type names in `TYPES` are my own, not official. Check them and
  edit the table if you disagree. `Gras` vs `Plant` and `Vecht` vs `Gevecht`
  are both defensible.

Spanish uses the official Pokédex terms, which may look wrong if you expect
literal translations: mythical is **Singular**, not *Mítico*. French mythical
is **Fabuleux**. Change them in `I18N` if you prefer the literal forms.

Month names are hardcoded rather than using `toLocaleDateString`. A slim Node
image may ship small-icu with English-only locale data, which would silently
return English months for es/fr/nl with no error to catch.

## Constraints

**5 seconds, 128 MB.** Three PokeAPI calls: pokemon and species in parallel,
then the evolution chain. Timeouts 3s/3s/2s. The chain call is wrapped in
try/catch, so a slow PokeAPI degrades to a screen without the evolution row
rather than a failed render. Type names are hardcoded specifically to avoid
two more round trips against this budget.

**Branching chains.** Eevee has eight siblings in one stage, Wurmple splits.
Siblings are joined with `/`. If Eevee's line wraps badly, cap it with
`{% if stage.count > 3 %}` and render `{{ stage.count }}` instead.

**4-bit is greyscale, not colour.** TRMNL X renders 16 grey levels. Artwork
still desaturates, you just get real tonal modelling instead of dither.
`image-dither` is deliberately absent; it only helps at 1 bit.

## Verifying

`pool_size`, `generations_active` and `lang` are in the payload. Drop them in
the title bar while testing to confirm your form fields are being read, then
remove.
