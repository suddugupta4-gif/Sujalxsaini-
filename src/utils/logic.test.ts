import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAdaptiveUsernameFontSize,
  convertEmojisToSpokenText,
  extractFollowerAvatar,
  extractFollowerUsername,
  formatTtsMessage,
  formatEventTtsText,
  buildObsAlertUrl,
  buildObsTextAlertUrl,
  buildObsCounterUrl,
  buildLiveObsPermanentUrl,
  calculateGoalPercentage,
  getFollowerAvatarUrl,
  isMilestoneReached,
  parseKickEventDetails,
  validatePin,
  parseObsQueryOverrides,
  resolveLiveObsAlertConfig,
  normalizeFollowerKey,
  hasUserAlreadyFollowed,
  recordFollowedUsername,
  seedFollowedUsernamesFromRecent,
  shouldSuppressDuplicateFollowAlert,
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

test('computeAdaptiveUsernameFontSize shrinks font size for long usernames and keeps counter-recent crisp and large', () => {
  const shortSize = computeAdaptiveUsernameFontSize('Rohan', 'alert-full');
  const mediumSize = computeAdaptiveUsernameFontSize('RohanGamingIN_VIP', 'alert-full');
  const longSize = computeAdaptiveUsernameFontSize('SujalX_Ultimate_Pro_Legend_99', 'alert-full');
  assert.equal(shortSize > mediumSize, true);
  assert.equal(mediumSize > longSize, true);
  assert.equal(longSize >= 10, true);

  const counterShort = computeAdaptiveUsernameFontSize('Rohan', 'counter-recent');
  const counterMed = computeAdaptiveUsernameFontSize('ShooterSainiisLive', 'counter-recent');
  const counterLong = computeAdaptiveUsernameFontSize('SujalX_Ultimate_Pro_Legend_99', 'counter-recent');
  assert.equal(counterShort, 21);
  assert.equal(counterMed >= 14, true);
  assert.equal(counterLong >= 12, true);
});

test('formatTtsMessage replaces {username} and defaults to single-line started following text', () => {
  const msg = formatTtsMessage('', 'NightStalker', 'sujalxsaini');
  assert.equal(msg, 'NightStalker started following');
  const customMsg = formatTtsMessage('{username} started following', 'AaravPlays');
  assert.equal(customMsg, 'AaravPlays started following');
});

test('convertEmojisToSpokenText converts emojis into spoken words and prevents emoji-only failure', () => {
  assert.equal(convertEmojisToSpokenText('🔥❤️👑'), 'fire heart crown');
  assert.equal(convertEmojisToSpokenText('OP clutch 😂💯!'), 'OP clutch laughing one hundred!');
  assert.equal(convertEmojisToSpokenText('🔥🔥🔥🔥🔥🔥'), 'fire fire fire');
  assert.equal(convertEmojisToSpokenText('GG 👍🏽'), 'GG thumbs up');
});

test('parseKickEventDetails parses kicks.gifted, channel.subscription.gifts, and channel.subscription.new with/without notes', () => {
  const kicksEvent = parseKickEventDetails('kicks.gifted', {
    sender: { username: 'KaranClutchX' },
    gift: { amount: 500, message: 'OP clutch bhai! 🔥' },
  });
  assert.equal(kicksEvent.eventType, 'kicks');
  assert.equal(kicksEvent.username, 'KaranClutchX');
  assert.equal(kicksEvent.amount, 500);
  assert.equal(kicksEvent.subMessage, 'OP clutch bhai! 🔥');

  const kicksNoNote = parseKickEventDetails('kicks.gifted', {
    sender: { username: 'AaravPlays' },
    gift: { amount: 250, message: '   ' },
  });
  assert.equal(kicksNoNote.eventType, 'kicks');
  assert.equal(kicksNoNote.amount, 250);
  assert.equal(kicksNoNote.subMessage, undefined);

  const subGiftEvent = parseKickEventDetails('channel.subscription.gifts', {
    gifter: { username: 'RohanGamingIN' },
    giftees: [{ username: 'u1' }, { username: 'u2' }, { username: 'u3' }, { username: 'u4' }, { username: 'u5' }],
    gift: { name: 'Sub Gift' },
    note: 'Enjoy squad 🎉',
  });
  assert.equal(subGiftEvent.eventType, 'sub-gift');
  assert.equal(subGiftEvent.username, 'RohanGamingIN');
  assert.equal(subGiftEvent.amount, 5);
  assert.equal(subGiftEvent.subMessage, 'Enjoy squad 🎉');

  const subBuyEvent = parseKickEventDetails('channel.subscription.new', {
    subscriber: { username: 'ApexValkyrie' },
    duration: 3,
  });
  assert.equal(subBuyEvent.eventType, 'sub-buy');
  assert.equal(subBuyEvent.username, 'ApexValkyrie');
  assert.equal(subBuyEvent.amount, 3);
  assert.equal(subBuyEvent.subMessage, undefined);
});

