/**
 * The plant that stands for a project.
 *
 * Species is rolled, not chosen — a new project draws one at random (see
 * `rollSpecies` below), weighted by rarity. The roll is purely cosmetic
 * (collecting is the point, nothing else reads rarity), and nobody re-rolls
 * once a project exists: editing a project cannot change its plant.
 *
 * Every species ships four levels × healthy/neglected as
 * `succulents/{id}-l{1..4}-{healthy|neglected}.png`. Adding one is a matter of
 * running tools/splice-succulents.py over the new sheet, adding a line here,
 * and giving it a rarity tier below — nothing else in the app enumerates
 * species.
 */
export const SPECIES = [
  { id: 'echeveria', label: 'Echeveria' },
  { id: 'echeveria-blue-mist', label: 'Blue Mist' },
  { id: 'echeveria-lilac-mist', label: 'Lilac Mist' },
  { id: 'aeonium', label: 'Aeonium' },
  { id: 'agave', label: 'Agave' },
  { id: 'aloe', label: 'Aloe' },
  { id: 'haworthia', label: 'Haworthia' },
  { id: 'sansevieria', label: 'Snake plant' },
  { id: 'barrel-cactus', label: 'Barrel cactus' },
] as const;

export type PlantSpecies = (typeof SPECIES)[number]['id'];

export const DEFAULT_SPECIES: PlantSpecies = 'echeveria';

const IDS = new Set<string>(SPECIES.map((s) => s.id));

/** Guards the render path: an id from an older backup, or a species retired
 *  from the list, falls back rather than requesting a 404 and drawing nothing. */
export function speciesOr(id: string | undefined | null): PlantSpecies {
  return id && IDS.has(id) ? (id as PlantSpecies) : DEFAULT_SPECIES;
}

export function speciesLabel(id: string): string {
  return SPECIES.find((s) => s.id === id)?.label ?? 'Plant';
}

// ---------------- Gacha ----------------

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';

export const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 50,
  uncommon: 30,
  rare: 15,
  epic: 5,
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
};

/**
 * Which tier each of today's nine species sits in.
 *
 * NB (flagged for Kathleen): these are all generic, non-native succulents, so
 * there's no conservation-status or native-range angle to hang rarity on —
 * this split is purely by how visually distinctive/unusual the plant looks,
 * a judgement call. Worth you sanity-checking or reshuffling once there's
 * actual art to look at; nothing downstream depends on which species sits in
 * which tier beyond this table.
 */
export const SPECIES_RARITY: Record<PlantSpecies, Rarity> = {
  echeveria: 'common',
  agave: 'common',
  haworthia: 'common',
  sansevieria: 'common',
  aloe: 'uncommon',
  aeonium: 'uncommon',
  'barrel-cactus': 'uncommon',
  'echeveria-blue-mist': 'rare',
  'echeveria-lilac-mist': 'epic',
};

const SPECIES_BY_RARITY: Record<Rarity, PlantSpecies[]> = (() => {
  const byRarity: Record<Rarity, PlantSpecies[]> = {
    common: [],
    uncommon: [],
    rare: [],
    epic: [],
  };
  for (const s of SPECIES) byRarity[SPECIES_RARITY[s.id]].push(s.id);
  return byRarity;
})();

/**
 * Rolls a new project's plant: picks a rarity tier by weight, then picks
 * uniformly among that tier's species. `rand` is injectable for tests —
 * defaults to `Math.random`.
 */
export function rollSpecies(rand: () => number = Math.random): PlantSpecies {
  const total = RARITY_WEIGHT.common + RARITY_WEIGHT.uncommon + RARITY_WEIGHT.rare + RARITY_WEIGHT.epic;
  let roll = rand() * total;

  let tier: Rarity = 'epic';
  for (const r of ['common', 'uncommon', 'rare', 'epic'] as const) {
    if (roll < RARITY_WEIGHT[r]) {
      tier = r;
      break;
    }
    roll -= RARITY_WEIGHT[r];
  }

  const pool = SPECIES_BY_RARITY[tier];
  return pool[Math.floor(rand() * pool.length)];
}
