'use client';

import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Tag,
  BarChart3,
  Lightbulb,
  Map,
  Download,
  Expand,
} from 'lucide-react';
import type { ToolbarState } from './types';

interface Props {
  toolbar: ToolbarState;
  onToggle: (key: keyof ToolbarState) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResetView: () => void;
  onExport?: () => void;
}

export function WorkflowToolbar({
  toolbar,
  onToggle,
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetView,
  onExport,
}: Props) {
  return (
    <div className="flex items-center gap-ds-1">
      {/* Zoom controls */}
      <ToolbarGroup>
        <ToolbarButton icon={ZoomIn} label="Zoom in" onClick={onZoomIn} />
        <ToolbarButton icon={ZoomOut} label="Zoom out" onClick={onZoomOut} />
        <ToolbarButton icon={Maximize} label="Fit to screen" onClick={onFitView} />
        <ToolbarButton icon={RotateCcw} label="Reset view" onClick={onResetView} />
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Toggle controls */}
      <ToolbarGroup>
        <ToolbarToggle
          icon={Tag}
          label="Labels"
          active={toolbar.showLabels}
          onClick={() => onToggle('showLabels')}
        />
        <ToolbarToggle
          icon={BarChart3}
          label="Metrics"
          active={toolbar.showMetrics}
          onClick={() => onToggle('showMetrics')}
        />
        <ToolbarToggle
          icon={Lightbulb}
          label="Insights"
          active={toolbar.showInsights}
          onClick={() => onToggle('showInsights')}
        />
        <ToolbarToggle
          icon={Map}
          label="Minimap"
          active={toolbar.showMinimap}
          onClick={() => onToggle('showMinimap')}
        />
      </ToolbarGroup>

      {onExport && (
        <>
          <ToolbarDivider />
          <ToolbarButton icon={Download} label="Export" onClick={onExport} />
        </>
      )}
    </div>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarDivider() {
  return <span className="w-px h-5 bg-gray-200 mx-1" />;
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex items-center justify-center w-7 h-7 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function ToolbarToggle({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={`${active ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
      className={`flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-medium transition-colors ${
        active
          ? 'text-brand-700 bg-brand-50 hover:bg-brand-100'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
