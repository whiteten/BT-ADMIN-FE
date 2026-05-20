import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { CalcField, FieldDisplay, PanelDetail, ReportDetail, SearchBinding } from '../features/report/types';

interface ReportEditorState {
  report: ReportDetail | null;
  fieldDisplays: FieldDisplay[];
  calcFields: CalcField[];
  searchBindings: SearchBinding[];
  panels: PanelDetail[];
  isDirty: boolean;

  setReport(report: ReportDetail): void;
  setFieldDisplays(displays: FieldDisplay[]): void;
  setCalcFields(fields: CalcField[]): void;
  setSearchBindings(bindings: SearchBinding[]): void;
  setPanels(panels: PanelDetail[]): void;
  addPanel(panel: PanelDetail): void;
  updatePanel(panelId: number, data: Partial<PanelDetail>): void;
  removePanel(panelId: number): void;
  addCalcField(cf: CalcField): void;
  updateCalcField(calcFieldId: number, data: Partial<CalcField>): void;
  removeCalcField(calcFieldId: number): void;
  addSearchBinding(binding: SearchBinding): void;
  removeSearchBinding(bindId: number): void;
  setDirty(dirty: boolean): void;
  reset(): void;
}

const initialState = {
  report: null,
  fieldDisplays: [],
  calcFields: [],
  searchBindings: [],
  panels: [],
  isDirty: false,
};

export const useReportEditorStore = create<ReportEditorState>()(
  devtools(
    (set) => ({
      ...initialState,

      setReport: (report) => set({ report }, false, 'setReport'),
      setFieldDisplays: (fieldDisplays) => set({ fieldDisplays }, false, 'setFieldDisplays'),
      setCalcFields: (calcFields) => set({ calcFields }, false, 'setCalcFields'),
      setSearchBindings: (searchBindings) => set({ searchBindings }, false, 'setSearchBindings'),
      setPanels: (panels) => set({ panels }, false, 'setPanels'),

      addPanel: (panel) => set((s) => ({ panels: [...s.panels, panel], isDirty: true }), false, 'addPanel'),

      updatePanel: (panelId, data) =>
        set(
          (s) => ({
            panels: s.panels.map((p) => (p.panelId === panelId ? { ...p, ...data } : p)),
            isDirty: true,
          }),
          false,
          'updatePanel',
        ),

      removePanel: (panelId) => set((s) => ({ panels: s.panels.filter((p) => p.panelId !== panelId), isDirty: true }), false, 'removePanel'),

      addCalcField: (cf) => set((s) => ({ calcFields: [...s.calcFields, cf], isDirty: true }), false, 'addCalcField'),

      updateCalcField: (calcFieldId, data) =>
        set(
          (s) => ({
            calcFields: s.calcFields.map((cf) => (cf.calcFieldId === calcFieldId ? { ...cf, ...data } : cf)),
            isDirty: true,
          }),
          false,
          'updateCalcField',
        ),

      removeCalcField: (calcFieldId) => set((s) => ({ calcFields: s.calcFields.filter((cf) => cf.calcFieldId !== calcFieldId), isDirty: true }), false, 'removeCalcField'),

      addSearchBinding: (binding) => set((s) => ({ searchBindings: [...s.searchBindings, binding], isDirty: true }), false, 'addSearchBinding'),

      removeSearchBinding: (bindId) => set((s) => ({ searchBindings: s.searchBindings.filter((b) => b.bindId !== bindId), isDirty: true }), false, 'removeSearchBinding'),

      setDirty: (isDirty) => set({ isDirty }, false, 'setDirty'),

      reset: () => set(initialState, false, 'reset'),
    }),
    { name: 'ReportEditorStore' },
  ),
);
