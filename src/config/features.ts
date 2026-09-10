import type { UserTier } from '../types';

export type FeatureId =
  | 'audio'
  | 'lilyVoices'
  | 'readerPro'
  | 'premiumThemes'
  | 'advancedTypography'
  | 'bookmark'
  | 'annotation'
  | 'notes'
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

const envOpenBeta = import.meta.env?.VITE_OPEN_BETA;

export const PRODUCT_MODE = Object.freeze({
  // Closed (real tier-based entitlements) unless a deployment explicitly opts
  // into Open Beta. Flip back to Open Beta by setting VITE_OPEN_BETA=true.
  openBeta: envOpenBeta === 'true',
});

export const PRODUCT_LIMITS = Object.freeze({
  openBetaMaxLocalBooks: 5,
  futureFreeMaxLocalBooks: 3,
});

export interface LibraryLimits {
  total: number;
  lilyhub: number;
  external: number;
}

export const LIBRARY_LIMITS: Record<'free' | 'vip1' | 'vip2', LibraryLimits> = Object.freeze({
  free: { total: 5, lilyhub: 2, external: 3 },
  vip1: { total: 30, lilyhub: 30, external: 30 },
  vip2: { total: 100, lilyhub: 100, external: 100 },
});

export const getLibraryLimits = (tier: UserTier): LibraryLimits => {
  if (tier === 'vip1') return LIBRARY_LIMITS.vip1;
  if (tier === 'vip2' || tier === 'vip') return LIBRARY_LIMITS.vip2;
  return LIBRARY_LIMITS.free;
};

export const getMaxLocalBooks = (): number => PRODUCT_MODE.openBeta
  ? PRODUCT_LIMITS.openBetaMaxLocalBooks
  : PRODUCT_LIMITS.futureFreeMaxLocalBooks;

export const FEATURES: Record<FeatureId, FeatureDefinition> = Object.freeze({
  audio: { enabled: true, betaAccess: true, futureTier: 'audio' },
  lilyVoices: { enabled: true, betaAccess: true, futureTier: 'audio' },
  readerPro: { enabled: true, betaAccess: true, futureTier: 'vip' },
  premiumThemes: { enabled: true, betaAccess: true, futureTier: 'vip' },
  advancedTypography: { enabled: true, betaAccess: true, futureTier: 'vip' },
  bookmark: { enabled: true, betaAccess: true, futureTier: 'free' },
  annotation: { enabled: true, betaAccess: true, futureTier: 'free' },
  notes: { enabled: true, betaAccess: true, futureTier: 'free' },
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
  if (definition.futureTier === 'audio') return tier !== 'free';
  if (definition.futureTier === 'vip') return tier === 'vip1' || tier === 'vip2' || tier === 'vip';
  return false;
}

export const featureAccess = {
  canUse: canUseFeature,
  isOpenBeta: () => PRODUCT_MODE.openBeta,
  get: (feature: FeatureId) => FEATURES[feature],
};
