import assert from 'node:assert/strict';
import { PRODUCT_PLANS } from '../src/config/plans';
import { resolveInitialPage } from '../src/config/navigation';

assert.equal(resolveInitialPage('', false), 'landing');
assert.equal(resolveInitialPage('', true), 'dashboard');
assert.equal(resolveInitialPage('?welcome=1', true), 'landing');
assert.equal(resolveInitialPage('?novel=abc', false), 'add-book');
assert.equal(resolveInitialPage('?connect=lilyhub', true), 'login');
assert.deepEqual(PRODUCT_PLANS.map(plan => plan.name), ['Miễn phí', 'VIP 1', 'VIP 2', 'SVIP']);
assert.equal(PRODUCT_PLANS.filter(plan => plan.recommended).length, 1);
assert.equal(PRODUCT_PLANS.find(plan => plan.name === 'VIP 1')?.price, '149.000đ / năm');
assert.equal(PRODUCT_PLANS.find(plan => plan.name === 'VIP 2')?.price, '249.000đ / năm');
assert.equal(PRODUCT_PLANS.find(plan => plan.name === 'SVIP')?.pending, true);
assert.equal(PRODUCT_PLANS.some(plan => plan.benefits.some(benefit => /mọi nguồn/i.test(benefit))), false);
console.log('Business readiness: entry routing and canonical product plans passed');
