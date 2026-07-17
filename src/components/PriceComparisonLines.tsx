import { formatEuro } from '../lib/engine';

export interface PriceLine {
  label: string;
  prixGaragiste: number;
  prixReel: number;
  detail: string;
}

interface PriceComparisonLinesProps {
  lines: PriceLine[];
  totalGaragiste: number;
  totalReel: number;
}

/**
 * Mobile: stacked cards (no horizontal scroll).
 * sm+: classic comparison table.
 */
export default function PriceComparisonLines({
  lines,
  totalGaragiste,
  totalReel,
}: PriceComparisonLinesProps) {
  return (
    <>
      {/* Mobile card stack */}
      <ul className="divide-y divide-slate-100 sm:hidden" aria-label="Comparatif des postes">
        {lines.map((item, i) => {
          const delta = Math.round(
            ((item.prixGaragiste - item.prixReel) / Math.max(item.prixGaragiste, 1)) * 100,
          );
          return (
            <li key={`${item.label}-${i}`} className="space-y-2 px-4 py-4">
              <p className="font-medium leading-snug text-slate-900">{item.label}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-action-red/5 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-action-redDark/70">
                    Garagiste
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-800">
                    {formatEuro(item.prixGaragiste)}
                    {delta > 50 && (
                      <span className="ml-1.5 rounded bg-action-red/10 px-1.5 py-0.5 text-[10px] font-bold text-action-redDark">
                        +{delta}%
                      </span>
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-action-green/5 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-action-greenDark/70">
                    Prix réel
                  </p>
                  <p className="mt-0.5 font-bold text-action-greenDark">{formatEuro(item.prixReel)}</p>
                </div>
              </div>
              {item.detail && <p className="text-xs leading-relaxed text-slate-500">{item.detail}</p>}
            </li>
          );
        })}
        <li className="grid grid-cols-2 gap-2 bg-slate-50 px-4 py-4 font-bold">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total garagiste</p>
            <p className="mt-0.5 text-slate-900">{formatEuro(totalGaragiste)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total réel</p>
            <p className="mt-0.5 text-action-greenDark">{formatEuro(totalReel)}</p>
          </div>
        </li>
      </ul>

      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 sm:px-6">Poste</th>
              <th className="px-4 py-3 text-right sm:px-6">Prix garagiste</th>
              <th className="px-4 py-3 text-right sm:px-6">Prix réel</th>
              <th className="hidden px-6 py-3 md:table-cell">Détail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((item, i) => {
              const delta = Math.round(
                ((item.prixGaragiste - item.prixReel) / Math.max(item.prixGaragiste, 1)) * 100,
              );
              return (
                <tr key={`${item.label}-${i}`} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900 sm:px-6">{item.label}</td>
                  <td className="px-4 py-3 text-right sm:px-6">
                    <span className="text-slate-700">{formatEuro(item.prixGaragiste)}</span>
                    {delta > 50 && (
                      <span className="ml-2 rounded bg-action-red/10 px-1.5 py-0.5 text-[10px] font-bold text-action-redDark">
                        +{delta}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-action-greenDark sm:px-6">
                    {formatEuro(item.prixReel)}
                  </td>
                  <td className="hidden px-6 py-3 text-xs text-slate-500 md:table-cell">{item.detail}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
              <td className="px-4 py-3 text-slate-900 sm:px-6">Total</td>
              <td className="px-4 py-3 text-right text-slate-900 sm:px-6">{formatEuro(totalGaragiste)}</td>
              <td className="px-4 py-3 text-right text-action-greenDark sm:px-6">{formatEuro(totalReel)}</td>
              <td className="hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
