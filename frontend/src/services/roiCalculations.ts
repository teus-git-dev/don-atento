export interface ROIMetrics {
  roi: number;
  annualSavings: number;
  ebitda: number;
  breakevenYears: number;
}

export function calculateROIMetrics(
  investment: number,
  monthlyRent: number,
  maintenanceCostMonthly: number,
  vacancyRate: number = 0.05 // 5% default
): ROIMetrics {
  const annualGrossIncome = monthlyRent * 12 * (1 - vacancyRate);
  const annualMaintenance = maintenanceCostMonthly * 12;
  const annualNetIncome = annualGrossIncome - annualMaintenance;
  
  const ebitda = annualNetIncome; // Simplified for this simulator
  const roi = investment > 0 ? (annualNetIncome / investment) * 100 : 0;
  const breakevenYears = annualNetIncome > 0 ? investment / annualNetIncome : 0;
  
  // Simulated savings with AI (reducing maintenance and vacancy by 15%)
  const optimizedMaintenance = annualMaintenance * 0.85;
  const optimizedVacancy = annualGrossIncome * 0.02; // Reduced vacancy
  const annualSavings = (annualMaintenance - optimizedMaintenance) + (annualGrossIncome * vacancyRate - optimizedVacancy);

  return {
    roi,
    annualSavings,
    ebitda,
    breakevenYears
  };
}
