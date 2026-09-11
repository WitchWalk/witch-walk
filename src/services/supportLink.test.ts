import { openExternalUrl } from './supportLinkCore';

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`Expected ${expected}, received ${actual}`);
  },
};

async function run() {
  const supportUrl = 'https://example.com/support';
  let checkedUrl = '';
  let openedUrl = '';
  assert.equal(await openExternalUrl(supportUrl, {
    canOpenURL: async (url) => { checkedUrl = url; return true; },
    openURL: async (url) => { openedUrl = url; return true; },
  }), true);
  assert.equal(checkedUrl, supportUrl);
  assert.equal(openedUrl, supportUrl);

  let blockedOpenCalled = false;
  assert.equal(await openExternalUrl(supportUrl, {
    canOpenURL: async () => false,
    openURL: async () => { blockedOpenCalled = true; return true; },
  }), false);
  assert.equal(blockedOpenCalled, false);

  assert.equal(await openExternalUrl(supportUrl, {
    canOpenURL: async () => { throw new Error('Unavailable'); },
    openURL: async () => true,
  }), false);

  console.log('Support URL, successful linking, blocked linking, and failure handling checks passed.');
}

void run();
