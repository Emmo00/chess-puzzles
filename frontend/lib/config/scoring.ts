export interface ScoringConfig {
  basePointsStandard: number;
  basePointsDaily: number;
  hintPenalty1: number;
  hintPenalty2: number;
  hintFailThreshold: number;
  streakCap: number;
  streakStep: number;
  streakCapAt: number;
  speedBonus: number;
  speedBonusThresholdSec: number;
}

export const SCORING_CONFIG_DEFAULTS: ScoringConfig = {
  basePointsStandard: 100,
  basePointsDaily: 200,
  hintPenalty1: 30,
  hintPenalty2: 60,
  hintFailThreshold: 3,
  streakCap: 1.5,
  streakStep: 0.1,
  streakCapAt: 5,
  speedBonus: 25,
  speedBonusThresholdSec: 15,
};
