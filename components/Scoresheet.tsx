
import React from 'react';
import { ArrowDown, ArrowUp, RefreshCcw } from 'lucide-react';
import { Category, Scores, PotentialScores, ScoreCategoryKey, GameMode } from '../types';
import { CATEGORIES_CONFIG, UPPER_SECTION_BONUS_THRESHOLD, UPPER_SECTION_BONUS_POINTS } from '../constants';

interface ScoresheetProps {
  scores: Scores; 
  potentialScores: PotentialScores; 
  onSelectScore: (categoryKey: ScoreCategoryKey, columnIndex: number) => void;
  isCellClickable: (categoryKey: ScoreCategoryKey, categoryIndex: number, columnIndex: number) => boolean;
  column3NextRow: number; 
  column4NextRow: number; 
  gameOver: boolean;
  gameMode: GameMode;
  effectiveNumColumns: number;
  effectiveColumnMultipliers: number[];
  isBlind?: boolean;
  bonusPoints?: number;
}

const Scoresheet: React.FC<ScoresheetProps> = ({
  scores,
  potentialScores,
  onSelectScore,
  isCellClickable,
  column3NextRow, 
  column4NextRow, 
  gameOver,
  gameMode,
  effectiveNumColumns,
  effectiveColumnMultipliers,
  isBlind = false,
  bonusPoints = 0
}) => {
  const upperSectionKeys = CATEGORIES_CONFIG.filter(c => c.section === 'upper').map(c => c.key);
  const lowerSectionKeys = CATEGORIES_CONFIG.filter(c => c.section === 'lower').map(c => c.key);

  const calculateColumnTotals = () => {
    const displayRawUpperSums = Array(effectiveNumColumns).fill(0);
    const displayRawBonuses = Array(effectiveNumColumns).fill(0);
    const displayRawUpperTotalsWithBonus = Array(effectiveNumColumns).fill(0);
    const displayRawLowerSums = Array(effectiveNumColumns).fill(0);
    const displayMultipliedGrandTotals = Array(effectiveNumColumns).fill(0);

    for (let colIdx = 0; colIdx < effectiveNumColumns; colIdx++) {
      upperSectionKeys.forEach(catKey => {
        const score = scores[catKey]?.[colIdx]; 
        if (score !== null) {
          displayRawUpperSums[colIdx] += score;
        }
      });

      if (displayRawUpperSums[colIdx] >= UPPER_SECTION_BONUS_THRESHOLD) {
        displayRawBonuses[colIdx] = UPPER_SECTION_BONUS_POINTS;
      }
      
      displayRawUpperTotalsWithBonus[colIdx] = displayRawUpperSums[colIdx] + displayRawBonuses[colIdx];

      lowerSectionKeys.forEach(catKey => {
        const score = scores[catKey]?.[colIdx]; 
        if (score !== null) {
          displayRawLowerSums[colIdx] += score;
        }
      });

      displayMultipliedGrandTotals[colIdx] = (displayRawUpperTotalsWithBonus[colIdx] + displayRawLowerSums[colIdx]) * effectiveColumnMultipliers[colIdx];
    }
    
    return { 
        displayRawUpperSums, 
        displayRawBonuses, 
        displayRawUpperTotalsWithBonus, 
        displayRawLowerSums, 
        displayMultipliedGrandTotals 
    };
  };

  const { 
    displayRawUpperSums, 
    displayRawBonuses, 
    displayRawUpperTotalsWithBonus, 
    displayRawLowerSums, 
    displayMultipliedGrandTotals 
  } = calculateColumnTotals();
  
  const overallGrandTotal = displayMultipliedGrandTotals.reduce((sum, total) => sum + total, 0) + (bonusPoints || 0);

  if (gameMode === 'classic' && effectiveNumColumns === 1) {
    const upperSectionCategories = CATEGORIES_CONFIG.filter(c => c.section === 'upper');
    const lowerSectionCategories = CATEGORIES_CONFIG.filter(c => c.section === 'lower');

    const renderClassicCategoryRow = (category: Category, categoryIndex: number) => {
      const score = scores[category.key]?.[0];
      const potential = potentialScores[category.key]?.[0];
      const clickable = isCellClickable(category.key, categoryIndex, 0);

      let scoreCellStyles = "p-0 border border-slate-600/50 text-base h-11 text-right align-middle transition-colors"; 
      let scoreCellInnerDivStyles = "h-full w-full flex items-center justify-end py-1 px-3"; 
      let scoreCellContent: React.ReactNode;

      if (isBlind) {
        scoreCellStyles += " bg-slate-800/40";
        scoreCellInnerDivStyles += " text-slate-700/30";
        scoreCellContent = "-";
      } else if (score !== null) {
        scoreCellStyles += " bg-emerald-700/60";
        scoreCellInnerDivStyles += " font-bold text-white shadow-inner";
        scoreCellContent = score;
      } else if (clickable && potential !== null && potential !== undefined) {
        scoreCellStyles += " bg-yellow-400/80 cursor-pointer shadow-lg z-10 hover:bg-yellow-300 active:scale-[0.98] transition-transform"; 
        if (potential === 0) {
            scoreCellInnerDivStyles += " text-slate-700/40 font-bold italic"; 
        } else {
            scoreCellInnerDivStyles += " text-slate-900 font-extrabold"; 
        }
        scoreCellContent = potential;
      } else {
        scoreCellStyles += " bg-slate-800/40";
        scoreCellInnerDivStyles += " text-slate-600";
        scoreCellContent = "-";
      }

      return (
        <tr key={category.key} className={`hover:bg-slate-700/30 group ${category.key === ScoreCategoryKey.SIXES ? 'border-b-2 border-slate-500' : 'border-b border-slate-700/50'}`}>
          <td className="py-2 px-3 text-sm font-semibold transition-colors group-hover:text-white text-slate-300 min-w-[120px]">{category.label}</td><td className={scoreCellStyles} onClick={() => !isBlind && clickable && score === null && onSelectScore(category.key, 0)}><div className={scoreCellInnerDivStyles}>{scoreCellContent}</div></td>
        </tr>
      );
    };

    const renderClassicTotalRow = (label: string, value: number | string, highlight: boolean = false, isBonus: boolean = false) => (
        <tr className={`font-semibold ${highlight ? 'text-white bg-slate-500/80' : 'text-slate-100 bg-slate-600/80'}`}>
            <td className="py-1.5 px-2 text-base text-left align-middle border-b border-slate-500">{label}</td><td className={`py-1.5 px-2 text-base text-right align-middle border-b border-slate-500 ${!isBlind && isBonus && typeof value === 'number' && value > 0 ? 'text-green-400' : ''}`}>{isBlind ? "-" : (isBonus && typeof value === 'number' && value > 0 ? `+${value}` : value)}</td>
        </tr>
    );

    return (
      <div className="relative bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
        {isBlind && (
          <div className="absolute inset-0 z-30 foggy-overlay-bg backdrop-blur-3xl flex flex-col items-center justify-center p-4 text-center rounded-2xl">
            <div className="bg-slate-950/95 border border-slate-800 p-6 rounded-2xl max-w-xs shadow-2xl animate-pulse">
              <span className="text-4xl block mb-2">🌫️</span>
              <h5 className="text-lg font-black text-slate-200 mb-1">Nebel-Effekt aktiv</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dein Spielplan ist eingehüllt! Du kannst deine freien Felder erst wieder sehen, wenn du keine Würfe mehr hast und eintragen musst.
              </p>
            </div>
          </div>
        )}
        <div className={`flex flex-col md:flex-row gap-0 transition-all duration-300 ${isBlind ? 'filter grayscale blur-md opacity-25 select-none pointer-events-none' : ''}`}>
          {/* Upper Section */}
          <div className="flex-1 p-3 sm:p-5 border-r border-slate-700/50">
            <h4 className="text-xl font-black mb-4 text-yellow-400 border-b-2 border-yellow-400/20 pb-2 flex items-center justify-between">
                <span className="font-game-title">Oberer Bereich</span>
                <span className="text-[10px] text-slate-500 tracking-widest uppercase font-sans">Summe &ge; 63</span>
            </h4>
            <table className="w-full border-collapse">
              <thead className="sr-only">
                <tr>
                  <th className="text-left py-2 px-3 text-slate-400 text-xs font-black uppercase">Kategorie</th> 
                  <th className="text-right py-2 px-3 text-slate-400 text-xs font-black uppercase">Punkte</th> 
                </tr>
              </thead>
              <tbody>
                {upperSectionCategories.map(cat => renderClassicCategoryRow(cat, CATEGORIES_CONFIG.findIndex(c => c.key === cat.key)))}
                {renderClassicTotalRow("Summe Oben", displayRawUpperSums[0])}
                {renderClassicTotalRow("Bonus", displayRawBonuses[0], false, true)}
                {renderClassicTotalRow("Gesamt Oben", displayRawUpperTotalsWithBonus[0], true)}
              </tbody>
            </table>
          </div>

          {/* Lower Section */}
          <div className="flex-1 p-3 sm:p-5">
            <h4 className="text-xl font-black mb-4 text-yellow-400 border-b-2 border-yellow-400/20 pb-2 flex items-center justify-between">
                <span className="font-game-title">Unterer Bereich</span>
                <span className="text-[10px] text-slate-500 tracking-widest uppercase font-sans">Tricks</span>
            </h4>
            <table className="w-full border-collapse">
              <thead className="sr-only">
                 <tr>
                  <th className="text-left py-2 px-3 text-slate-400 text-xs font-black uppercase">Kategorie</th> 
                  <th className="text-right py-2 px-3 text-slate-400 text-xs font-black uppercase">Punkte</th> 
                </tr>
              </thead>
              <tbody>
                {lowerSectionCategories.map(cat => renderClassicCategoryRow(cat, CATEGORIES_CONFIG.findIndex(c => c.key === cat.key)))}
                {renderClassicTotalRow("Summe Unten", displayRawLowerSums[0], true)}
                {bonusPoints > 0 && renderClassicTotalRow("Bonuskonto 💸", bonusPoints, false, true)}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grand Totals for Classic Mode */}
        <div className="bg-slate-800/80 p-5 border-t border-slate-700/50 flex justify-between items-center">
            <span className="text-xl font-bold text-yellow-400 font-game-title tracking-tight">GESAMTERGEBNIS</span>
            {isBlind ? (
              <span className="text-4xl font-black text-slate-500">-</span>
            ) : bonusPoints > 0 ? (
              <div className="flex flex-col items-end">
                <span className="text-xs text-slate-400 font-sans">Spielplan: {overallGrandTotal - bonusPoints} | Bonuskonto: +{bonusPoints}</span>
                <span className="text-4xl font-black text-yellow-500 animate-pulse">{overallGrandTotal}</span>
              </div>
            ) : (
              <span className="text-4xl font-black text-yellow-500 animate-pulse">{overallGrandTotal}</span>
            )}
        </div>
      </div>
    );

  } else { // Kombo Mode or other multi-column scenarios
      const renderCategoryRow = (category: Category, categoryIndex: number) => {
        return (
          <tr key={category.key} className={`${category.section === 'lower' && category.key === ScoreCategoryKey.THREE_OF_A_KIND ? 'border-t-2 border-slate-600' : ''}`}>
            <td className="py-1.5 px-3 border border-slate-600 bg-slate-800 font-semibold text-sm md:text-base sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.3)] min-w-[110px] text-slate-100 text-left align-middle">{category.label}</td>{effectiveColumnMultipliers.map((_multiplier, colIdx) => { 
              const score = scores[category.key]?.[colIdx]; 
              const potential = potentialScores[category.key]?.[colIdx]; 
              const clickable = isCellClickable(category.key, CATEGORIES_CONFIG.findIndex(c => c.key === category.key), colIdx);
              
              let cellStyles = "p-0 border border-slate-600/50 text-base h-11 h-12 transition-colors"; 
              let cellContent: React.ReactNode = "";
              let innerDivClasses = "h-full w-full flex items-center justify-center py-1.5 px-2"; 

              if (isBlind) {
                cellStyles += " bg-slate-800/40";
                innerDivClasses += " text-slate-700/20";
                cellContent = "-";
              } else if (score !== null) {
                cellStyles += " bg-emerald-700/60"; 
                innerDivClasses += " font-bold text-white shadow-inner";
                cellContent = score; 
              } else if (clickable && potential !== null && potential !== undefined) {
                cellStyles += " bg-yellow-400/80 cursor-pointer shadow-lg z-10 hover:bg-yellow-300 active:scale-[0.98] transition-transform"; 
                if (potential === 0) {
                    innerDivClasses += " text-slate-700/40 font-bold italic"; 
                } else {
                    innerDivClasses += " text-slate-900 font-extrabold"; 
                }
                cellContent = potential;
                
              } else {
                innerDivClasses += " text-slate-600"; 
                cellContent = "-";
                cellStyles += " bg-slate-800/40"; 
              }
              
              return (
                <td key={colIdx} className={cellStyles} onClick={() => !isBlind && clickable && score === null && onSelectScore(category.key, colIdx)}><div className={innerDivClasses}>{cellContent}</div></td>
              );
            })}
          </tr>
        );
      };
    return (
      <div className="relative overflow-x-auto bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl">
        {isBlind && (
          <div className="absolute inset-0 z-30 foggy-overlay-bg backdrop-blur-3xl flex flex-col items-center justify-center p-4 text-center rounded-2xl">
            <div className="bg-slate-950/95 border border-slate-800 p-6 rounded-2xl max-w-xs shadow-2xl animate-pulse">
              <span className="text-4xl block mb-2">🌫️</span>
              <h5 className="text-lg font-black text-slate-200 mb-1">Nebel-Effekt aktiv</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dein Spielplan ist eingehüllt! Du kannst deine freien Felder erst wieder sehen, wenn du keine Würfe mehr hast und eintragen musst.
              </p>
            </div>
          </div>
        )}
        <table className={`min-w-full border-collapse transition-all duration-300 ${isBlind ? 'filter grayscale blur-md opacity-25 select-none pointer-events-none' : ''}`}>
          <thead>
            <tr className="bg-slate-800/80">
              <th className="py-3 px-4 border-b border-slate-700 sticky left-0 z-30 bg-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.5)] min-w-[120px] text-xs font-black uppercase tracking-widest text-slate-400 text-left">Kategorie</th>{effectiveColumnMultipliers.map((multiplier, idx) => (
                <th key={idx} className="py-2 px-2 border border-slate-600 text-xs md:text-sm w-24 md:w-28 text-center align-middle bg-slate-800/50"> 
                  <div className="flex flex-col items-center">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Spalte {idx+1}</span>
                    <span className="text-yellow-400 font-black text-sm">x{multiplier}</span>
                    <div className="flex gap-1 mt-1">
                        {gameMode === 'kombo' && idx === 3 && <ArrowDown className="w-3 h-3 text-purple-400" />}
                        {gameMode === 'kombo' && idx === 4 && <ArrowUp className="w-3 h-3 text-indigo-400" />}
                        {gameMode === 'kombo' && idx === 5 && <RefreshCcw className="w-3 h-3 text-teal-400" />}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES_CONFIG.filter(c => c.section === 'upper').map(renderCategoryRow)}
            <tr className="bg-slate-700 font-bold text-slate-100">
              <td className="py-2 px-3 border border-slate-600 sticky left-0 z-20 bg-slate-700 text-xs md:text-sm text-left align-middle shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Summe Oben</td>{displayRawUpperSums.map((sum, idx) => <td key={idx} className="py-2 px-2 border border-slate-600 text-center text-sm align-middle">{isBlind ? '-' : sum}</td>)} 
            </tr>
            <tr className="bg-slate-700 font-bold">
              <td className="py-2 px-3 border border-slate-600 sticky left-0 z-20 bg-slate-700 text-xs md:text-sm text-slate-100 text-left align-middle shadow-[2px_0_5px_rgba(0,0,0,0.3)] border-t-2 border-slate-500">Bonus (&ge;{UPPER_SECTION_BONUS_THRESHOLD})</td>{displayRawBonuses.map((bonus, idx) => <td key={idx} className={`py-2 px-2 border border-slate-600 border-t-2 border-slate-500 text-center text-sm align-middle ${!isBlind && bonus > 0 ? 'text-green-400 font-black' : 'text-slate-400'}`}>{isBlind ? '-' : (bonus > 0 ? `+${bonus}`: '0')}</td>)} 
            </tr>
            <tr className="bg-slate-800 text-emerald-400 font-bold">
              <td className="py-2 px-3 border border-slate-400 sticky left-0 z-20 bg-slate-800 text-xs md:text-sm text-left align-middle shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Gesamt Oben</td>{displayRawUpperTotalsWithBonus.map((total, idx) => <td key={idx} className={`py-2 px-2 border border-slate-400 text-center text-sm align-middle ${isBlind ? 'text-slate-500' : ''}`}>{isBlind ? '-' : total}</td>)} 
            </tr>
            {CATEGORIES_CONFIG.filter(c => c.section === 'lower').map(renderCategoryRow)}
            <tr className="bg-slate-700 font-bold text-slate-100">
              <td className="py-2 px-3 border border-slate-600 sticky left-0 z-20 bg-slate-700 text-xs md:text-sm text-left align-middle shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Summe Unten</td>{displayRawLowerSums.map((sum, idx) => <td key={idx} className="py-2 px-2 border border-slate-600 text-center text-sm align-middle">{isBlind ? '-' : sum}</td>)} 
            </tr>
            {bonusPoints > 0 && (
              <tr className="bg-slate-800 text-teal-400 font-bold">
                <td className="py-2 px-3 border border-slate-600 sticky left-0 z-20 bg-slate-800 text-xs md:text-sm text-left align-middle shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Bonuskonto 💸</td>
                <td colSpan={effectiveNumColumns} className={`py-2 px-4 border border-slate-600 text-right text-sm align-middle ${isBlind ? 'text-slate-500' : 'text-teal-400'}`}>
                  {isBlind ? '-' : `+${bonusPoints} Punkte (gestohlen via Punkte-Spender)`}
                </td>
              </tr>
            )}
            <tr className="bg-slate-800 text-yellow-400 font-bold">
              <td className="py-2 px-3 border border-slate-400 sticky left-0 z-20 bg-slate-800 text-xs md:text-sm text-left align-middle shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Endsumme (x Multi)</td>{displayMultipliedGrandTotals.map((total, idx) => <td key={idx} className={`py-2 px-2 border border-slate-400 text-center text-sm md:text-base align-middle ${isBlind ? 'text-slate-500' : ''}`}>{isBlind ? '-' : total}</td>)} 
            </tr>
          </tbody>
        </table>
        {isBlind ? (
          <div className="mt-6 bg-slate-900 p-4 rounded-lg shadow-xl border border-slate-700">
            <div className="flex justify-between items-center pt-3">
              <span className="text-xl font-bold text-slate-500 font-game-title">Gesamtergebnis:</span>
              <span className="text-3xl font-bold text-slate-500">-</span>
            </div>
          </div>
        ) : bonusPoints > 0 ? (
          <div className="mt-4 bg-slate-900 p-4 rounded-lg shadow-xl border border-slate-700 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-400 font-sans">Spielplan-Summe: {overallGrandTotal - bonusPoints}</span>
              <span className="text-sm font-bold text-teal-400 font-sans">Bonuskonto: +{bonusPoints}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-bold font-sans">Gesamtergebnis:</span>
              <span className="text-3xl font-bold text-yellow-400 font-game-title">{overallGrandTotal}</span>
            </div>
          </div>
        ) : (
          <div className="mt-6 bg-slate-900 p-4 rounded-lg shadow-xl border border-slate-700">
            <div className="flex justify-between items-center pt-3">
              <span className="text-xl font-bold text-yellow-400 font-game-title">Gesamtergebnis:</span>
              <span className="text-3xl font-bold text-yellow-400">{overallGrandTotal}</span>
            </div>
          </div>
        )}
      </div>
      
    );
  }
};

export default Scoresheet;
