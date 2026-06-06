
export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export enum ScoreCategoryKey {
  ONES = 'ONES',
  TWOS = 'TWOS',
  THREES = 'THREES',
  FOURS = 'FOURS',
  FIVES = 'FIVES',
  SIXES = 'SIXES',
  THREE_OF_A_KIND = 'THREE_OF_A_KIND',
  FOUR_OF_A_KIND = 'FOUR_OF_A_KIND',
  FULL_HOUSE = 'FULL_HOUSE',
  SMALL_STRAIGHT = 'SMALL_STRAIGHT',
  LARGE_STRAIGHT = 'LARGE_STRAIGHT',
  YAHTZEE = 'YAHTZEE',
  CHANCE = 'CHANCE',
}

export interface Category {
  key: ScoreCategoryKey;
  label: string;
  section: 'upper' | 'lower';
  isYahtzee?: boolean;
}

export interface Scores {
  [key: string]: (number | null)[]; // CategoryKey maps to an array of N column scores
}

export interface PotentialScores {
 [key: string]: (number | null)[]; // CategoryKey maps to an array of N column scores
}

export type GameMode = 'kombo' | 'classic' | 'online' | 'kombo_khaos' | 'classic_khaos';

export interface ActiveEffect {
  type: 'two_rolls_only' | 'no_yahtzee' | 'blind_sheet' | 'immune' | 'score_booster' | 'no_hold';
  roundsLeft: number;
  casterId?: string;
}

