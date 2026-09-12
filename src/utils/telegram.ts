let lastPurchaseOpenAt = 0;

export function openTelegramPurchase(tier: 'vip1' | 'vip2'): boolean {
  const now = Date.now();
  if (now - lastPurchaseOpenAt < 3000) return false;
  lastPurchaseOpenAt = now;
  window.open(`https://t.me/LilyReaderVIPBot?start=${tier}`, '_blank', 'noopener,noreferrer');
  return true;
}
