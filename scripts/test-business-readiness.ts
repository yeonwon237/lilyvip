import assert from 'node:assert/strict';
import { setLocale } from '../src/i18n';
setLocale('vi');
import { PRODUCT_PLANS } from '../src/config/plans';
import { resolveInitialPage } from '../src/config/navigation';
import { canUseFeature } from '../src/config/features';

assert.equal(resolveInitialPage('', false), 'landing');
assert.equal(resolveInitialPage('', true), 'dashboard');
assert.equal(resolveInitialPage('?welcome=1', true), 'landing');
assert.equal(resolveInitialPage('?novel=abc', false), 'add-book');
assert.equal(resolveInitialPage('?connect=lilyhub', true), 'login');
assert.deepEqual(PRODUCT_PLANS.map(plan => plan.name), ['MIỄN PHÍ', 'MY50', 'MY100', 'MY CLOUD']);
assert.equal(PRODUCT_PLANS.filter(plan => plan.recommended).length, 1);
assert.equal(PRODUCT_PLANS.find(plan => plan.name === 'MY50')?.price, '149.000đ / năm');
assert.equal(PRODUCT_PLANS.find(plan => plan.name === 'MY100')?.price, '249.000đ / năm');
assert.equal(PRODUCT_PLANS.find(plan => plan.name === 'MY CLOUD')?.pending, true);
assert.equal(PRODUCT_PLANS.some(plan => plan.benefits.some(benefit => /mọi nguồn/i.test(benefit))), false);
assert.equal(canUseFeature('backup', 'free'), false);
assert.equal(canUseFeature('backup', 'audio'), false);
assert.equal(canUseFeature('backup', 'vip1'), true);
assert.equal(canUseFeature('backup', 'vip2'), true);
console.log('Business readiness: entry routing and canonical product plans passed');

setLocale('en');
assert.equal(PRODUCT_PLANS[0].name, 'FREE');
assert.equal(PRODUCT_PLANS.find(plan => plan.tier === 'vip1')?.price, '149,000₫ / year');
setLocale('vi');
assert.equal(PRODUCT_PLANS[0].name, 'MIỄN PHÍ');
