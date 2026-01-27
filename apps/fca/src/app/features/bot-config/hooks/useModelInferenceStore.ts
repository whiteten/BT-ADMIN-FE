import { create } from 'zustand';
import { TargetServer } from '../types/inference';

export interface ChatMessage {
  id: number;
  type: 'request' | 'response';
  content: string | object;
  timestamp: string;
}

interface ModelInferenceState {
  isOpen: boolean;
  activeTab: TargetServer;
  inputValue: string;
  testMessages: ChatMessage[];
  prodMessages: ChatMessage[];
}

interface ModelInferenceActions {
  setIsOpen: (isOpen: boolean) => void;
  setActiveTab: (tab: TargetServer) => void;
  setInputValue: (value: string) => void;
  addMessage: (tab: TargetServer, message: ChatMessage) => void;
  clearMessages: (tab?: TargetServer) => void;
}

type ModelInferenceStore = ModelInferenceState & ModelInferenceActions;

export const useModelInferenceStore = create<ModelInferenceStore>((set) => ({
  isOpen: false,
  activeTab: TargetServer.TEST,
  inputValue: '',
  testMessages: [],
  prodMessages: [],

  setIsOpen: (isOpen) => set({ isOpen }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setInputValue: (inputValue) => set({ inputValue }),
  addMessage: (tab, message) =>
    set((state) => ({
      [tab === TargetServer.TEST ? 'testMessages' : 'prodMessages']: [...(tab === TargetServer.TEST ? state.testMessages : state.prodMessages), message],
    })),
  clearMessages: (tab) => set(tab ? { [tab === TargetServer.TEST ? 'testMessages' : 'prodMessages']: [] } : { testMessages: [], prodMessages: [] }),
}));
