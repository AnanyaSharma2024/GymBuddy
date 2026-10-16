// ============================================================================
// COMPATIBILITY SCORING ENGINE
// ============================================================================
// This is intentionally a small, pure, well-isolated module: given two user
// documents (+ a precomputed distance), it returns a 0-100 score and a list
// of "common factors" describing WHY they matched. Keeping this pure and
// dependency-free means it can be unit tested trivially and later swapped
// for a smarter/ML-based recommender without touching the rest of the app.
//
// WEIGHTS (sum to 100 when every factor is a perfect match):
//   Same gym                -> 25   (strongest signal - you'll actually meet)
//   Distance (decays 0-20)  -> 20   (closer = better, 0 beyond ~15km)
//   Same city               -> 10   (baseline geographic relevance)
//   Same fitness goal       -> 20   (core motivational alignment)
//   Same/adjacent workout time -> 15 (you need to actually be free together)
//   Similar experience level   -> 10 (avoid mismatched beginner/advanced pairing)
// ============================================================================

const WEIGHTS = {
  sameGym: 25,
  distance: 20,
  sameCity: 10,
  sameGoal: 20,
  sameTiming: 15,
  experience: 10,
};

const TIME_ADJACENCY = {
  early_morning: ['morning'],
  morning: ['early_morning', 'afternoon'],
  afternoon: ['morning', 'evening'],
  evening: ['afternoon', 'night'],
  night: ['evening'],
  flexible: ['early_morning', 'morning', 'afternoon', 'evening', 'night'],
};

const EXPERIENCE_ORDER = ['beginner', 'intermediate', 'advanced'];

function scoreDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) return 0;
  if (distanceKm <= 1) return WEIGHTS.distance;
  if (distanceKm >= 15) return 0;
  // linear decay between 1km (full score) and 15km (zero)
  return Math.round(WEIGHTS.distance * (1 - (distanceKm - 1) / 14));
}

function scoreTiming(a, b) {
  if (!a || !b) return 0;
  if (a === b) return WEIGHTS.sameTiming;
  if (a === 'flexible' || b === 'flexible') return Math.round(WEIGHTS.sameTiming * 0.6);
  if (TIME_ADJACENCY[a]?.includes(b)) return Math.round(WEIGHTS.sameTiming * 0.5);
  return 0;
}

function scoreExperience(a, b) {
  if (!a || !b) return 0;
  const diff = Math.abs(EXPERIENCE_ORDER.indexOf(a) - EXPERIENCE_ORDER.indexOf(b));
  if (diff === 0) return WEIGHTS.experience;
  if (diff === 1) return Math.round(WEIGHTS.experience * 0.5);
  return 0;
}

function computeCompatibility(userA, userB, distanceKm) {
  const commonFactors = [];
  let score = 0;

  const sameGym = userA.gym && userB.gym && userA.gym.toString() === userB.gym.toString();
  if (sameGym) {
    score += WEIGHTS.sameGym;
    commonFactors.push('Same gym');
  }

  const distancePoints = scoreDistance(distanceKm);
  score += distancePoints;
  if (distancePoints > 0 && distanceKm !== null && distanceKm !== undefined) {
    commonFactors.push(`${Math.round(distanceKm * 10) / 10} km away`);
  }

  const sameCity = userA.city && userB.city && userA.city.toLowerCase() === userB.city.toLowerCase();
  if (sameCity) {
    score += WEIGHTS.sameCity;
    commonFactors.push('Same city');
  }

  const sameGoal = userA.fitnessGoal && userA.fitnessGoal === userB.fitnessGoal;
  if (sameGoal) {
    score += WEIGHTS.sameGoal;
    commonFactors.push('Same fitness goal');
  }

  const timingPoints = scoreTiming(userA.preferredWorkoutTime, userB.preferredWorkoutTime);
  score += timingPoints;
  if (userA.preferredWorkoutTime === userB.preferredWorkoutTime && timingPoints > 0) {
    commonFactors.push('Same workout time');
  } else if (timingPoints > 0) {
    commonFactors.push('Similar workout time');
  }

  const experiencePoints = scoreExperience(userA.experienceLevel, userB.experienceLevel);
  score += experiencePoints;
  if (userA.experienceLevel === userB.experienceLevel) {
    commonFactors.push('Same experience level');
  } else if (experiencePoints > 0) {
    commonFactors.push('Similar experience level');
  }

  return {
    compatibilityScore: Math.max(0, Math.min(100, Math.round(score))),
    commonFactors,
  };
}

module.exports = { computeCompatibility, WEIGHTS };
