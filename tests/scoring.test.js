const { computeCompatibility } = require('../src/modules/buddy/scoring.service');

describe('compatibility scoring engine', () => {
  test('identical users at the same gym score very high', () => {
    const gymId = '507f1f77bcf86cd799439011';
    const a = {
      gym: gymId, city: 'Meerut', fitnessGoal: 'muscle_gain', preferredWorkoutTime: 'evening', experienceLevel: 'intermediate',
    };
    const b = { ...a };
    const { compatibilityScore, commonFactors } = computeCompatibility(a, b, 0.5);
    expect(compatibilityScore).toBeGreaterThanOrEqual(90);
    expect(commonFactors).toEqual(expect.arrayContaining(['Same gym', 'Same city', 'Same fitness goal']));
  });

  test('completely mismatched users score low', () => {
    const a = {
      gym: '507f1f77bcf86cd799439011', city: 'Meerut', fitnessGoal: 'muscle_gain', preferredWorkoutTime: 'early_morning', experienceLevel: 'beginner',
    };
    const b = {
      gym: '507f1f77bcf86cd799439099', city: 'Delhi', fitnessGoal: 'flexibility', preferredWorkoutTime: 'night', experienceLevel: 'advanced',
    };
    const { compatibilityScore } = computeCompatibility(a, b, 40);
    expect(compatibilityScore).toBeLessThan(20);
  });

  test('distance decays score smoothly and never goes negative', () => {
    const a = { fitnessGoal: 'general_fitness' };
    const b = { fitnessGoal: 'general_fitness' };
    const near = computeCompatibility(a, b, 0.5).compatibilityScore;
    const far = computeCompatibility(a, b, 20).compatibilityScore;
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThanOrEqual(0);
  });
});
