import React, { useState } from 'react';
import { Layers, Menu, Moon, Search, Sparkles, Sun, X } from 'lucide-react';
import { NAV_TABS, NavTab } from '../data/spentaManifest';
import { useTheme } from '../context/ThemeContext';
import { useStack } from '../store/StackContext';
import { SpentaLogo } from './SpentaLogo';

export function Navbar() {
  const { theme, paletteMode, toggleTheme } = useTheme();
  const {
    activeTab,
    setActiveTab,
    selectedIds,
    drawerOpen,
    setDrawerOpen,
    setCommandPaletteOpen,
    setAiAssistantOpen,
  } = useStack();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 h-14 bg-white/85 dark:bg-[#09090B]/85 backdrop-blur-md text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-white/[0.08] transition-colors no-print">
      <div className="max-w-[1440px] mx-auto px-3.5 sm:px-6 h-full flex items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark + Subtle Hairline Divider */}
        <button
          type="button"
          onClick={() => handleSelectTab('App Vault')}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer focus:outline-none"
          aria-label="Spenta Sovereign OS Home"
        >
          <SpentaLogo className="h-7" tone={theme === 'dark' ? 'dark-bg' : 'light-bg'} />
          <span className="hidden 2xl:block h-4 w-px bg-zinc-200 dark:bg-white/15" />
          <span className="hidden 2xl:inline-block text-[11px] font-mono font-medium tracking-[0.12em] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
            SOVEREIGN OS
          </span>
        </button>

        {/* Zone 2: 7 Clean Single-Line Navigation Tabs */}
        <nav
          aria-label="Primary portal navigation"
          className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar"
        >
          {NAV_TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleSelectTab(tab)}
                className={`relative whitespace-nowrap shrink-0 px-2.5 xl:px-3 py-1.5 rounded-md text-xs xl:text-[13px] font-medium transition-colors cursor-pointer ${
                  active
                    ? 'text-zinc-950 dark:text-zinc-50 bg-zinc-100 dark:bg-white/[0.07]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100/70 dark:hover:bg-white/[0.04]'
                }`}
              >
                {tab}
                {active && (
                  <span className="absolute inset-x-2.5 -bottom-[11px] h-[2px] bg-emerald-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Command Palette + Stone/Nocturnal Theme Toggle + Primary Stack Composer CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md bg-zinc-100 dark:bg-[#18181B] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/20 text-zinc-600 dark:text-zinc-300 text-xs transition-colors cursor-pointer whitespace-nowrap"
            aria-label="Open Command Palette (Cmd+K)"
            title="Command Palette (⌘K)"
          >
            <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span className="hidden xl:inline text-zinc-500 dark:text-zinc-400">Search…</span>
            <kbd className="hidden sm:inline-block font-mono text-[10px] text-zinc-500 dark:text-zinc-400 bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-white/10 px-1 py-0.5 rounded leading-none">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-2 rounded-md bg-zinc-100 dark:bg-[#18181B] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/20 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            aria-label={
              paletteMode === 'nocturnal' ? 'Switch to Stone light theme' : 'Switch to Nocturnal dark theme'
            }
            title={
              paletteMode === 'nocturnal'
                ? 'Active: Nocturnal (Click for Stone)'
                : 'Active: Stone (Click for Nocturnal)'
            }
          >
            {paletteMode === 'nocturnal' ? (
              <Sun className="w-3.5 h-3.5" strokeWidth={1.5} />
            ) : (
              <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
            <span className="hidden xl:inline">
              {paletteMode === 'nocturnal' ? 'Nocturnal' : 'Stone'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3.5 rounded-md bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Layers className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span className="hidden sm:inline">Stack Composer</span>
            <span className="sm:hidden">Stack</span>
            <span className="font-mono tabular-nums bg-black/25 px-1.5 py-0.5 rounded text-[11px] leading-none">
              {selectedIds.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <Menu className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#0C0E10] px-4 py-3 space-y-3 shadow-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {NAV_TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleSelectTab(tab)}
                  className={`px-3 py-2.5 rounded-md text-xs font-medium text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.08] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setCommandPaletteOpen(true);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-zinc-100 dark:bg-[#18181B] border border-zinc-200 dark:border-white/[0.08] text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Command Search</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setAiAssistantOpen(true);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-xs font-medium text-emerald-700 dark:text-emerald-400 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>AI Advisor</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
