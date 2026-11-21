import React, { Component, Suspense } from 'react';
import { BRAIN_HUBS } from '../../data/spentaManifest';

const LazySovereignBrain3DCanvas = React.lazy(() => import('./SovereignBrain3DCanvas'));

interface SovereignBrain3DProps {
  compact?: boolean;
  onSelectHub?: (hubId: string) => void;
  selectedHubId?: string | null;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ThreeErrorBoundary extends Component<
  { children: React.ReactNode; onSelectHub?: (hubId: string) => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onSelectHub?: (hubId: string) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[420px] rounded-xl bg-[#07130F] text-white p-6 flex flex-col justify-center items-center text-center">
          <div className="text-xs font-mono uppercase tracking-wider text-[#6EE7B7] mb-1">
            3D WebGL Renderer Unavailable
          </div>
          <h3 className="text-base font-bold">Spenta Sovereign Neural Core (Interactive Fallback)</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-md">
            Select any of the 8 Sovereign Brain hubs below to inspect capabilities and toggle modules.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 w-full max-w-2xl">
            {BRAIN_HUBS.map((hub) => (
              <button
                key={hub.id}
                type="button"
                onClick={() => this.props.onSelectHub?.(hub.id)}
                className="p-2.5 rounded-lg bg-[#0C1F18] border border-emerald-800/60 hover:border-[#1EB56A] text-left cursor-pointer"
              >
                <div className="text-[10px] font-mono text-[#6EE7B7]">HUB {hub.num}</div>
                <div className="text-xs font-semibold text-white mt-0.5">{hub.label}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function SovereignBrain3D(props: SovereignBrain3DProps) {
  return (
    <ThreeErrorBoundary onSelectHub={props.onSelectHub}>
      <Suspense
        fallback={
          <div className="w-full h-full min-h-[420px] rounded-xl bg-[#07130F] text-slate-300 flex flex-col items-center justify-center gap-2 font-mono text-xs">
            <div className="w-8 h-8 rounded-full border-2 border-[#1EB56A] border-t-transparent animate-spin" />
            <span>Initializing 3D Sovereign Neural Core…</span>
          </div>
        }
      >
        <LazySovereignBrain3DCanvas {...props} />
      </Suspense>
    </ThreeErrorBoundary>
  );
}
