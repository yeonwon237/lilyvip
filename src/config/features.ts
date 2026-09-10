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
  futureTier: FutureTier;
}

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

export const FEATURES: Record<FeatureId, FeatureDefinition> = Object.freeze({
  audio: { enabled: true, futureTier: 'audio' },
  lilyVoices: { enabled: true, futureTier: 'audio' },
  readerPro: { enabled: true, futureTier: 'vip' },
  premiumThemes: { enabled: true, futureTier: 'vip' },
  advancedTypography: { enabled: true, futureTier: 'vip' },
  bookmark: { enabled: true, futureTier: 'free' },
  annotation: { enabled: true, futureTier: 'free' },
  notes: { enabled: true, futureTier: 'free' },
  quoteCard: { enabled: true, futureTier: 'free' },
  search: { enabled: true, futureTier: 'free' },
  shelves: { enabled: true, futureTier: 'free' },
  offline: { enabled: true, futureTier: 'free' },
  autoScroll: { enabled: true, futureTier: 'vip' },
  focusMode: { enabled: true, futureTier: 'vip' },
  customPreset: { enabled: true, futureTier: 'vip' },
  cloudLibrary: { enabled: false, futureTier: 'unavailable' },
  accountSync: { enabled: false, futureTier: 'unavailable' },
  payment: { enabled: false, futureTier: 'unavailable' },
});

export function canUseFeature(feature: FeatureId, tier: UserTier = 'free'): boolean {
  const definition = FEATURES[feature];
  if (!definition.enabled) return false;
  if (definition.futureTier === 'free') return true;
  if (definition.futureTier === 'audio') return tier !== 'free';
  if (definition.futureTier === 'vip') return tier === 'vip1' || tier === 'vip2' || tier === 'vip';
  return false;
}

export const featureAccess = {
  canUse: canUseFeature,
  get: (feature: FeatureId) => FEATURES[feature],
};
