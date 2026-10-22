import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_OWNED_CARD_IDS } from '../data/catalog';
import { createSeedCampaigns, createSeedProgress } from '../data/seed';
import type { Campaign, ISODate, ProgramId, ProgressMap } from '../types';
import { todayISO } from '../utils/date';
import { applyTransaction, emptyProgress, type CampaignEvaluation } from '../utils/decisionEngine';

export interface RecordResult {
  applied: boolean;
  evaluation?: CampaignEvaluation;
}

interface AppState {
  ownedCardIds: string[];
  campaigns: Campaign[];
  progress: ProgressMap;
  hasHydrated: boolean;

  toggleCard: (cardId: string) => void;
  addCampaign: (campaign: Campaign, join?: boolean) => void;
  removeCampaign: (campaignId: string) => void;
  joinCampaign: (campaignId: string) => void;
  leaveCampaign: (campaignId: string) => void;
  /** "+ Harcama Ekle": harcamayı kampanya sayacına işler. */
  recordTransaction: (
    campaignId: string,
    amount: number,
    options?: { date?: ISODate; posProgramId?: ProgramId | null },
  ) => RecordResult;
  /** Son işlemi geri al (yanlış dokunuş için). */
  undoLastTransaction: (campaignId: string) => void;
  resetDemoData: () => void;
}

const createInitialData = () => {
  const today = todayISO();
  return {
    ownedCardIds: DEFAULT_OWNED_CARD_IDS,
    campaigns: createSeedCampaigns(today),
    progress: createSeedProgress(today),
  };
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),
      hasHydrated: false,

      toggleCard: (cardId) =>
        set((s) => ({
          ownedCardIds: s.ownedCardIds.includes(cardId)
            ? s.ownedCardIds.filter((id) => id !== cardId)
            : [...s.ownedCardIds, cardId],
        })),

      addCampaign: (campaign, join = true) =>
        set((s) => ({
          campaigns: [campaign, ...s.campaigns],
          progress: join
            ? { ...s.progress, [campaign.id]: { ...emptyProgress(campaign.id), joined: true } }
            : s.progress,
        })),

      removeCampaign: (campaignId) =>
        set((s) => {
          const { [campaignId]: _removed, ...rest } = s.progress;
          return { campaigns: s.campaigns.filter((c) => c.id !== campaignId), progress: rest };
        }),

      joinCampaign: (campaignId) =>
        set((s) => ({
          progress: {
            ...s.progress,
            [campaignId]: { ...(s.progress[campaignId] ?? emptyProgress(campaignId)), joined: true },
          },
        })),

      leaveCampaign: (campaignId) =>
        set((s) => {
          const p = s.progress[campaignId];
          if (!p) return s;
          return { progress: { ...s.progress, [campaignId]: { ...p, joined: false } } };
        }),

      recordTransaction: (campaignId, amount, options = {}) => {
        const campaign = get().campaigns.find((c) => c.id === campaignId);
        if (!campaign) return { applied: false };
        const result = applyTransaction(campaign, get().progress[campaignId], {
          amount,
          date: options.date ?? todayISO(),
          posProgramId: options.posProgramId,
        });
        if (result.applied) {
          set((s) => ({ progress: { ...s.progress, [campaignId]: result.progress } }));
        }
        return { applied: result.applied, evaluation: result.evaluation };
      },

      undoLastTransaction: (campaignId) =>
        set((s) => {
          const p = s.progress[campaignId];
          if (!p || p.transactions.length === 0) return s;
          const last = p.transactions[p.transactions.length - 1];
          const transactions = p.transactions.slice(0, -1);
          const counted = last.counted ?? last.amount;
          const earned = Math.max(0, p.earned - last.reward);
          return {
            progress: {
              ...s.progress,
              [campaignId]: {
                ...p,
                count: Math.max(0, p.count - 1),
                totalSpent: Math.max(0, p.totalSpent - counted),
                earned,
                transactions,
                lastTransactionDate: transactions[transactions.length - 1]?.date,
                pointExpiryDate: earned > 0 ? p.pointExpiryDate : undefined,
              },
            },
          };
        }),

      resetDemoData: () => set(createInitialData()),
    }),
    {
      name: 'kampanya-takip-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ ownedCardIds, campaigns, progress }) => ({ ownedCardIds, campaigns, progress }),
      onRehydrateStorage: () => () => {
        useAppStore.setState({ hasHydrated: true });
      },
    },
  ),
);
