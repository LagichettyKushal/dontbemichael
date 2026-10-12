'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { isEmailSchedule, canCheckEmail, needsEmailAccessWarning } = loadTs('src/shared/scheduleEmail.ts');
const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const mission = (extra = {}) => ({ label: 'Check the support inbox', kind: 'dispatch', ...extra });
const mailbox = { id: 'support', status: 'connected' };

test('an email schedule warns only when its owner has no readable mail connection', () => {
  const none = { mailboxes: [], agentCapabilities: { kelly: { email: { enabled: false, mailboxes: [], send: false } } } };
  assert.equal(isEmailSchedule(mission()), true);
  assert.equal(isEmailSchedule(mission({ label: 'Check emails' })), true);
  assert.equal(canCheckEmail(none, 'kelly'), false);
  assert.equal(needsEmailAccessWarning(mission(), none, 'kelly'), true);

  const watched = { ...none, mailboxes: [mailbox], agentCapabilities: { kelly: { email: { enabled: true, mailboxes: ['support'], send: false } } } };
  assert.equal(needsEmailAccessWarning(mission(), watched, 'kelly'), false, 'a connected watched mailbox is readable');

  const gmail = {
    ...none,
    claudeConnectors: { list: [{ key: 'Gmail', url: 'https://gmail.example', status: 'connected' }] },
    connectorsOn: { Gmail: true },
    agentCapabilities: { kelly: { email: { enabled: false, mailboxes: [], send: false }, connectors: ['Gmail'] } }
  };
  assert.equal(needsEmailAccessWarning(mission(), gmail, 'kelly'), false, 'a granted connected Gmail connector is readable');
});

test('non-email, non-dispatch, and unusable email connections do not give false reassurance', () => {
  const noAccess = { mailboxes: [{ ...mailbox, status: 'needs-attention' }], agentCapabilities: { kelly: { email: { enabled: true, mailboxes: ['support'], send: false } } } };
  assert.equal(needsEmailAccessWarning({ label: 'Follow up on unpaid invoices', kind: 'dispatch' }, noAccess, 'kelly'), false);
  assert.equal(needsEmailAccessWarning({ label: 'Check email', kind: 'heartbeat' }, noAccess, 'kelly'), false);
  assert.equal(needsEmailAccessWarning(mission(), noAccess, 'kelly'), true, 'a mailbox needing attention cannot be read');
});

test('both schedule surfaces use the shared email-access warning', () => {
  const source = read('src/renderer/src/components/triggers/ScheduleList.tsx');
  assert.match(source, /emailAccessWarning=\{needsEmailAccessWarning\(m, config, agentId\)\}/);
  assert.match(source, /emailAccessWarning=\{needsEmailAccessWarning\(m, config, owner\)\}/);
  for (const locale of ['en', 'zh-CN', 'ar']) {
    const strings = JSON.parse(read(`src/renderer/src/i18n/locales/${locale}.json`));
    assert.ok(strings.schedulesSection.emailAccessWarning.includes('{{name}}'), locale);
  }
});
