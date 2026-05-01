
import { Category, ScoreCategoryKey, Scores } from './types';
import {
  calculateOnes, calculateTwos, calculateThrees, calculateFours, calculateFives, calculateSixes,
  calculateThreeOfAKind, calculateFourOfAKind, calculateFullHouse,
  calculateSmallStraight, calculateLargeStraight, calculateYahtzee, calculateChance
} from './services/scoreCalculator';

export const NUM_DICE = 5;
export const MAX_ROLLS = 3;
export const NUM_COLUMNS_KOMBO = 6; // Renamed for clarity

export const UPPER_SECTION_BONUS_THRESHOLD = 63;
export const UPPER_SECTION_BONUS_POINTS = 35;
export const FULL_HOUSE_POINTS = 25;
export const SMALL_STRAIGHT_POINTS = 30;
export const LARGE_STRAIGHT_POINTS = 40;
export const YAHTZEE_POINTS = 50; // This remains the point value for the category

export const COLUMN_MULTIPLIERS_KOMBO = [1, 2, 3, 4, 5, 6]; // Renamed for clarity

export const CATEGORIES_CONFIG: Category[] = [
  { key: ScoreCategoryKey.ONES, label: 'Einser', section: 'upper' },
  { key: ScoreCategoryKey.TWOS, label: 'Zweier', section: 'upper' },
  { key: ScoreCategoryKey.THREES, label: 'Dreier', section: 'upper' },
  { key: ScoreCategoryKey.FOURS, label: 'Vierer', section: 'upper' },
  { key: ScoreCategoryKey.FIVES, label: 'Fünfer', section: 'upper' },
  { key: ScoreCategoryKey.SIXES, label: 'Sechser', section: 'upper' },
  { key: ScoreCategoryKey.THREE_OF_A_KIND, label: '3er Pasch', section: 'lower' },
  { key: ScoreCategoryKey.FOUR_OF_A_KIND, label: '4er Pasch', section: 'lower' },
  { key: ScoreCategoryKey.FULL_HOUSE, label: 'Full House', section: 'lower' },
  { key: ScoreCategoryKey.SMALL_STRAIGHT, label: 'Kleine Straße', section: 'lower' },
  { key: ScoreCategoryKey.LARGE_STRAIGHT, label: 'Große Straße', section: 'lower' },
  { key: ScoreCategoryKey.YAHTZEE, label: 'Knubbel', section: 'lower', isYahtzee: true }, // Changed label
  { key: ScoreCategoryKey.CHANCE, label: 'Chance', section: 'lower' },
];

export const SCORING_FUNCTIONS: { [key in ScoreCategoryKey]: (dice: number[]) => number } = {
  [ScoreCategoryKey.ONES]: calculateOnes,
  [ScoreCategoryKey.TWOS]: calculateTwos,
  [ScoreCategoryKey.THREES]: calculateThrees,
  [ScoreCategoryKey.FOURS]: calculateFours,
  [ScoreCategoryKey.FIVES]: calculateFives,
  [ScoreCategoryKey.SIXES]: calculateSixes,
  [ScoreCategoryKey.THREE_OF_A_KIND]: calculateThreeOfAKind,
  [ScoreCategoryKey.FOUR_OF_A_KIND]: calculateFourOfAKind,
  [ScoreCategoryKey.FULL_HOUSE]: calculateFullHouse,
  [ScoreCategoryKey.SMALL_STRAIGHT]: calculateSmallStraight,
  [ScoreCategoryKey.LARGE_STRAIGHT]: calculateLargeStraight,
  [ScoreCategoryKey.YAHTZEE]: calculateYahtzee, // Scoring function remains the same
  [ScoreCategoryKey.CHANCE]: calculateChance,
};

export const INITIAL_DICE_VALUES = Array(NUM_DICE).fill(1) as number[];
export const INITIAL_HELD_DICE = Array(NUM_DICE).fill(false);

export const getInitialScores = (numColumns: number): Scores => {
  const s: Scores = {};
  CATEGORIES_CONFIG.forEach(cat => {
    s[cat.key] = Array(numColumns).fill(null);
  });
  return s;
};

export const calculateFinalTotalsForGameOverDisplay = (finalScores: Scores, numCols: number, colMultipliers: number[]): {grandTotalsPerCol: number[], overallGrandTotal: number} => {
    const multipliedGrandTotalsPerCol = Array(numCols).fill(0);
    for (let colIdx = 0; colIdx < numCols; colIdx++) {
      let rawUpperSum = 0;
      CATEGORIES_CONFIG.filter(c => c.section === 'upper').forEach(cat => {
        const score = finalScores[cat.key]?.[colIdx];
        if (score !== null) {
          rawUpperSum += score;
        }
      });
      
      let rawBonus = 0;
      if (rawUpperSum >= UPPER_SECTION_BONUS_THRESHOLD) {
        rawBonus = UPPER_SECTION_BONUS_POINTS;
      }
      
      const rawUpperTotalWithBonus = rawUpperSum + rawBonus;
      
      let rawLowerSum = 0;
      CATEGORIES_CONFIG.filter(c => c.section === 'lower').forEach(cat => {
         const score = finalScores[cat.key]?.[colIdx];
         if (score !== null) {
           rawLowerSum += score;
         }
      });
      multipliedGrandTotalsPerCol[colIdx] = (rawUpperTotalWithBonus + rawLowerSum) * colMultipliers[colIdx];
    }
    const overallGrandTotal = multipliedGrandTotalsPerCol.reduce((s, t) => s + t, 0);
    return { grandTotalsPerCol: multipliedGrandTotalsPerCol, overallGrandTotal };
};
