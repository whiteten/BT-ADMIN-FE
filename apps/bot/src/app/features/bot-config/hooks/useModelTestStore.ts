import { create } from 'zustand';

export interface ChatMessage {
  id: number;
  type: 'request' | 'response';
  content: string | object;
  timestamp: string;
}

interface ModelTestState {
  isOpen: boolean;
  activeTab: 'training' | 'deployed';
  inputValue: string;
  trainingMessages: ChatMessage[];
  deployedMessages: ChatMessage[];
}

interface ModelTestActions {
  setIsOpen: (isOpen: boolean) => void;
  setActiveTab: (tab: 'training' | 'deployed') => void;
  setInputValue: (value: string) => void;
  addMessage: (tab: 'training' | 'deployed', message: ChatMessage) => void;
  clearMessages: (tab?: 'training' | 'deployed') => void;
}

type ModelTestStore = ModelTestState & ModelTestActions;

export const useModelTestStore = create<ModelTestStore>((set) => ({
  isOpen: false,
  activeTab: 'training',
  inputValue: '',
  trainingMessages: [],
  deployedMessages: [],

  setIsOpen: (isOpen) => set({ isOpen }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setInputValue: (inputValue) => set({ inputValue }),
  addMessage: (tab, message) =>
    set((state) => ({
      [tab === 'training' ? 'trainingMessages' : 'deployedMessages']: [...(tab === 'training' ? state.trainingMessages : state.deployedMessages), message],
    })),
  clearMessages: (tab) => set(tab ? { [tab === 'training' ? 'trainingMessages' : 'deployedMessages']: [] } : { trainingMessages: [], deployedMessages: [] }),
}));
