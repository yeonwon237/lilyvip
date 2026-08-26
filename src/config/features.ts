import type { UserTier } from '../types';

export type FeatureId =
  | 'audio'
  | 'lilyVoices'
  | 'readerPro'
  | 'premiumThemes'
  | 'advancedTypography'
  | 'bookmark'
  | 'quoteCard'
  | 'search'
  | 'shelves'
  | 'offline'
  | 'autoScroll'
  | 'focusMode'
  | 'customPreset'
  | 'cloudLibrary'
  | 'accountSync'
  | 'payment';

export type FutureTier = 'free' | 'audio' | 'vip' | 'unavailable';

export interface FeatureDefinition {
  enabled: boolean;
  betaAccess: boolean;
  futureTier: FutureTier;
}

const envOpenBeta = import.meta.env.VITE_OPEN_BETA;

export const PRODUCT_MODE = Object.freeze({
  // Open unless a deployment explicitly opts out. This makes Beta safe for
  // current builds while preserving a one-line path back to entitlements.
  openBeta: envOpenBeta === undefined ? true : envOpenBeta !== 'false',
});

export const PRODUCT_LIMITS = Object.freeze({
  maxLocalBooks: 3,
});

export const FEATURES: Record<FeatureId, FeatureDefinition> = Object.freeze({
  audio: { enabled: true, betaAccess: true, futureTier: 'audio' },
  lilyVoices: { enabled: true, betaAccess: true, futureTier: 'audio' },
  readerPro: { enabled: true, betaAccess: true, futureTier: 'vip' },
  premiumThemes: { enabled: true, betaAccess: true, futureTier: 'vip' },
  advancedTypography: { enabled: true, betaAccess: true, futureTier: 'vip' },
  bookmark: { enabled: true, betaAccess: true, futureTier: 'free' },
  quoteCard: { enabled: true, betaAccess: true, futureTier: 'free' },
  search: { enabled: true, betaAccess: true, futureTier: 'free' },
  shelves: { enabled: true, betaAccess: true, futureTier: 'free' },
  offline: { enabled: true, betaAccess: true, futureTier: 'free' },
  autoScroll: { enabled: true, betaAccess: true, futureTier: 'vip' },
  focusMode: { enabled: true, betaAccess: true, futureTier: 'vip' },
  customPreset: { enabled: true, betaAccess: true, futureTier: 'vip' },
  cloudLibrary: { enabled: false, betaAccess: false, futureTier: 'unavailable' },
  accountSync: { enabled: false, betaAccess: false, futureTier: 'unavailable' },
  payment: { enabled: false, betaAccess: false, futureTier: 'unavailable' },
});

export function canUseFeature(feature: FeatureId, tier: UserTier = 'free'): boolean {
  const definition = FEATURES[feature];
  if (!definition.enabled) return false;
  if (PRODUCT_MODE.openBeta && definition.betaAccess) return true;
  if (definition.futureTier === 'free') return true;
  if (definition.futureTier === 'audio') return tier === 'audio' || tier === 'vip';
  if (definition.futureTier === 'vip') return tier === 'vip';
  return false;
}

export const featureAccess = {
  canUse: canUseFeature,
  isOpenBeta: () => PRODUCT_MODE.openBeta,
  get: (feature: FeatureId) => FEATURES[feature],
};
