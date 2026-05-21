import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SearchConditionDetail } from '../types';

interface SearchConditionStoreState {
  selectedId: number | null;
  editingCondition: SearchConditionDetail | null;
  isEditorOpen: boolean;

  setSelectedId(id: number | null): void;
  openEditor(condition?: SearchConditionDetail): void;
  openEditorById(id: number): void;
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

      openEditor: (condition) => set({ isEditorOpen: true, editingCondition: condition ?? null, selectedId: condition?.searchCondId ?? null }, false, 'openEditor'),

      /** detail을 모를 때 id만 넘기면 에디터가 내부 fetch. */
      openEditorById: (id) => set({ isEditorOpen: true, selectedId: id, editingCondition: null }, false, 'openEditorById'),

      closeEditor: () => set({ isEditorOpen: false, editingCondition: null, selectedId: null }, false, 'closeEditor'),

      setEditingCondition: (editingCondition) => set({ editingCondition }, false, 'setEditingCondition'),
    }),
    { name: 'SearchConditionStore' },
  ),
);
