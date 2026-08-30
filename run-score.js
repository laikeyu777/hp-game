(function (root, factory) {
  const challenge = typeof module === 'object' && module.exports ? require('./challenge-system.js') : root.ChallengeSystem;
  const api = factory(challenge);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RunScore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ChallengeSystem) {
  function summarize(summary = {}) {
    const scored = ChallengeSystem.calculateScore(summary);
    return { ...summary, score: scored.score, breakdown: scored.breakdown };
  }

  return { summarize };
});
