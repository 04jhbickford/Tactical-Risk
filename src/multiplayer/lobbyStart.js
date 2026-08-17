// Host lobby primary CTA. A 2/2 waiting room labeled "Create Game" looks
// like the match never started (B40). Start is the verb; publish is not.

export function resolveHostLobbyPrimaryCta({
  isHost = false,
  playerCount = 0,
  allHaveFactions = false,
  hostHasFaction = false,
} = {}) {
  if (!isHost) return null;
  const canStart = playerCount >= 2 && allHaveFactions && hostHasFaction;
  let hint = '';
  if (!hostHasFaction) hint = 'Select a faction and color above to continue';
  else if (playerCount < 2) hint = 'Waiting for another player';
  else if (!allHaveFactions) hint = 'Every player must pick a faction';
  return {
    action: 'start',
    label: 'Start Game',
    disabled: !canStart,
    hint,
  };
}
