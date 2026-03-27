import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppPhase, Message, LifeTree } from './types';

interface ArcStore {
  phase: AppPhase;
  messages: Message[];
  tree: LifeTree | null;
  narrative: string | null;
  isLoading: boolean;
  exchangeCount: number;
  intention: string | null;

  setPhase: (phase: AppPhase) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  updateLastMessage: (content: string) => void;
  setTree: (tree: LifeTree) => void;
  setNarrative: (narrative: string) => void;
  setLoading: (loading: boolean) => void;
  incrementExchange: () => void;
  setIntention: (intention: string) => void;
  reset: () => void;
}

export const useArcStore = create<ArcStore>()(
  persist(
    (set) => ({
      phase: 'landing',
      messages: [],
      tree: null,
      narrative: null,
      isLoading: false,
      exchangeCount: 0,
      intention: null,

      setPhase: (phase) => set({ phase }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      setMessages: (messages) => set({ messages }),
      updateLastMessage: (content) =>
        set((state) => {
          const msgs = [...state.messages];
          if (msgs.length > 0) {
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
          }
          return { messages: msgs };
        }),
      setTree: (tree) => set({ tree }),
      setNarrative: (narrative) => set({ narrative }),
      setLoading: (loading) => set({ isLoading: loading }),
      incrementExchange: () => set((state) => ({ exchangeCount: state.exchangeCount + 1 })),
      setIntention: (intention) => set({ intention }),
      reset: () => {
        sessionStorage.removeItem('arc-session');
        set({
          phase: 'landing',
          messages: [],
          tree: null,
          narrative: null,
          isLoading: false,
          exchangeCount: 0,
          intention: null,
        });
      },
    }),
    {
      name: 'arc-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        phase: state.phase,
        messages: state.messages,
        tree: state.tree,
        narrative: state.narrative,
        exchangeCount: state.exchangeCount,
        intention: state.intention,
      }),
    },
  ),
);
