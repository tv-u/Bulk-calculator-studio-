/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter, Route, Routes, useParams } from 'react-router-dom';
import { StudioProvider } from './context/StudioContext';
import { AppShell } from './components/layout/AppShell';
import { isSupportedLanguage } from './i18n/languages';
import { HomePage } from './pages/HomePage';
import { CalculatorsDirectoryPage } from './pages/CalculatorsDirectoryPage';
import { CalculatorDetailPage } from './pages/CalculatorDetailPage';
import { BulkCalculatorPage } from './pages/BulkCalculatorPage';
import { CustomBuilderPage } from './pages/CustomBuilderPage';
import { WorkflowBuilderPage } from './pages/WorkflowBuilderPage';
import { MathLabPage } from './pages/MathLabPage';
import { FinanceLabPage } from './pages/FinanceLabPage';
import { DataAnalysisPage } from './pages/DataAnalysisPage';
import { UnitConverterPage } from './pages/UnitConverterPage';
import { CurrencyConverterPage } from './pages/CurrencyConverterPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { DashboardPage } from './pages/DashboardPage';
import {
  CompareResultsPage,
  HistoryPage,
  ReportsCenterPage,
  SavedCalculationsPage,
} from './pages/WorkspaceRecordsPages';
import { FormulaLibraryPage } from './pages/FormulaLibraryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import {
  AboutPage,
  ContactPage,
  DeveloperDocsPage,
  ErrorPage,
  HelpCenterPage,
  LegalPage,
  NotFoundPage,
} from './pages/StaticAndSystemPages';

const LangGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang } = useParams<{ lang: string }>();
  if (!lang || !isSupportedLanguage(lang)) {
    return <NotFoundPage />;
  }
  return <>{children}</>;
};

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class StudioErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          message={this.state.errorMessage}
          onRetry={() => this.setState({ hasError: false, errorMessage: '' })}
        />
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <HashRouter>
      <StudioProvider>
        <AppShell>
          <StudioErrorBoundary>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/calculators" element={<CalculatorsDirectoryPage mode="all" />} />
              <Route path="/categories" element={<CalculatorsDirectoryPage mode="categories" />} />
              <Route
                path="/categories/:categoryId"
                element={<CalculatorsDirectoryPage mode="categories" />}
              />
              <Route path="/calculators/:slug" element={<CalculatorDetailPage />} />

              <Route path="/bulk-calculator" element={<BulkCalculatorPage />} />
              <Route path="/bulk-calculator/csv" element={<BulkCalculatorPage />} />
              <Route path="/custom-calculator-builder" element={<CustomBuilderPage />} />
              <Route path="/workflow-builder" element={<WorkflowBuilderPage />} />

              <Route path="/math-lab" element={<MathLabPage />} />
              <Route path="/finance-lab" element={<FinanceLabPage />} />
              <Route path="/data-analysis" element={<DataAnalysisPage />} />
              <Route path="/ai-assistant" element={<AIAssistantPage />} />

              <Route path="/unit-converter" element={<UnitConverterPage />} />
              <Route path="/currency-converter" element={<CurrencyConverterPage />} />
              <Route path="/formula-library" element={<FormulaLibraryPage />} />

              <Route path="/saved" element={<SavedCalculationsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/compare" element={<CompareResultsPage />} />
              <Route path="/reports" element={<ReportsCenterPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="/developer" element={<DeveloperDocsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/help" element={<HelpCenterPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              <Route path="/privacy" element={<LegalPage kind="privacy" />} />
              <Route path="/terms" element={<LegalPage kind="terms" />} />
              <Route path="/disclaimer" element={<LegalPage kind="disclaimer" />} />

              <Route path="/admin" element={<AdminPage />} />
              <Route path="/error" element={<ErrorPage />} />

              {/* Localized routes across 50 languages: /{lang}, /{lang}/{category}, /{lang}/{category}/{slug} */}
              <Route path="/:lang" element={<LangGuard><HomePage /></LangGuard>} />
              <Route path="/:lang/calculators" element={<LangGuard><CalculatorsDirectoryPage mode="all" /></LangGuard>} />
              <Route path="/:lang/:category" element={<LangGuard><CalculatorsDirectoryPage mode="categories" /></LangGuard>} />
              <Route path="/:lang/:category/:slug" element={<LangGuard><CalculatorDetailPage /></LangGuard>} />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </StudioErrorBoundary>
        </AppShell>
      </StudioProvider>
    </HashRouter>
  );
}
