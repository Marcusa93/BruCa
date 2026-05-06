import { expectedReturn } from "./calculations";

export interface ReinvestStep {
  month: number;
  startingCapital: number;
  interest: number;
  endingCapital: number;
  withdrawn: number;
}

export interface ReinvestOptions {
  reinvestInterest?: boolean;
  monthlyWithdrawal?: number;
  daysPerMonth?: number;
}

export function simulateReinvestment(
  initialCapital: number,
  monthlyRate: number,
  months: number,
  opts: ReinvestOptions = {},
): ReinvestStep[] {
  const reinvestInterest = opts.reinvestInterest ?? true;
  const monthlyWithdrawal = opts.monthlyWithdrawal ?? 0;
  const days = opts.daysPerMonth ?? 30;

  const steps: ReinvestStep[] = [];
  let capital = initialCapital;

  for (let m = 1; m <= months; m++) {
    const interest = expectedReturn(capital, monthlyRate, days);
    let ending = capital;
    let withdrawn = 0;

    if (reinvestInterest) {
      ending = capital + interest - monthlyWithdrawal;
      withdrawn = monthlyWithdrawal;
    } else {
      ending = capital - monthlyWithdrawal;
      withdrawn = interest + monthlyWithdrawal;
    }

    steps.push({
      month: m,
      startingCapital: capital,
      interest,
      endingCapital: ending,
      withdrawn,
    });

    capital = ending;
  }

  return steps;
}

export interface SinglePlacementSimulation {
  capital: number;
  interest: number;
  total: number;
  dailyInterest: number;
  monthlyRate: number;
  effectiveRate: number;
}

export function simulateSinglePlacement(
  capital: number,
  monthlyRate: number,
  days: number,
): SinglePlacementSimulation {
  const interest = expectedReturn(capital, monthlyRate, days);
  return {
    capital,
    interest,
    total: capital + interest,
    dailyInterest: days > 0 ? interest / days : 0,
    monthlyRate,
    effectiveRate: capital > 0 ? interest / capital : 0,
  };
}
