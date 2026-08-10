/**
 * The plant you can put on a project.
 *
 * Species is chosen, not derived — a project's type used to pick its plant,
 * which meant the garden only ever showed three, and changing a project's type
 * silently swapped its plant. Now it's yours to pick and nothing else touches
 * it.
 *
 * Every species ships four levels × healthy/neglected as
 * `succulents/{id}-l{1..4}-{healthy|neglected}.png`. Adding one is a matter of
 * running tools/splice-succulents.py over the new sheet and adding a line here
 * — nothing else in the app enumerates species.
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
