import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAdaptiveUsernameFontSize,
  extractFollowerAvatar,
  extractFollowerUsername,
  formatTtsMessage,
  buildObsAlertUrl,
  buildObsCounterUrl,
  calculateGoalPercentage,
  getFollowerAvatarUrl,
  isMilestoneReached,
  validatePin,
  parseObsQueryOverrides,
} from './logic';

test('extractFollowerUsername handles official Kick webhook payload shapes', () => {
  assert.equal(
    extractFollowerUsername({ follower: { username: 'AaravPlays' } }),
    'AaravPlays'
  );
  assert.equal(
    extractFollowerUsername({ data: { follower: { username: 'VortexSniper' } } }),
    'VortexSniper'
  );
  assert.equal(
    extractFollowerUsername({ username: 'DirectKickFan' }),
    'DirectKickFan'
  );
  assert.equal(extractFollowerUsername({}), 'KickUser');
  assert.equal(extractFollowerUsername(null), 'KickUser');
});

test('extractFollowerAvatar and getFollowerAvatarUrl resolve PFP URLs and SVG fallbacks', () => {
  assert.equal(
    extractFollowerAvatar({
      follower: { profile_pic: 'https://files.kick.com/avatars/user1.png' },
    }),
    'https://files.kick.com/avatars/user1.png'
  );
  assert.equal(extractFollowerAvatar({}), undefined);
  const autoSvg = getFollowerAvatarUrl('RohanGamingIN');
  assert.equal(autoSvg.startsWith('data:image/svg+xml;utf8,'), true);
});

test('computeAdaptiveUsernameFontSize shrinks font size for long usernames', () => {
  const shortSize = computeAdaptiveUsernameFontSize('Rohan', 'alert-full');
  const mediumSize = computeAdaptiveUsernameFontSize('RohanGamingIN_VIP', 'alert-full');
  const longSize = computeAdaptiveUsernameFontSize('SujalX_Ultimate_Pro_Legend_99', 'alert-full');
  assert.equal(shortSize > mediumSize, true);
  assert.equal(mediumSize > longSize, true);
  assert.equal(longSize >= 10, true);
});

test('formatTtsMessage replaces {username} and defaults to single-line started following text', () => {
  const msg = formatTtsMessage('', 'NightStalker', 'sujalxsaini');
  assert.equal(msg, 'NightStalker started following');
  const customMsg = formatTtsMessage('{username} started following', 'AaravPlays');
  assert.equal(customMsg, 'AaravPlays started following');
});

test('buildObsAlertUrl and buildObsCounterUrl generate root query-param URLs for Render/OBS compatibility', () => {
  const alertUrl = buildObsAlertUrl('https://sujalx-kick.onrender.com/', {
    template: 'gold',
    font: 'Cinzel',
    tts: true,
    voice: 'en-IN',
    sfx: 'royal',
    duration: 8,
    rate: 1.2,
    volume: 0.9,
  });
  assert.equal(
    alertUrl,
    'https://sujalx-kick.onrender.com/?obs=alerts&template=gold&font=Cinzel&tts=1&voice=en-IN&sfx=royal&duration=8&rate=1.2&volume=0.9'
  );

  const counterUrl = buildObsCounterUrl('https://sujalx-kick.onrender.com', {
    template: 'matrix',
    font: 'JetBrains Mono',
    showGoal: true,
    goal: 2000,
  });
  assert.equal(
    counterUrl,
    'https://sujalx-kick.onrender.com/?obs=counter&template=matrix&font=JetBrains+Mono&showGoal=1&goal=2000'
  );
});

test('calculateGoalPercentage and isMilestoneReached compute accurate goal progress', () => {
  assert.equal(calculateGoalPercentage(1250, 1500), 83.3);
  assert.equal(calculateGoalPercentage(1500, 1500), 100);
  assert.equal(calculateGoalPercentage(1800, 1500), 100);
  assert.equal(isMilestoneReached(1500, 1500), true);
  assert.equal(isMilestoneReached(1499, 1500), false);
});

test('validatePin checks VIP PIN code', () => {
  assert.equal(validatePin('1234', '1234'), true);
  assert.equal(validatePin(' 1234 ', '1234'), true);
  assert.equal(validatePin('9999', '1234'), false);
});

test('parseObsQueryOverrides extracts OBS routing and template overrides cleanly', () => {
  const parsed = parseObsQueryOverrides(
    '?obs=alerts&template=esports&font=Chakra+Petch&tts=1&voice=hi-IN&sfx=valorant&duration=10&rate=1.3&volume=0.85&goal=2500'
  );
  assert.equal(parsed.obsMode, 'alerts');
  assert.equal(parsed.alertTemplate, 'esports');
  assert.equal(parsed.font, 'Chakra Petch');
  assert.equal(parsed.ttsEnabled, true);
  assert.equal(parsed.voice, 'hi-IN');
  assert.equal(parsed.sfx, 'valorant');
  assert.equal(parsed.duration, 10);
  assert.equal(parsed.rate, 1.3);
  assert.equal(parsed.volume, 0.85);
  assert.equal(parsed.goal, 2500);
});
