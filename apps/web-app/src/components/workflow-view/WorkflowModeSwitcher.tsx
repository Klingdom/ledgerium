'use client';

import { Workflow, GitBranch, Monitor } from 'lucide-react';
import type { WorkflowViewMode } from './types';
import { VIEW_MODE_LABELS } from './types';

const MODE_ICONS: Record<WorkflowViewMode, React.ElementType> = {
  flow: Workflow,
  variants: GitBranch,
  systems: Monitor,
};

const MODES: WorkflowViewMode[] = ['flow', 'variants', 'systems'];

interface Props {
  activeMode: WorkflowViewMode;
  onModeChange: (mode: WorkflowViewMode) => void;
}

export function WorkflowModeSwitcher({ activeMode, onModeChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-lg">
      {MODES.map(mode => {
        const Icon = MODE_ICONS[mode];
        const { label } = VIEW_MODE_LABELS[mode];
        const isActive = activeMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
              isActive
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title={VIEW_MODE_LABELS[mode].description}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
