/** Публичный API фичи CRUD дефектов объектов */
export { useObjectDefectsQuery } from './model/useObjectDefectsQuery'
export {
  useObjectDefectMutations,
  type RemoveObjectDefectPayload,
} from './model/useObjectDefectMutations'
export {
  createDefectComponentLookup,
  createDefectCategoryLookup,
  resolveRemovedDefectValueIds,
  type DefectComponentLookup,
  type DefectCategoryLookup,
  type DefectSelection,
  type DefectRemoveDiff,
} from './model/componentSync'
