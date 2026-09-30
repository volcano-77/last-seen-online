import type { RelationDefinition } from './case'

export const relationInputs = (relation: RelationDefinition) => [...(relation.evidenceIds || []), ...(relation.factIds || [])]

export function relationChoices(relations: RelationDefinition[], establishedIds: string[], availableIds: string[], selected: string[]) {
  const candidates = relations.filter((relation) => !establishedIds.includes(relation.id) &&
    selected.every((id) => relationInputs(relation).includes(id)))
  const compatibleIds = selected.length ? [...new Set(candidates.flatMap((relation) => relationInputs(relation)))] : availableIds
  return {
    compatibleIds: compatibleIds.filter((id) => availableIds.includes(id)),
    complete: candidates.find((relation) => relationInputs(relation).length === selected.length &&
      selected.every((id) => availableIds.includes(id))),
  }
}
