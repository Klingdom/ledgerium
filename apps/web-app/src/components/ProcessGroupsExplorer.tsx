'use client';

/**
 * ProcessGroupsExplorer — Process Intelligence Interface
 *
 * A layered intelligence explorer that makes workflow repetition, variants,
 * families, possible matches, and shared components visually obvious.
 *
 * Zones:
 * 1. Header / context bar with KPIs
 * 2. Process Family explorer (expandable family cards)
 * 3. Exact Group detail panel (right side / expanded)
 * 4. Variant analysis (inline within group detail)
 * 5. Shared Components panel
 * 6. Relationship / explanation panel
 * 7. Filters & controls
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Boxes,
  ChevronRight,
  ChevronDown,
  Clock,
  GitBranch,
  Target,
  AlertTriangle,
  Filter,
  X,
  ArrowUpDown,
  Layers,
  Zap,
  ShieldCheck,
  Shield,
  Eye,
  Puzzle,
  ArrowRight,
  Info,
  TrendingUp,
  Activity,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Workflow,
} from 'lucide-react';
import { formatDuration, formatDateRelative, formatConfidence } from '@/lib/format';
import { track } from '@/lib/analytics';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProcessDefinitionWorkflow {
  id: string;
  title: string;
  durationMs: number;
  stepCount: number;
  createdAt: string;
}

interface ProcessDefinitionInsight {
  id: string;
  insightType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
}

interface ProcessDefinition {
  id: string;
  canonicalName: string;
  description: string | null;
  pathSignature: string;
  runCount: number;
  variantCount: number;
  avgDurationMs: number;
  medianDurationMs: number;
  stabilityScore: number | null;
  confidenceScore: number | null;
  analyzedAt: string;
  workflows: ProcessDefinitionWorkflow[];
  insights: ProcessDefinitionInsight[];
  intelligence: Record<string, unknown> | null;
  // New hierarchy fields
  familyId?: string | null;
  normalizedName?: string | null;
  groupType?: string;
  startAnchor?: string | null;
  endAnchor?: string | null;
  confidenceBand?: string | null;
  explanationJson?: string | null;
  systems?: string | null;
  nameSignature?: string | null;
  stepSignatureHash?: string | null;
  metricsJson?: string | null;
}

type SortOption = 'runs' | 'confidence' | 'variation' | 'duration' | 'automation' | 'analyzed';
type FilterBand = '' | 'verified' | 'high_confidence' | 'moderate_confidence' | 'low_confidence' | 'possible_match';

interface ProcessGroupsExplorerProps {
  definitions: ProcessDefinition[];
  isLoading: boolean;
  isRunningAnalysis: boolean;
  onRunAnalysis: () => void;
  error?: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'runs', label: 'Most Runs' },
  { value: 'confidence', label: 'Highest Confidence' },
  { value: 'variation', label: 'Highest Variation' },
  { value: 'duration', label: 'Longest Duration' },
  { value: 'analyzed', label: 'Recently Analyzed' },
];

const CONFIDENCE_FILTERS: { value: FilterBand; label: string }[] = [
  { value: '', label: 'All Confidence' },
  { value: 'verified', label: 'Verified' },
  { value: 'high_confidence', label: 'High Confidence' },
  { value: 'moderate_confidence', label: 'Moderate' },
  { value: 'low_confidence', label: 'Low Confidence' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProcessGroupsExplorer({
  definitions,
  isLoading,
  isRunningAnalysis,
  onRunAnalysis,
  error,
}: ProcessGroupsExplorerProps) {
  const [sortBy, setSortBy] = useState<SortOption>('runs');
  const [confidenceFilter, setConfidenceFilter] = useState<FilterBand>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // ── Computed data ─────────────────────────────────────────────────────────

  const { families, standaloneGroups, kpis } = useMemo(() => {
    return computeHierarchy(definitions);
  }, [definitions]);

  const filteredFamilies = useMemo(() => {
    let result = [...families];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.groups.some(g => g.canonicalName.toLowerCase().includes(q)),
      );
    }
    if (confidenceFilter) {
      result = result.filter(f =>
        f.groups.some(g => getConfidenceBand(g.confidenceScore) === confidenceFilter),
      );
    }
    return sortFamilies(result, sortBy);
  }, [families, searchQuery, confidenceFilter, sortBy]);

  const filteredStandalone = useMemo(() => {
    let result = [...standaloneGroups];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => g.canonicalName.toLowerCase().includes(q));
    }
    if (confidenceFilter) {
      result = result.filter(g => getConfidenceBand(g.confidenceScore) === confidenceFilter);
    }
    return sortGroups(result, sortBy);
  }, [standaloneGroups, searchQuery, confidenceFilter, sortBy]);

  const selectedGroup = useMemo(() => {
    return definitions.find(d => d.id === selectedGroupId) ?? null;
  }, [definitions, selectedGroupId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function toggleFamily(familyKey: string) {
    setExpandedFamilies(prev => {
      const next = new Set(prev);
      if (next.has(familyKey)) next.delete(familyKey);
      else next.add(familyKey);
      return next;
    });
  }

  function selectGroup(groupId: string) {
    setSelectedGroupId(prev => prev === groupId ? null : groupId);
    track({ event: 'tab_switched', tab: `process_group_${groupId}` });
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw className="h-6 w-6 text-gray-300 animate-spin mx-auto mb-3" />
          <p className="text-ds-sm text-gray-400">Loading process intelligence...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="card p-12 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
        <h3 className="mt-3 text-ds-sm font-medium text-gray-900">Analysis Error</h3>
        <p className="mt-1 text-ds-sm text-gray-500 max-w-md mx-auto">{error}</p>
        <button onClick={onRunAnalysis} disabled={isRunningAnalysis} className="btn-secondary mt-4 gap-1.5">
          <RefreshCw className={`h-4 w-4 ${isRunningAnalysis ? 'animate-spin' : ''}`} />
          Retry Analysis
        </button>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (definitions.length === 0) {
    return <EmptyState isRunningAnalysis={isRunningAnalysis} onRunAnalysis={onRunAnalysis} />;
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-ds-4">
      {/* ═══ HEADER / CONTEXT BAR ═══ */}
      <ContextHeader
        kpis={kpis}
        lastAnalyzed={definitions[0]?.analyzedAt ?? null}
        isRunningAnalysis={isRunningAnalysis}
        onRunAnalysis={onRunAnalysis}
      />

      {/* ═══ KPI STRIP ═══ */}
      <KpiStrip kpis={kpis} />

      {/* ═══ FILTERS & CONTROLS ═══ */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        confidenceFilter={confidenceFilter}
        onConfidenceChange={setConfidenceFilter}
        onClearFilters={() => { setSearchQuery(''); setSortBy('runs'); setConfidenceFilter(''); }}
        hasActiveFilters={searchQuery !== '' || confidenceFilter !== ''}
      />

      {/* ═══ MAIN CONTENT: FAMILY EXPLORER + DETAIL ═══ */}
      <div className={`grid gap-ds-4 ${selectedGroup ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>
        {/* Left: Family explorer */}
        <div className={selectedGroup ? 'lg:col-span-3' : ''}>
          {/* Process Families */}
          {filteredFamilies.length > 0 && (
            <div className="space-y-ds-2 mb-ds-4">
              <h3 className="ds-section-label px-1">Process Families</h3>
              {filteredFamilies.map(family => (
                <FamilyCard
                  key={family.key}
                  family={family}
                  isExpanded={expandedFamilies.has(family.key)}
                  onToggle={() => toggleFamily(family.key)}
                  selectedGroupId={selectedGroupId}
                  onSelectGroup={selectGroup}
                />
              ))}
            </div>
          )}

          {/* Standalone Groups */}
          {filteredStandalone.length > 0 && (
            <div className="space-y-ds-2">
              <h3 className="ds-section-label px-1">
                {filteredFamilies.length > 0 ? 'Standalone Processes' : 'Process Groups'}
              </h3>
              {filteredStandalone.map(group => (
                <GroupRow
                  key={group.id}
                  group={group}
                  isSelected={selectedGroupId === group.id}
                  onSelect={() => selectGroup(group.id)}
                  showFamilyBadge={false}
                />
              ))}
            </div>
          )}

          {/* No results */}
          {filteredFamilies.length === 0 && filteredStandalone.length === 0 && (
            <div className="card p-10 text-center">
              <Filter className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-ds-sm text-gray-500">No process groups match your filters.</p>
              <button
                onClick={() => { setSearchQuery(''); setConfidenceFilter(''); }}
                className="btn-secondary mt-3 gap-1.5 text-ds-xs"
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Right: Detail panel */}
        {selectedGroup && (
          <div className="lg:col-span-2">
            <GroupDetailPanel
              group={selectedGroup}
              onClose={() => setSelectedGroupId(null)}
            />
          </div>
        )}
      </div>

      {/* ═══ LOW-CONFIDENCE REVIEW QUEUE ═══ */}
      {kpis.lowConfidenceCount > 0 && !confidenceFilter && (
        <LowConfidenceReviewQueue
          definitions={definitions}
          onSelectGroup={selectGroup}
          selectedGroupId={selectedGroupId}
        />
      )}
    </div>
  );
}

// ─── Low-Confidence Review Queue ─────────────────────────────────────────────

function LowConfidenceReviewQueue({
  definitions,
  onSelectGroup,
  selectedGroupId,
}: {
  definitions: ProcessDefinition[];
  onSelectGroup: (id: string) => void;
  selectedGroupId: string | null;
}) {
  const lowConfidence = useMemo(() =>
    definitions
      .filter(d => d.confidenceScore !== null && d.confidenceScore < 0.55)
      .sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0)),
    [definitions],
  );

  const emerging = useMemo(() =>
    definitions
      .filter(d => d.runCount === 1 && (d.confidenceScore === null || d.confidenceScore < 0.5))
      .slice(0, 5),
    [definitions],
  );

  if (lowConfidence.length === 0 && emerging.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-ds-4 py-ds-3 border-b border-gray-100 bg-amber-50/30">
        <div className="flex items-center gap-ds-2">
          <Eye className="h-4 w-4 text-amber-600" />
          <h3 className="text-ds-sm font-semibold text-gray-900">Needs Review</h3>
          <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
            {lowConfidence.length + emerging.length}
          </span>
        </div>
        <p className="text-[10px] text-gray-500 mt-0.5">
          These workflows need more runs or manual review to classify confidently.
        </p>
      </div>

      <div className="divide-y divide-gray-50">
        {/* Low-confidence groups */}
        {lowConfidence.slice(0, 5).map(group => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            className={`w-full text-left flex items-center gap-ds-3 px-ds-4 py-ds-2.5 hover:bg-gray-50 transition-colors ${
              selectedGroupId === group.id ? 'bg-brand-50' : ''
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-ds-xs text-gray-900 font-medium truncate">{group.canonicalName}</p>
                <span className="ds-tag text-[9px] bg-amber-100 text-amber-700">Low Confidence</span>
              </div>
              <p className="text-[10px] text-gray-400">
                {group.runCount} run{group.runCount !== 1 ? 's' : ''} &middot; {formatConfidence(group.confidenceScore ?? 0)} confidence
              </p>
            </div>
          </button>
        ))}

        {/* Emerging groups (single run, needs more data) */}
        {emerging.map(group => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            className={`w-full text-left flex items-center gap-ds-3 px-ds-4 py-ds-2.5 hover:bg-gray-50 transition-colors ${
              selectedGroupId === group.id ? 'bg-brand-50' : ''
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-ds-xs text-gray-900 font-medium truncate">{group.canonicalName}</p>
                <span className="ds-tag text-[9px] bg-gray-100 text-gray-600">Emerging</span>
              </div>
              <p className="text-[10px] text-gray-400">
                Single run &middot; Needs more recordings to classify
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Context Header ──────────────────────────────────────────────────────────

function ContextHeader({
  kpis,
  lastAnalyzed,
  isRunningAnalysis,
  onRunAnalysis,
}: {
  kpis: KpiData;
  lastAnalyzed: string | null;
  isRunningAnalysis: boolean;
  onRunAnalysis: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-ds-4">
      <div>
        <div className="flex items-center gap-ds-2">
          <Boxes className="h-5 w-5 text-brand-600" />
          <h2 className="text-ds-lg font-semibold text-gray-900">Process Groups</h2>
        </div>
        <p className="text-ds-xs text-gray-500 mt-1">
          {kpis.totalWorkflows} workflow{kpis.totalWorkflows !== 1 ? 's' : ''} analyzed into{' '}
          {kpis.verifiedGroups} verified group{kpis.verifiedGroups !== 1 ? 's' : ''} across{' '}
          {kpis.totalFamilies} famil{kpis.totalFamilies !== 1 ? 'ies' : 'y'}
          {lastAnalyzed && (
            <span className="text-gray-400"> &middot; Last analyzed {formatDateRelative(lastAnalyzed)}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onRunAnalysis}
          disabled={isRunningAnalysis}
          className="btn-secondary gap-1.5 text-ds-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRunningAnalysis ? 'animate-spin' : ''}`} />
          {isRunningAnalysis ? 'Analyzing...' : 'Re-analyze'}
        </button>
      </div>
    </div>
  );
}

