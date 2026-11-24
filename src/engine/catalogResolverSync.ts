import type { CalculatorDefinition } from './calculatorTypes';
import {
  CATALOG_2500,
  FLAGSHIP_BY_ID,
  attachCatalogMeta,
  buildUnitVariantDefinition,
  resolveCatalogEntryMeta,
} from './catalogResolver';
import { buildFinanceDefinition } from './solvers/financeSolver';
import { buildMathDefinition } from './solvers/mathSolver';
import { buildHealthDefinition } from './solvers/healthSolver';
import { buildPhysicsEngDefinition } from './solvers/physicsEngSolver';
import { buildChemBioDefinition } from './solvers/chemBioSolver';
import { buildConstructionAgriDefinition } from './solvers/constructionAgriSolver';
import { buildBusinessAndDailyDefinition } from './solvers/businessAndDailySolver';
import { buildTechNetDefinition } from './solvers/techNetSolver';

export { CATALOG_2500 };

export function resolveCalculatorSync(slugOrId: string): CalculatorDefinition | undefined {
  const clean = slugOrId.trim().toLowerCase();
  const entry = resolveCatalogEntryMeta(clean);
  if (!entry) {
    return FLAGSHIP_BY_ID.get(clean);
  }

  switch (entry.solverFamily) {
    case 'flagship': {
      const fId = entry.solverKey.replace(/^flagship:/, '');
      const fDef = FLAGSHIP_BY_ID.get(fId);
      if (fDef) return attachCatalogMeta(fDef, entry);
      return attachCatalogMeta(buildFinanceDefinition(entry), entry);
    }
    case 'unit':
      return buildUnitVariantDefinition(entry);
    case 'finance':
      return attachCatalogMeta(buildFinanceDefinition(entry), entry);
    case 'math':
      return attachCatalogMeta(buildMathDefinition(entry), entry);
    case 'health':
      return attachCatalogMeta(buildHealthDefinition(entry), entry);
    case 'physicsEng':
      return attachCatalogMeta(buildPhysicsEngDefinition(entry), entry);
    case 'chemBio':
      return attachCatalogMeta(buildChemBioDefinition(entry), entry);
    case 'constructionAgri':
      return attachCatalogMeta(buildConstructionAgriDefinition(entry), entry);
    case 'businessHr':
    case 'dailyAstro':
      return attachCatalogMeta(buildBusinessAndDailyDefinition(entry), entry);
    case 'techNet':
      return attachCatalogMeta(buildTechNetDefinition(entry), entry);
    default:
      return attachCatalogMeta(buildBusinessAndDailyDefinition(entry), entry);
  }
}
