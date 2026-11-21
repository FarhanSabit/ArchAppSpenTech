import React from 'react';
import { SPENTA_CONTACT_EMAIL } from './data/spentaManifest';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { StackProvider, useStack } from './store/StackContext';
import { Navbar } from './components/Navbar';
import { StackComposerDrawer } from './components/StackComposerDrawer';
import { SpentaBrainVault } from './components/SpentaBrainVault';
import { InfographicsView } from './components/InfographicsView';
import { FinancialsView } from './components/FinancialsView';
import { SpentaCoreView } from './components/SpentaCoreView';
import { TheBrainView } from './components/TheBrainView';
import { PitchDeckView } from './components/PitchDeckView';
import { ResourcesView } from './components/ResourcesView';
import { SpentaLogo } from './components/SpentaLogo';
import { SpentaAiAssistant } from './components/SpentaAiAssistant';
import { GlobalSearchBar } from './components/GlobalSearchBar';

function PortalShell() {
  const { activeTab, setActiveTab } = useStack();
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 print:bg-white print:text-zinc-950 print:min-h-0 flex flex-col overflow-x-hidden print:overflow-visible transition-colors duration-150">
      <Navbar />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3.5 sm:px-6 py-5 sm:py-6 print:max-w-none print:p-0">
        {activeTab === 'App Vault' && <SpentaBrainVault />}
        {activeTab === 'Infographics' && <InfographicsView />}
        {activeTab === 'Financials' && <FinancialsView />}
        {activeTab === 'Spenta Core' && <SpentaCoreView />}
        {activeTab === 'The Brain' && <TheBrainView />}
        {activeTab === 'Pitch Deck' && <PitchDeckView />}
        {activeTab === 'Resources' && <ResourcesView />}
      </main>

      <footer className="bg-white dark:bg-[#09090B] text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-white/[0.08] mt-10 no-print">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <SpentaLogo className="h-6" tone={theme === 'dark' ? 'dark-bg' : 'light-bg'} />
            <span className="h-3.5 w-px bg-zinc-200 dark:bg-white/10 shrink-0" />
            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              Sovereign AI · ERP · Fintech · Voice · Spatial XR
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
            <span>San Jose · Australia · 20-FTE Dhaka R&amp;D Hub</span>
            <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('Resources');
                window.setTimeout(() => {
                  document
                    .getElementById('spenta-proposal-form')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }, 80);
              }}
              className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {SPENTA_CONTACT_EMAIL}
            </button>
          </div>
        </div>
      </footer>

      <GlobalSearchBar />
      <StackComposerDrawer />
      <SpentaAiAssistant />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <StackProvider>
        <PortalShell />
      </StackProvider>
    </ThemeProvider>
  );
}
