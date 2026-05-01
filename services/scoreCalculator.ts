import { DiceValue } from '../types';
import { FULL_HOUSE_POINTS, SMALL_STRAIGHT_POINTS, LARGE_STRAIGHT_POINTS, YAHTZEE_POINTS } from '../constants';

const getCounts = (dice: DiceValue[]): number[] => {
  const counts = Array(7).fill(0); // Index 0 unused, 1-6 for dice values
  dice.forEach(d => counts[d]++);
  return counts;
};

export const calculateSumOfSpecifics = (dice: DiceValue[], value: number): number => {
  return dice.filter(d => d === value).reduce((sum, dVal) => sum + dVal, 0);
};

export const calculateOnes = (dice: DiceValue[]): number => calculateSumOfSpecifics(dice, 1);
export const calculateTwos = (dice: DiceValue[]): number => calculateSumOfSpecifics(dice, 2);
export const calculateThrees = (dice: DiceValue[]): number => calculateSumOfSpecifics(dice, 3);
export const calculateFours = (dice: DiceValue[]): number => calculateSumOfSpecifics(dice, 4);
export const calculateFives = (dice: DiceValue[]): number => calculateSumOfSpecifics(dice, 5);
export const calculateSixes = (dice: DiceValue[]): number => calculateSumOfSpecifics(dice, 6);

const sumAllDice = (dice: DiceValue[]): number => dice.reduce((sum, d) => sum + d, 0);

export const calculateThreeOfAKind = (dice: DiceValue[]): number => {
  const counts = getCounts(dice);
  return counts.some(count => count >= 3) ? sumAllDice(dice) : 0;
};

export const calculateFourOfAKind = (dice: DiceValue[]): number => {
  const counts = getCounts(dice);
  return counts.some(count => count >= 4) ? sumAllDice(dice) : 0;
};

export const calculateFullHouse = (dice: DiceValue[]): number => {
  const counts = getCounts(dice);
  // A standard Full House is 3 of one kind and 2 of another.
  const hasThree = counts.some(count => count === 3);
  const hasTwo = counts.some(count => count === 2);
  // A Yahtzee (5 of a kind) can also be scored as a Full House.
  const isYahtzee = counts.some(count => count >= 5);
  return (hasThree && hasTwo) || isYahtzee ? FULL_HOUSE_POINTS : 0;
};

export const calculateSmallStraight = (dice: DiceValue[]): number => {
  const uniqueSortedDice = Array.from(new Set(dice)).sort((a, b) => a - b);
  const straights = ["1234", "2345", "3456"];
  const diceString = uniqueSortedDice.join('');
  for (const straight of straights) {
    if (diceString.includes(straight)) return SMALL_STRAIGHT_POINTS;
  }
  return 0;
};

export const calculateLargeStraight = (dice: DiceValue[]): number => {
  const uniqueSortedDice = Array.from(new Set(dice)).sort((a, b) => a - b);
  const straights = ["12345", "23456"];
  const diceString = uniqueSortedDice.join('');
  for (const straight of straights) {
    if (diceString.includes(straight)) return LARGE_STRAIGHT_POINTS;
  }
  return 0;
};

export const calculateYahtzee = (dice: DiceValue[]): number => {
  const counts = getCounts(dice);
  return counts.some(count => count >= 5) ? YAHTZEE_POINTS : 0;
};

export const calculateChance = (dice: DiceValue[]): number => sumAllDice(dice);