test('formatEventTtsText reads gift amount only when note is absent, includes note + emojis when present', () => {
  assert.equal(formatEventTtsText('kicks', 'KaranClutchX', 500), 'KaranClutchX sent 500 kicks');
  assert.equal(formatEventTtsText('kicks', 'KaranClutchX', 500, undefined, undefined, '   '), 'KaranClutchX sent 500 kicks');
  assert.equal(
    formatEventTtsText('kicks', 'KaranClutchX', 500, undefined, undefined, 'OP clutch 🔥❤️'),
    'KaranClutchX sent 500 kicks. OP clutch fire heart'
  );
  assert.equal(formatEventTtsText('sub-gift', 'RohanGamingIN', 5), 'RohanGamingIN gifted 5 subs');
  assert.equal(
    formatEventTtsText('sub-gift', 'RohanGamingIN', 5, undefined, undefined, '🎁👑'),
    'RohanGamingIN gifted 5 subs. gift crown'
  );
  assert.equal(formatEventTtsText('sub-gift', 'RohanGamingIN', 1), 'RohanGamingIN gifted 1 sub');
  assert.equal(formatEventTtsText('sub-buy', 'ApexValkyrie', 1), 'ApexValkyrie subscribed');
  assert.equal(formatEventTtsText('sub-buy', 'ApexValkyrie', 6), 'ApexValkyrie subscribed for 6 months');
});