// ─── KPI Strip ───────────────────────────────────────────────────────────────

interface KpiData {
  totalWorkflows: number;
  verifiedGroups: number;
  totalFamilies: number;
  totalVariants: number;
  sharedComponents: number;
  avgStandardization: number | null;
  lowConfidenceCount: number;
}

function KpiStrip({ kpis }: { kpis: KpiData }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-ds-2">
      <KpiCard icon={CheckCircle2} label="Verified Groups" value={kpis.verifiedGroups} color="text-emerald-600" />
      <KpiCard icon={Layers} label="Process Families" value={kpis.totalFamilies} color="text-brand-600" />
      <KpiCard icon={GitBranch} label="Variants" value={kpis.totalVariants} color="text-violet-600" />
      <KpiCard icon={Puzzle} label="Shared Components" value={kpis.sharedComponents} color="text-cyan-600" />
      <KpiCard
        icon={TrendingUp}
        label="Avg Standardization"
        value={kpis.avgStandardization !== null ? `${kpis.avgStandardization}%` : '—'}
        color="text-blue-600"
      />
      <KpiCard icon={Zap} label="Automation Candidates" value={kpis.verifiedGroups} color="text-amber-600" />
      <KpiCard
        icon={HelpCircle}
        label="Needs Review"
        value={kpis.lowConfidenceCount}
        color={kpis.lowConfidenceCount > 0 ? 'text-amber-600' : 'text-gray-400'}
      />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="card px-ds-3 py-ds-2.5">
      <div className="flex items-center gap-ds-2">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-ds-lg font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

// ─── Filter Bar ──────────────────────────────────────────────────────────────

function FilterBar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  confidenceFilter,
  onConfidenceChange,
  onClearFilters,
  hasActiveFilters,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  sortBy: SortOption;
  onSortChange: (v: SortOption) => void;
  confidenceFilter: FilterBand;
  onConfidenceChange: (v: FilterBand) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-ds-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[320px]">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search families or groups..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-ds-xs border border-gray-200 rounded-ds-md bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
        />
      </div>

      {/* Confidence filter */}
      <select
        value={confidenceFilter}
        onChange={e => onConfidenceChange(e.target.value as FilterBand)}
        className="px-3 py-2 text-ds-xs border border-gray-200 rounded-ds-md bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/20"
      >
        {CONFIDENCE_FILTERS.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Sort */}
      <div className="flex items-center gap-1.5">
        <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value as SortOption)}
          className="px-3 py-2 text-ds-xs border border-gray-200 rounded-ds-md bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/20"
        >
          {SORT_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button onClick={onClearFilters} className="text-ds-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}

// ─── Family Card ─────────────────────────────────────────────────────────────

interface FamilyGroup {
  key: string;
  name: string;
  groups: ProcessDefinition[];
  totalRuns: number;
  avgDurationMs: number;
  topSystems: string[];
  commonPathPct: number;
  avgConfidence: number | null;
  totalVariants: number;
}

function FamilyCard({
  family,
  isExpanded,
  onToggle,
  selectedGroupId,
  onSelectGroup,
}: {
  family: FamilyGroup;
  isExpanded: boolean;
  onToggle: () => void;
  selectedGroupId: string | null;
  onSelectGroup: (id: string) => void;
}) {
  const bandInfo = getConfidenceBandInfo(family.avgConfidence);

  return (
    <div className="card overflow-hidden">
      {/* Family header — clickable to expand */}
      <button
        onClick={onToggle}
        className="w-full px-ds-4 py-ds-3 flex items-center gap-ds-3 hover:bg-gray-50/50 transition-colors text-left"
      >
        {/* Expand/collapse chevron */}
        <div className="flex-shrink-0">
          {isExpanded
            ? <ChevronDown className="h-4 w-4 text-gray-400" />
            : <ChevronRight className="h-4 w-4 text-gray-400" />
          }
        </div>

        {/* Family name + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-ds-2">
            <Layers className="h-4 w-4 text-brand-600 flex-shrink-0" />
            <h3 className="text-ds-sm font-semibold text-gray-900 truncate">{family.name}</h3>
            <span className={`ds-tag text-[10px] ${bandInfo.className}`}>
              {bandInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-ds-3 mt-1 text-[10px] text-gray-400">
            <span>{family.groups.length} exact group{family.groups.length !== 1 ? 's' : ''}</span>
            <span>&middot;</span>
            <span>{family.totalRuns} run{family.totalRuns !== 1 ? 's' : ''}</span>
            <span>&middot;</span>
            <span>{formatDuration(family.avgDurationMs)} avg</span>
            {family.totalVariants > 1 && (
              <>
                <span>&middot;</span>
                <span className="flex items-center gap-0.5">
                  <GitBranch className="h-3 w-3" /> {family.totalVariants} variant{family.totalVariants !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Top systems */}
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          {family.topSystems.slice(0, 3).map(sys => (
            <span key={sys} className="ds-tag ds-tag-neutral text-[10px]">{sys}</span>
          ))}
        </div>
      </button>

      {/* Expanded: child exact groups */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/30">
          {family.groups.map(group => (
            <GroupRow
              key={group.id}
              group={group}
              isSelected={selectedGroupId === group.id}
              onSelect={() => onSelectGroup(group.id)}
              showFamilyBadge={false}
              indent
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Group Row ───────────────────────────────────────────────────────────────

function GroupRow({
  group,
  isSelected,
  onSelect,
  showFamilyBadge,
  indent = false,
}: {
  group: ProcessDefinition;
  isSelected: boolean;
  onSelect: () => void;
  showFamilyBadge: boolean;
  indent?: boolean;
}) {
  const bandInfo = getConfidenceBandInfo(group.confidenceScore);
  const stabilityInfo = getStabilityInfo(group.stabilityScore);
  const standardization = extractStandardization(group.intelligence);
  const warningCount = group.insights.filter(i => i.severity === 'warning').length;
  const criticalCount = group.insights.filter(i => i.severity === 'critical').length;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left transition-colors flex items-center gap-ds-3 px-ds-4 py-ds-3 ${
        indent ? 'pl-12' : ''
      } ${
        isSelected
          ? 'bg-brand-50 border-l-2 border-brand-600'
          : 'hover:bg-gray-50 border-l-2 border-transparent'
      }`}
    >
      {/* Confidence dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${bandInfo.dotColor}`} />

      {/* Name + metrics */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-ds-2">
          <p className={`text-ds-sm font-medium truncate ${isSelected ? 'text-brand-700' : 'text-gray-900'}`}>
            {group.canonicalName}
          </p>
          <span className={`ds-tag text-[9px] ${bandInfo.className}`}>{bandInfo.shortLabel}</span>
          {stabilityInfo && (
            <span className={`ds-tag text-[9px] ${stabilityInfo.className}`}>{stabilityInfo.label}</span>
          )}
        </div>
        <div className="flex items-center gap-ds-3 mt-0.5 text-[10px] text-gray-400">
          <span>{group.runCount} run{group.runCount !== 1 ? 's' : ''}</span>
          {group.variantCount > 1 && (
            <span className="flex items-center gap-0.5">
              <GitBranch className="h-2.5 w-2.5" /> {group.variantCount}
            </span>
          )}
          <span>{formatDuration(group.avgDurationMs)}</span>
          {standardization && (
            <span className={`font-medium ${standardization.color}`}>Std: {standardization.score}</span>
          )}
          {(criticalCount > 0 || warningCount > 0) && (
            <span className="flex items-center gap-1">
              {criticalCount > 0 && <span className="text-red-500">{criticalCount} critical</span>}
              {warningCount > 0 && <span className="text-amber-500">{warningCount} warning</span>}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-brand-600' : 'text-gray-300'}`} />
    </button>
  );
}

// ─── Group Detail Panel ──────────────────────────────────────────────────────

function GroupDetailPanel({
  group,
  onClose,
}: {
  group: ProcessDefinition;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'variants' | 'components' | 'explanation'>('overview');
  const bandInfo = getConfidenceBandInfo(group.confidenceScore);
  const stabilityInfo = getStabilityInfo(group.stabilityScore);
  const standardization = extractStandardization(group.intelligence);
  const explanation = group.explanationJson ? safeJsonParse(group.explanationJson) as Record<string, unknown> | null : null;
  const extendedMetrics = group.metricsJson ? safeJsonParse(group.metricsJson) as Record<string, unknown> | null : null;
  const systemsList = group.systems ? safeJsonParse(group.systems) as string[] : [];
  const intelligence = group.intelligence as Record<string, unknown> | null;
  const variants = intelligence?.variants as { variants?: unknown[] } | undefined;
  const variantList = variants?.variants ?? [];

  return (
    <div className="card overflow-hidden sticky top-4">
      {/* Detail header */}
      <div className="px-ds-4 py-ds-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-start justify-between gap-ds-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-ds-2 mb-1">
              <span className={`ds-tag text-[9px] ${bandInfo.className}`}>{bandInfo.label}</span>
              {stabilityInfo && (
                <span className={`ds-tag text-[9px] ${stabilityInfo.className}`}>{stabilityInfo.label}</span>
              )}
            </div>
            <h3 className="text-ds-sm font-semibold text-gray-900 truncate">{group.canonicalName}</h3>
            {group.description && (
              <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{group.description}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(['overview', 'variants', 'components', 'explanation'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-ds-3 py-ds-2 text-[10px] font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'text-brand-600 border-brand-600'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'variants' ? 'Variants' : tab === 'components' ? 'Components' : 'Why Grouped'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-ds-4 py-ds-3 max-h-[600px] overflow-y-auto">
        {activeTab === 'overview' && (
          <OverviewTab
            group={group}
            systemsList={systemsList}
            standardization={standardization}
            extendedMetrics={extendedMetrics}
          />
        )}
        {activeTab === 'variants' && (
          <VariantsTab group={group} variantList={variantList} />
        )}
        {activeTab === 'components' && (
          <ComponentsTab group={group} />
        )}
        {activeTab === 'explanation' && (
          <ExplanationTab group={group} explanation={explanation} />
        )}
      </div>

      {/* Footer: link to full analytics */}
      <div className="px-ds-4 py-ds-2.5 border-t border-gray-100 bg-gray-50/50">
        <Link
          href={`/analytics/process/${group.id}`}
          className="text-ds-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
        >
          View full analysis <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({
  group,
  systemsList,
  standardization,
  extendedMetrics,
}: {
  group: ProcessDefinition;
  systemsList: string[];
  standardization: { score: number; level: string; color: string } | null;
  extendedMetrics: Record<string, unknown> | null;
}) {
  const metrics = [
    { label: 'Runs', value: group.runCount },
    { label: 'Variants', value: group.variantCount },
    { label: 'Avg Duration', value: formatDuration(group.avgDurationMs) },
    { label: 'Median Duration', value: formatDuration(group.medianDurationMs) },
    { label: 'Confidence', value: group.confidenceScore !== null ? formatConfidence(group.confidenceScore) : '—' },
    { label: 'Stability', value: group.stabilityScore !== null ? `${Math.round(group.stabilityScore * 100)}%` : '—' },
  ];

  if (standardization) {
    metrics.push({ label: 'Standardization', value: `${standardization.score}/100` });
  }

  const commonPathPct = extendedMetrics?.commonPathPct as number | undefined;
  if (commonPathPct !== undefined) {
    metrics.push({ label: 'Common Path', value: `${Math.round(commonPathPct * 100)}%` });
  }

  const anomalyRate = extendedMetrics?.anomalyRate as number | undefined;
  if (anomalyRate !== undefined && anomalyRate > 0) {
    metrics.push({ label: 'Anomaly Rate', value: `${Math.round(anomalyRate * 100)}%` });
  }

  return (
    <div className="space-y-ds-3">
      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-ds-2">
        {metrics.map(m => (
          <div key={m.label} className="bg-gray-50 rounded-ds-sm px-ds-3 py-ds-2">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{m.label}</p>
            <p className="text-ds-sm font-semibold text-gray-900 mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Systems */}
      {systemsList.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">Systems</p>
          <div className="flex flex-wrap gap-1">
            {systemsList.map(sys => (
              <span key={sys} className="ds-tag ds-tag-neutral text-[10px]">{sys}</span>
            ))}
          </div>
        </div>
      )}

      {/* Start / End anchors */}
      {(group.startAnchor || group.endAnchor) && (
        <div>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">Process Boundary</p>
          <div className="space-y-1">
            {group.startAnchor && (
              <div className="flex items-center gap-ds-2 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-gray-500">Start:</span>
                <span className="text-gray-700 font-mono">{formatAnchor(group.startAnchor)}</span>
              </div>
            )}
            {group.endAnchor && (
              <div className="flex items-center gap-ds-2 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-gray-500">End:</span>
                <span className="text-gray-700 font-mono">{formatAnchor(group.endAnchor)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Path signature preview */}
      {group.pathSignature && (
        <div>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">Step Sequence</p>
          <div className="flex flex-wrap gap-1">
            {group.pathSignature.split(':').filter(Boolean).slice(0, 8).map((step, i) => (
              <span key={i} className="ds-tag ds-tag-neutral text-[9px]">
                {i + 1}. {formatStepCategory(step)}
              </span>
            ))}
            {group.pathSignature.split(':').filter(Boolean).length > 8 && (
              <span className="text-[9px] text-gray-400">+{group.pathSignature.split(':').filter(Boolean).length - 8} more</span>
            )}
          </div>
        </div>
      )}

      {/* Workflow runs in this group */}
      {group.workflows.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">
            Recent Runs ({group.workflows.length})
          </p>
          <div className="space-y-1">
            {group.workflows.slice(0, 5).map(w => (
              <Link
                key={w.id}
                href={`/workflows/${w.id}`}
                className="flex items-center gap-ds-2 px-ds-2 py-1 rounded hover:bg-gray-50 transition-colors group"
              >
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-[10px] text-gray-700 truncate flex-1 group-hover:text-brand-600">{w.title}</span>
                <span className="text-[9px] text-gray-400">{formatDuration(w.durationMs)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Variants Tab ────────────────────────────────────────────────────────────

function VariantsTab({
  group,
  variantList,
}: {
  group: ProcessDefinition;
  variantList: unknown[];
}) {
  if (group.variantCount <= 1 && variantList.length === 0) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
        <p className="text-ds-xs text-gray-500">All runs follow the same path.</p>
        <p className="text-[10px] text-gray-400 mt-1">No variants detected in this process group.</p>
      </div>
    );
  }

  return (
    <div className="space-y-ds-2">
      <p className="text-[10px] text-gray-400">
        {group.variantCount} variant{group.variantCount !== 1 ? 's' : ''} detected across {group.runCount} runs.
      </p>
      {variantList.map((v, i) => {
        const variant = v as Record<string, unknown>;
        const isStandard = variant.isStandardPath === true;
        const frequency = typeof variant.frequency === 'number' ? variant.frequency : 0;
        const runCount = typeof variant.runCount === 'number' ? variant.runCount : 0;
        const sig = variant.pathSignature as { stepCategories?: string[] } | undefined;
        const steps = sig?.stepCategories ?? [];

        return (
          <div key={i} className={`rounded-ds-sm border p-ds-3 ${isStandard ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-ds-2">
                <span className={`text-ds-xs font-medium ${isStandard ? 'text-emerald-700' : 'text-gray-700'}`}>
                  {isStandard ? 'Standard Path' : `Variant ${i + 1}`}
                </span>
                {isStandard && (
                  <span className="ds-tag text-[9px] bg-emerald-100 text-emerald-700">Canonical</span>
                )}
              </div>
              <span className="text-[10px] text-gray-400">
                {runCount} run{runCount !== 1 ? 's' : ''} &middot; {Math.round(frequency * 100)}%
              </span>
            </div>

            {/* Step sequence */}
            {steps.length > 0 && (
              <div className="flex flex-wrap gap-0.5 mt-1">
                {steps.slice(0, 6).map((step: string, j: number) => (
                  <span key={j} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {formatStepCategory(step)}
                  </span>
                ))}
                {steps.length > 6 && (
                  <span className="text-[9px] text-gray-400">+{steps.length - 6}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Components Tab ──────────────────────────────────────────────────────────

function ComponentsTab({ group }: { group: ProcessDefinition }) {
  const steps = group.pathSignature?.split(':').filter(Boolean) ?? [];
  const uniqueSteps = [...new Set(steps)];

  if (uniqueSteps.length === 0) {
    return (
      <div className="text-center py-6">
        <Puzzle className="h-6 w-6 text-gray-300 mx-auto mb-2" />
        <p className="text-ds-xs text-gray-500">No shared component data available yet.</p>
        <p className="text-[10px] text-gray-400 mt-1">Run analysis to detect reusable step patterns.</p>
      </div>
    );
  }

  return (
    <div className="space-y-ds-2">
      <p className="text-[10px] text-gray-400">
        Step patterns in this process group. Components appearing across multiple groups are reusable.
      </p>
      {uniqueSteps.map((step, i) => {
        const count = steps.filter(s => s === step).length;
        return (
          <div key={i} className="flex items-center gap-ds-3 px-ds-2 py-1.5 rounded-ds-sm bg-gray-50">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStepColor(step)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-ds-xs text-gray-700 font-medium">{formatStepCategory(step)}</p>
              {count > 1 && (
                <p className="text-[9px] text-gray-400">{count}x in this process</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Explanation Tab ─────────────────────────────────────────────────────────

function ExplanationTab({
  group,
  explanation,
}: {
  group: ProcessDefinition;
  explanation: Record<string, unknown> | null;
}) {
  const supporting = (explanation?.supporting ?? []) as Array<{ code: string; weight: number; detail?: string }>;
  const weaknesses = (explanation?.weaknesses ?? []) as Array<{ code: string; weight: number; detail?: string }>;
  const summary = explanation?.summary as string | undefined;

  return (
    <div className="space-y-ds-3">
      {/* Summary */}
      {summary && (
        <div className="bg-brand-50 rounded-ds-sm px-ds-3 py-ds-2">
          <p className="text-ds-xs text-brand-700">{summary}</p>
        </div>
      )}

      {!summary && supporting.length === 0 && weaknesses.length === 0 && (
        <div className="text-center py-6">
          <Info className="h-6 w-6 text-gray-300 mx-auto mb-2" />
          <p className="text-ds-xs text-gray-500">Explanation data will be available after re-analysis.</p>
          <p className="text-[10px] text-gray-400 mt-1">
            The new scoring engine generates detailed grouping explanations.
          </p>
        </div>
      )}

      {/* Supporting evidence */}
      {supporting.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5">Supporting Evidence</p>
          <div className="space-y-1">
            {supporting.sort((a, b) => b.weight - a.weight).map((entry, i) => (
              <div key={i} className="flex items-start gap-ds-2 px-ds-2 py-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="ds-tag text-[9px] bg-emerald-50 text-emerald-700">{formatExplanationCode(entry.code)}</span>
                  {entry.detail && <p className="text-[10px] text-gray-500 mt-0.5">{entry.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses / caveats */}
      {weaknesses.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5">Caveats</p>
          <div className="space-y-1">
            {weaknesses.sort((a, b) => b.weight - a.weight).map((entry, i) => (
              <div key={i} className="flex items-start gap-ds-2 px-ds-2 py-1">
                <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="ds-tag text-[9px] bg-amber-50 text-amber-700">{formatExplanationCode(entry.code)}</span>
                  {entry.detail && <p className="text-[10px] text-gray-500 mt-0.5">{entry.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence details */}
      <div>
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">Confidence</p>
        <div className="bg-gray-50 rounded-ds-sm px-ds-3 py-ds-2 text-[10px] text-gray-600">
          <p>Score: {group.confidenceScore !== null ? formatConfidence(group.confidenceScore) : 'Not scored'}</p>
          <p>Stability: {group.stabilityScore !== null ? `${Math.round(group.stabilityScore * 100)}%` : 'Not scored'}</p>
          {group.confidenceBand && <p>Band: {formatExplanationCode(group.confidenceBand)}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  isRunningAnalysis,
  onRunAnalysis,
}: {
  isRunningAnalysis: boolean;
  onRunAnalysis: () => void;
}) {
  return (
    <div className="card p-12 text-center">
      <Boxes className="mx-auto h-10 w-10 text-gray-300" />
      <h3 className="mt-3 text-ds-sm font-medium text-gray-900">
        No process groups detected yet
      </h3>
      <p className="mt-1 text-ds-sm text-gray-500 max-w-md mx-auto">
        Process groups are automatically detected when you have multiple workflow recordings.
        Upload more workflows or run analysis to discover recurring patterns.
      </p>
      <button
        onClick={onRunAnalysis}
        disabled={isRunningAnalysis}
        className="btn-primary mt-4 gap-1.5"
      >
        <RefreshCw className={`h-4 w-4 ${isRunningAnalysis ? 'animate-spin' : ''}`} />
        {isRunningAnalysis ? 'Analyzing...' : 'Run Analysis'}
      </button>
    </div>
  );
}

// ─── Hierarchy computation ───────────────────────────────────────────────────

function computeHierarchy(definitions: ProcessDefinition[]): {
  families: FamilyGroup[];
  standaloneGroups: ProcessDefinition[];
  kpis: KpiData;
} {
  // Group definitions by family — first pass: count members per key
  const keyCounts = new Map<string, number>();
  for (const def of definitions) {
    const key = def.familyId ?? def.nameSignature ?? null;
    if (key) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }

  // Second pass: assign to family or standalone (avoids O(n^2) filter)
  const familyMap = new Map<string, ProcessDefinition[]>();
  const standalone: ProcessDefinition[] = [];

  for (const def of definitions) {
    const familyKey = def.familyId ?? def.nameSignature ?? null;
    if (familyKey && (keyCounts.get(familyKey) ?? 0) > 1) {
      if (!familyMap.has(familyKey)) familyMap.set(familyKey, []);
      familyMap.get(familyKey)!.push(def);
    } else {
      standalone.push(def);
    }
  }

  // Build family objects
  const families: FamilyGroup[] = [];
  for (const [key, groups] of familyMap) {
    const totalRuns = groups.reduce((s, g) => s + g.runCount, 0);
    const durations = groups.map(g => g.avgDurationMs).filter((d): d is number => d != null && d > 0);
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : 0;
    const allSystems = new Set<string>();
    for (const g of groups) {
      const sysJson = g.systems ? safeJsonParse(g.systems) as string[] : [];
      sysJson.forEach(s => allSystems.add(s));
      // Fallback: extract from path signature
      if (sysJson.length === 0) {
        g.pathSignature.split(':').filter(Boolean).forEach(s => allSystems.add(s));
      }
    }
    const confidences = groups.map(g => g.confidenceScore).filter((c): c is number => c !== null);
    const avgConf = confidences.length > 0 ? confidences.reduce((s, c) => s + c, 0) / confidences.length : null;
    const totalVariants = groups.reduce((s, g) => s + g.variantCount, 0);

    // Derive family name from longest common prefix or first group name
    const familyName = deriveFamilyName(groups.map(g => g.canonicalName));

    families.push({
      key,
      name: familyName,
      groups,
      totalRuns,
      avgDurationMs: avgDuration,
      topSystems: [...allSystems].slice(0, 5),
      commonPathPct: 0,
      avgConfidence: avgConf,
      totalVariants,
    });
  }

  // KPIs
  const totalWorkflows = definitions.reduce((s, d) => s + d.runCount, 0);
  const verifiedGroups = definitions.length;
  const totalFamilies = families.length;
  const totalVariants = definitions.reduce((s, d) => s + Math.max(d.variantCount, 1), 0);
  const stdScores = definitions.map(d => {
    const std = extractStandardization(d.intelligence);
    return std?.score ?? null;
  }).filter((s): s is number => s !== null);
  const avgStd = stdScores.length > 0
    ? Math.round(stdScores.reduce((s, v) => s + v, 0) / stdScores.length)
    : null;
  const lowConfCount = definitions.filter(d => d.confidenceScore !== null && d.confidenceScore < 0.55).length;

  return {
    families,
    standaloneGroups: standalone,
    kpis: {
      totalWorkflows,
      verifiedGroups,
      totalFamilies,
      totalVariants,
      sharedComponents: 0, // Populated when component detection runs
      avgStandardization: avgStd,
      lowConfidenceCount: lowConfCount,
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getConfidenceBand(score: number | null): string {
  if (score === null) return 'possible_match';
  if (score >= 0.90) return 'verified';
  if (score >= 0.82) return 'high_confidence';
  if (score >= 0.70) return 'moderate_confidence';
  if (score >= 0.55) return 'low_confidence';
  return 'possible_match';
}

function getConfidenceBandInfo(score: number | null): { label: string; shortLabel: string; className: string; dotColor: string } {
  const band = getConfidenceBand(score);
  switch (band) {
    case 'verified':
      return { label: 'Verified', shortLabel: 'Verified', className: 'bg-emerald-100 text-emerald-700', dotColor: 'bg-emerald-500' };
    case 'high_confidence':
      return { label: 'High Confidence', shortLabel: 'High', className: 'bg-blue-100 text-blue-700', dotColor: 'bg-blue-500' };
    case 'moderate_confidence':
      return { label: 'Moderate Confidence', shortLabel: 'Moderate', className: 'bg-amber-100 text-amber-700', dotColor: 'bg-amber-500' };
    case 'low_confidence':
      return { label: 'Low Confidence', shortLabel: 'Low', className: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-400' };
    default:
      return { label: 'Possible Match', shortLabel: 'Possible', className: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' };
  }
}

function getStabilityInfo(score: number | null): { label: string; className: string } | null {
  if (score === null) return null;
  if (score >= 0.8) return { label: 'Stable', className: 'bg-emerald-50 text-emerald-600' };
  if (score >= 0.6) return { label: 'Moderate', className: 'bg-amber-50 text-amber-600' };
  return { label: 'Unstable', className: 'bg-red-50 text-red-600' };
}

function extractStandardization(intelligence: Record<string, unknown> | null): { score: number; level: string; color: string } | null {
  if (!intelligence) return null;
  const std = intelligence.standardization as { score?: number; level?: string } | undefined;
  if (!std?.score) return null;
  const color =
    std.level === 'excellent' ? 'text-emerald-600' :
    std.level === 'good' ? 'text-blue-600' :
    std.level === 'moderate' ? 'text-amber-600' : 'text-red-600';
  return { score: std.score, level: std.level ?? 'unknown', color };
}

function formatStepCategory(category: string): string {
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatAnchor(anchor: string): string {
  if (!anchor) return '—';
  const parts = anchor.split(':').filter(p => p !== '_');
  return parts.length > 0 ? parts.join(' / ') : '—';
}

function formatExplanationCode(code: string): string {
  return code
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getStepColor(step: string): string {
  const colors: Record<string, string> = {
    click_then_navigate: 'bg-teal-400',
    fill_and_submit: 'bg-blue-400',
    repeated_click_dedup: 'bg-orange-400',
    single_action: 'bg-gray-400',
    data_entry: 'bg-violet-400',
    send_action: 'bg-emerald-400',
    file_action: 'bg-yellow-400',
    error_handling: 'bg-red-400',
    annotation: 'bg-purple-400',
  };
  return colors[step] ?? 'bg-gray-300';
}

function deriveFamilyName(names: string[]): string {
  if (names.length === 0) return 'Unknown Family';
  if (names.length === 1) return names[0]!;

  // Find longest common prefix (word-level)
  const tokenized = names.map(n => n.split(/\s+/));
  const minLen = Math.min(...tokenized.map(t => t.length));
  const commonWords: string[] = [];
  for (let i = 0; i < minLen; i++) {
    const word = tokenized[0]![i]!.toLowerCase();
    if (tokenized.every(t => t[i]!.toLowerCase() === word)) {
      commonWords.push(tokenized[0]![i]!);
    } else {
      break;
    }
  }

  if (commonWords.length >= 2) {
    return commonWords.join(' ');
  }

  // Fallback: use the shortest name
  return names.reduce((shortest, n) => n.length < shortest.length ? n : shortest);
}

function sortFamilies(families: FamilyGroup[], sortBy: SortOption): FamilyGroup[] {
  return [...families].sort((a, b) => {
    switch (sortBy) {
      case 'runs': return b.totalRuns - a.totalRuns;
      case 'confidence': return (b.avgConfidence ?? 0) - (a.avgConfidence ?? 0);
      case 'variation': return b.totalVariants - a.totalVariants;
      case 'duration': return b.avgDurationMs - a.avgDurationMs;
      default: return 0;
    }
  });
}

function sortGroups(groups: ProcessDefinition[], sortBy: SortOption): ProcessDefinition[] {
  return [...groups].sort((a, b) => {
    switch (sortBy) {
      case 'runs': return b.runCount - a.runCount;
      case 'confidence': return (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0);
      case 'variation': return b.variantCount - a.variantCount;
      case 'duration': return b.avgDurationMs - a.avgDurationMs;
      case 'analyzed': return new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime();
      default: return 0;
    }
  });
}

function safeJsonParse(json: string): unknown {
  try { return JSON.parse(json); }
  catch { return null; }
}

function confidenceColorClass(score: number): string {
  if (score >= 0.8) return 'text-emerald-600';
  if (score >= 0.5) return 'text-amber-600';
  return 'text-red-500';
}
