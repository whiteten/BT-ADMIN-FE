import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SearchConditionDetail } from '../features/search-condition/types';

interface SearchConditionStoreState {
  selectedId: number | null;
  editingCondition: SearchConditionDetail | null;
  isEditorOpen: boolean;

  setSelectedId(id: number | null): void;
  openEditor(condition?: SearchConditionDetail): void;
  closeEditor(): void;
  setEditingCondition(condition: SearchConditionDetail | null): void;
}

export const useSearchConditionStore = create<SearchConditionStoreState>()(
  devtools(
    (set) => ({
      selectedId: null,
      editingCondition: null,
      isEditorOpen: false,

      setSelectedId: (selectedId) => set({ selectedId }, false, 'setSelectedId'),

      openEditor: (condition) => set({ isEditorOpen: true, editingCondition: condition ?? null }, false, 'openEditor'),

      closeEditor: () => set({ isEditorOpen: false, editingCondition: null }, false, 'closeEditor'),

      setEditingCondition: (editingCondition) => set({ editingCondition }, false, 'setEditingCondition'),
    }),
    { name: 'SearchConditionStore' },
  ),
);
