import { test } from 'node:test';
test('skipped one', { skip: 'because' }, () => {});
test('skipped two', { skip: true }, () => {});
