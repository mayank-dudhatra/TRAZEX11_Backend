const MILESTONES = [
  { key: 'm2', value: 2, bonus: 10 },
  { key: 'm5', value: 5, bonus: 25 },
  { key: 'm10', value: 10, bonus: 60 },
  { key: 'm15', value: 15, bonus: 120 }
];

function normalizeFlags(flags = {}) {
  return {
    m2: Boolean(flags.m2),
    m5: Boolean(flags.m5),
    m10: Boolean(flags.m10),
    m15: Boolean(flags.m15)
  };
}

function calculateBaseMovementPoints(percentChange, userAction) {
  const movementUnits = Math.floor(Math.abs(percentChange || 0) / 0.1);
  if (!movementUnits) {
    return 0;
  }

  const isBuy = userAction === 'BUY';
  const directionCorrect = (isBuy && percentChange > 0) || (!isBuy && percentChange < 0);

  return directionCorrect ? movementUnits : movementUnits * -0.5;
}

function applyMilestones({
  previousPercent,
  percentChange,
  userAction,
  milestoneFlags
}) {
  const updatedMilestoneFlags = normalizeFlags(milestoneFlags);

  MILESTONES.forEach((milestone) => {
    if (updatedMilestoneFlags[milestone.key]) {
      return;
    }

    if (userAction === 'BUY') {
      const threshold = milestone.value;
      if (previousPercent < threshold && percentChange >= threshold) {
        updatedMilestoneFlags[milestone.key] = true;
      }
      return;
    }

    if (userAction === 'SELL') {
      const threshold = -milestone.value;
      if (previousPercent > threshold && percentChange <= threshold) {
        updatedMilestoneFlags[milestone.key] = true;
      }
    }
  });

  let milestoneBonus = 0;
  MILESTONES.forEach((milestone) => {
    if (updatedMilestoneFlags[milestone.key]) {
      milestoneBonus += milestone.bonus;
    }
  });

  return { milestoneBonus, updatedMilestoneFlags };
}

function calculateStockPoints(params) {
  const {
    percentChange = 0,
    previousPercent = 0,
    userAction,
    milestoneFlags = {},
    dayHighHit = false,
    dayLowHit = false
  } = params || {};

  const baseMovementPoints = calculateBaseMovementPoints(percentChange, userAction);

  const { milestoneBonus, updatedMilestoneFlags } = applyMilestones({
    previousPercent,
    percentChange,
    userAction,
    milestoneFlags
  });

  const totalPoints = baseMovementPoints + milestoneBonus;

  return {
    totalPoints,
    baseMovementPoints,
    milestoneBonus,
    updatedMilestoneFlags,
    dayHighHit: Boolean(dayHighHit),
    dayLowHit: Boolean(dayLowHit)
  };
}

module.exports = {
  calculateStockPoints
};