test('buildObsAlertUrl, buildObsTextAlertUrl, and buildObsCounterUrl generate root query-param URLs', () => {
  const alertUrl = buildObsAlertUrl('https://sujalx-kick-studio.onrender.com/', {
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
    'https://sujalx-kick-studio.onrender.com/?obs=alerts&template=gold&font=Cinzel&tts=1&voice=en-IN&sfx=royal&duration=8&rate=1.2&volume=0.9'
  );

  const followSilentUrl = buildObsAlertUrl('https://sujalx-kick-studio.onrender.com/', {
    template: 'neon',
    font: 'Rajdhani',
    tts: true,
    voice: 'pro-hype-male',
    duration: 5,
  });
  assert.equal(
    followSilentUrl,
    'https://sujalx-kick-studio.onrender.com/?obs=alerts&template=neon&font=Rajdhani&tts=1&voice=pro-hype-male&duration=5'
  );

  const textAlertUrl = buildObsTextAlertUrl('https://sujalx-kick-studio.onrender.com/', {
    style: 'gold-impact',
    font: 'Bebas Neue',
    sfx: 'royal',
    tts: true,
    voice: 'pro-hype-male',
    duration: 6,
    rate: 1.1,
    volume: 1.0,
    eventFilter: 'kicks',
  });
  assert.equal(
    textAlertUrl,
    'https://sujalx-kick-studio.onrender.com/?obs=text-alerts&event=kicks&style=gold-impact&font=Bebas+Neue&sfx=royal&tts=1&voice=pro-hype-male&duration=6&rate=1.1&volume=1'
  );

  const liveTextAlertIdUrl = buildObsTextAlertUrl('https://sujalx-kick-studio.onrender.com/', {
    style: 'kinetic-neon',
    font: 'Bebas Neue',
    sfx: 'valorant',
    tts: true,
    voice: 'pro-vip-narrator',
    duration: 6,
    alertId: 'kicks-xyz789',
  });
  assert.equal(
    liveTextAlertIdUrl,
    'https://sujalx-kick-studio.onrender.com/?obs=text-alerts&alertId=kicks-xyz789'
  );

  const counterUrl = buildObsCounterUrl('https://sujalx-kick-studio.onrender.com', {
    template: 'matrix',
    font: 'JetBrains Mono',
    showGoal: true,
    goal: 2000,
  });
  assert.equal(
    counterUrl,
    'https://sujalx-kick-studio.onrender.com/?obs=counter&template=matrix&font=JetBrains+Mono&showGoal=1&goal=2000'
  );

  const liveGoalIdUrl = buildObsCounterUrl('https://sujalx-kick-studio.onrender.com', {
    template: 'neon',
    font: 'Orbitron',
    showGoal: true,
    goalId: 'goal-abc123',
  });
  assert.equal(
    liveGoalIdUrl,
    'https://sujalx-kick-studio.onrender.com/?obs=counter&template=neon&font=Orbitron&showGoal=1&goalId=goal-abc123'
  );

  assert.equal(
    buildLiveObsPermanentUrl('https://sujalx-kick-studio.onrender.com/', 'alerts'),
    'https://sujalx-kick-studio.onrender.com/?obs=alerts'
  );
  assert.equal(
    buildLiveObsPermanentUrl('https://sujalx-kick-studio.onrender.com/', 'counter'),
    'https://sujalx-kick-studio.onrender.com/?obs=counter'
  );
  assert.equal(
    buildLiveObsPermanentUrl('https://sujalx-kick-studio.onrender.com/', 'text-alerts'),
    'https://sujalx-kick-studio.onrender.com/?obs=text-alerts'
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

test('parseObsQueryOverrides extracts OBS routing, text-alerts style, and template overrides cleanly', () => {
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
  assert.equal(parsed.hasGoalParam, true);

  const textParsed = parseObsQueryOverrides(
    '?obs=text-alerts&event=kicks&style=cyber-drop&font=Bebas+Neue&sfx=arcade&tts=1&voice=pro-caster-female&duration=6&alertId=kicks-xyz789'
  );
  assert.equal(textParsed.obsMode, 'text-alerts');
  assert.equal(textParsed.eventFilter, 'kicks');
  assert.equal(textParsed.alertId, 'kicks-xyz789');
  assert.equal(textParsed.textAlertStyle, 'cyber-drop');
  assert.equal(textParsed.font, 'Bebas Neue');
  assert.equal(textParsed.sfx, 'arcade');
  assert.equal(textParsed.voice, 'pro-caster-female');
  assert.equal(textParsed.duration, 6);
  assert.equal(textParsed.hasStyleParam, true);
  assert.equal(textParsed.hasFontParam, true);
  assert.equal(textParsed.hasSfxParam, true);

  const counterGoalIdParsed = parseObsQueryOverrides(
    '?obs=counter&template=neon&font=Orbitron&showGoal=1&goalId=goal-abc123'
  );
  assert.equal(counterGoalIdParsed.obsMode, 'counter');
  assert.equal(counterGoalIdParsed.goalId, 'goal-abc123');
  assert.equal(counterGoalIdParsed.hasGoalParam, false);

  const defaultFollowParsed = parseObsQueryOverrides('?obs=alerts');
  assert.equal(defaultFollowParsed.sfx, 'none');
  const defaultKicksParsed = parseObsQueryOverrides('?obs=text-alerts');
  assert.equal(defaultKicksParsed.sfx, 'royal');
});

test('resolveLiveObsAlertConfig updates past OBS links live without regenerating URL and forces zero SFX on follow alerts', () => {
  const yesterdayFollowUrlSearch =
    '?obs=alerts&template=neon&font=Rajdhani&tts=1&voice=hi-IN&sfx=arcade&duration=4&rate=1.2&volume=1';

  const liveSettings = {
    channelName: 'sujalxsaini',
    channelUrl: 'https://kick.com/sujalxsaini',
    pin: '1234',
    followerCount: 466,
    followerGoal: 500,
    goalTitle: 'ROAD TO 500 FOLLOWERS',
    showGoalOnCounter: true,
    alertsPaused: false,
    alertsMuted: false,
    activeAlertTemplate: 'gold',
    activeCounterTemplate: 'neon',
    selectedFont: 'Cinzel',
    counterFont: 'Orbitron',
    textAlertFont: 'Bebas Neue',
    textAlertStyle: 'kinetic-neon',
    textAlertDuration: 6,
    textAlertSfxPreset: 'valorant',
    alertDuration: 9,
    sfxPreset: 'cyber',
    customSfxUrl: '',
    ttsSettings: {
      enabled: false,
      mode: 'stream',
      lang: 'pro-caster-female',
      messageTemplate: '{username} started following',
      rate: 0.9,
      pitch: 1.0,
      volume: 0.75,
    },
    recentFollowers: [],
    webhookLogs: [],
    setupChecklist: {
      obsStep1LinksCopied: true,
      obsStep2SourceCreated: true,
      obsStep3DimensionsSet: false,
      obsStep4AudioControlEnabled: false,
      obsStep5MonitorAndOutput: false,
      obsStep6VerifiedLive: false,
      webhookStep1UrlCopied: true,
      webhookStep2AppCreated: false,
      webhookStep3SubscribedFollowed: false,
      webhookStep4SimulatedTest: false,
      webhookStep5RenderDeployed: false,
    },
  } as const;

  // Follow alert on yesterday's URL MUST obey live settings AND force sfxPreset='none' even though URL had sfx=arcade
  const resolvedFollow = resolveLiveObsAlertConfig({
    search: yesterdayFollowUrlSearch,
    eventType: 'follow',
    liveSettings: liveSettings as unknown as import('../types').AppSettings,
  });
  assert.equal(resolvedFollow.sfxPreset, 'none');
  assert.equal(resolvedFollow.template, 'gold');
  assert.equal(resolvedFollow.font, 'Cinzel');
  assert.equal(resolvedFollow.duration, 9);
  assert.equal(resolvedFollow.ttsEnabled, false);
  assert.equal(resolvedFollow.ttsVoice, 'pro-caster-female');
  assert.equal(resolvedFollow.ttsRate, 0.9);
  assert.equal(resolvedFollow.ttsVolume, 0.75);

  // Kicks alert STILL plays Kicks & Subs SFX (valorant)
  const resolvedKicks = resolveLiveObsAlertConfig({
    search: '?obs=text-alerts',
    eventType: 'kicks',
    liveSettings: liveSettings as unknown as import('../types').AppSettings,
    textOnlyMode: true,
  });
  assert.equal(resolvedKicks.sfxPreset, 'valorant');
  assert.equal(resolvedKicks.font, 'Bebas Neue');
  assert.equal(resolvedKicks.duration, 6);
});

test('one-time follow rule blocks repeat follow overlay & TTS after unfollow+refollow while allowing kicks/subs and manual tests', () => {
  assert.equal(normalizeFollowerKey('  AaravSniper_IN  '), 'aaravsniper_in');

  let history: string[] = [];
  assert.equal(
    shouldSuppressDuplicateFollowAlert({
      eventType: 'follow',
      source: 'kick-webhook',
      username: 'OneTimeViewer',
      followedHistory: history,
    }),
    false
  );

  // First follow is recorded
  history = recordFollowedUsername('OneTimeViewer', history);
  assert.equal(hasUserAlreadyFollowed('onetimeviewer', history), true);

  // Repeat follow (e.g. viewer unfollowed and followed again, even with different casing) is suppressed
  assert.equal(
    shouldSuppressDuplicateFollowAlert({
      eventType: 'follow',
      source: 'kick-webhook',
      username: 'onetimeviewer',
      followedHistory: history,
    }),
    true
  );
  assert.equal(
    shouldSuppressDuplicateFollowAlert({
      eventType: 'follow',
      source: 'simulator',
      username: 'ONETIMEVIEWER',
      followedHistory: history,
    }),
    true
  );

  // Manual dashboard test & replay must STILL work for the streamer
  assert.equal(
    shouldSuppressDuplicateFollowAlert({
      eventType: 'follow',
      source: 'test',
      username: 'OneTimeViewer',
      followedHistory: history,
    }),
    false
  );
  assert.equal(
    shouldSuppressDuplicateFollowAlert({
      eventType: 'follow',
      source: 'replay',
      username: 'OneTimeViewer',
      followedHistory: history,
    }),
    false
  );

  // Kicks, sub gifts, and sub buys from the SAME user must NEVER be suppressed
  assert.equal(
    shouldSuppressDuplicateFollowAlert({
      eventType: 'kicks',
      source: 'kick-webhook',
      username: 'OneTimeViewer',
      followedHistory: history,
    }),
    false
  );
  assert.equal(
    shouldSuppressDuplicateFollowAlert({
      eventType: 'sub-gift',
      source: 'kick-webhook',
      username: 'OneTimeViewer',
      followedHistory: history,
    }),
    false
  );
  assert.equal(
    shouldSuppressDuplicateFollowAlert({
      eventType: 'sub-buy',
      source: 'kick-webhook',
      username: 'OneTimeViewer',
      followedHistory: history,
    }),
    false
  );

  // Seed merges existing follow webhooks/simulator entries while ignoring test/replay and kicks
  const seeded = seedFollowedUsernamesFromRecent(['RohanGamingIN'], [
    { username: 'ShooterSainiisLive', source: 'kick-webhook', eventType: 'follow' },
    { username: 'AaravSniper_IN', source: 'simulator' },
    { username: 'ManualTesterOnly', source: 'test', eventType: 'follow' },
    { username: 'KicksOnlySender', source: 'kick-webhook', eventType: 'kicks' },
  ]);
  assert.equal(hasUserAlreadyFollowed('rohangamingin', seeded), true);
  assert.equal(hasUserAlreadyFollowed('shootersainiislive', seeded), true);
  assert.equal(hasUserAlreadyFollowed('aaravsniper_in', seeded), true);
  assert.equal(hasUserAlreadyFollowed('manualtesteronly', seeded), false);
  assert.equal(hasUserAlreadyFollowed('kicksonlysender', seeded), false);
});

