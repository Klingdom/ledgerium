'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Lightbulb,
  Filter,
  ArrowRight,
  Clock,
  Zap,
  Shield,
  Bot,
  FileText,
  GitBranch,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import { formatDuration } from '@/lib/format';
import { track } from '@/lib/analytics';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RecommendationData {
  id: string;
  type: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  estimatedTimeSavingsMs: number | null;
  estimatedImprovementPct: number | null;
  evidence: string;
  dataPoints: number;
  processName: string;
  affectedSteps: number[];
  evidenceRunIds: string[];
  computedAt: string;
}

interface ProcessDefinitionBrief {
  id: string;
  canonicalName: string;
  intelligence: {
    recommendations?: RecommendationData[];
  } | null;
}

interface EnrichedRecommendation extends RecommendationData {
  processId: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'standardize_variant', label: 'Standardize' },
  { value: 'update_sop', label: 'Update SOP' },
  { value: 'automate_step', label: 'Automate' },
  { value: 'reduce_rework', label: 'Reduce Rework' },
  { value: 'simplify_handoffs', label: 'Bottleneck' },
  { value: 'remove_step', label: 'Remove Step' },
  { value: 'add_validation', label: 'Add Validation' },
];

const IMPACT_OPTIONS = [
  { value: '', label: 'All Impact' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const CONFIDENCE_OPTIONS = [
  { value: '', label: 'All Confidence' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const TYPE_STYLES: Record<string, string> = {
  standardize_variant: 'bg-teal-100 text-teal-700',
  update_sop: 'bg-purple-100 text-purple-700',
  automate_step: 'bg-blue-100 text-blue-700',
  remove_step: 'bg-gray-100 text-gray-700',
  reduce_rework: 'bg-orange-100 text-orange-700',
  add_validation: 'bg-emerald-100 text-emerald-700',
  simplify_handoffs: 'bg-red-100 text-red-700',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  standardize_variant: GitBranch,
  update_sop: FileText,
  automate_step: Bot,
  remove_step: Wrench,
  reduce_rework: AlertTriangle,
  add_validation: Shield,
  simplify_handoffs: Zap,
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RecommendationCenterPage() {
  const [definitions, setDefinitions] = useState<ProcessDefinitionBrief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterImpact, setFilterImpact] = useState('');
  const [filterConfidence, setFilterConfidence] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/process-definitions');
        if (!res.ok) {
          console.error('[recommendations] API returned', res.status);
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        const defs = Array.isArray(data?.definitions) ? data.definitions : [];
        setDefinitions(defs);
      } catch (err) {
        console.error('[recommendations] Failed to load:', err);
      }
      setIsLoading(false);
    }
    load();
    track({ event: 'page_viewed', path: '/recommendations' });
  }, []);

  // Aggregate all recommendations across definitions
  const allRecommendations = useMemo(() => {
    const recs: EnrichedRecommendation[] = [];
    for (const def of definitions) {
      if (!def?.intelligence?.recommendations) continue;
      if (!Array.isArray(def.intelligence.recommendations)) continue;
      for (const rec of def.intelligence.recommendations) {
        if (!rec?.id || !rec?.type || !rec?.title) continue; // Skip malformed
        recs.push({ ...rec, processId: def.id });
      }
    }
    // Sort by impact priority: high > medium > low
    const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    recs.sort((a, b) => (impactOrder[a.impact] ?? 2) - (impactOrder[b.impact] ?? 2));
    return recs;
  }, [definitions]);

  // Apply filters
  const filteredRecommendations = useMemo(() => {
    return allRecommendations.filter((rec) => {
      if (filterType && rec.type !== filterType) return false;
      if (filterImpact && rec.impact !== filterImpact) return false;
      if (filterConfidence && rec.confidence !== filterConfidence) return false;
      return true;
    });
  }, [allRecommendations, filterType, filterImpact, filterConfidence]);

  if (isLoading) {
    return (
      <div className="text-center text-ds-sm text-gray-400 py-20">
        Loading recommendations...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-ds-6">
        <h1 className="text-ds-2xl font-bold tracking-tight text-gray-900">
          Recommendation Center
        </h1>
        <p className="text-ds-sm text-gray-500 mt-ds-1">
          {allRecommendations.length} actionable recommendation{allRecommendations.length !== 1 ? 's' : ''} across {definitions.filter((d) => d.intelligence?.recommendations?.length).length} process{definitions.filter((d) => d.intelligence?.recommendations?.length).length !== 1 ? 'es' : ''}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-ds-3 mb-ds-6">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-ds-md border border-gray-200 bg-white px-ds-3 py-ds-2 text-ds-sm text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filterImpact}
          onChange={(e) => setFilterImpact(e.target.value)}
          className="rounded-ds-md border border-gray-200 bg-white px-ds-3 py-ds-2 text-ds-sm text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          {IMPACT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filterConfidence}
          onChange={(e) => setFilterConfidence(e.target.value)}
          className="rounded-ds-md border border-gray-200 bg-white px-ds-3 py-ds-2 text-ds-sm text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          {CONFIDENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {(filterType || filterImpact || filterConfidence) && (
          <button
            onClick={() => { setFilterType(''); setFilterImpact(''); setFilterConfidence(''); }}
            className="text-ds-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            Clear filters
          </button>
        )}
        <span className="text-ds-xs text-gray-400 ml-auto">
          Showing {filteredRecommendations.length} of {allRecommendations.length}
        </span>
      </div>

      {/* Recommendation cards */}
      {filteredRecommendations.length > 0 ? (
        <div className="space-y-ds-3">
          {filteredRecommendations.map((rec) => {
            const TypeIcon = TYPE_ICONS[rec.type] ?? Lightbulb;
            return (
              <div key={`${rec.processId}-${rec.id}`} className="card px-ds-5 py-ds-4">
                <div className="flex items-start gap-ds-3">
                  <TypeIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                    rec.impact === 'high' ? 'text-red-500' :
                    rec.impact === 'medium' ? 'text-amber-500' : 'text-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    {/* Title + badges */}
                    <div className="flex flex-wrap items-center gap-ds-2 mb-ds-1">
                      <span className="text-ds-sm font-semibold text-gray-900">{rec.title}</span>
                      <span className={`ds-tag text-[10px] ${TYPE_STYLES[rec.type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {rec.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Process name */}
                    <Link
                      href={`/analytics/process/${rec.processId}`}
                      className="inline-flex items-center gap-1 text-ds-xs text-brand-600 hover:text-brand-700 font-medium mb-ds-2"
                    >
                      {rec.processName}
                      <ArrowRight className="h-3 w-3" />
                    </Link>

                    {/* Description */}
                    <p className="text-ds-xs text-gray-600">{rec.description}</p>

                    {/* Metric badges */}
                    <div className="flex flex-wrap items-center gap-ds-2 mt-ds-2">
                      <span className={`ds-tag text-[10px] ${
                        rec.impact === 'high' ? 'bg-red-100 text-red-700' :
                        rec.impact === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {rec.impact} impact
                      </span>
                      <span className={`ds-tag text-[10px] ${
                        rec.confidence === 'high' ? 'bg-green-100 text-green-700' :
                        rec.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {rec.confidence} confidence
                      </span>
                      <span className={`ds-tag text-[10px] ${
                        rec.effort === 'low' ? 'bg-green-100 text-green-700' :
                        rec.effort === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {rec.effort} effort
                      </span>
                      {rec.estimatedTimeSavingsMs != null && rec.estimatedTimeSavingsMs > 0 && (
                        <span className="ds-tag text-[10px] bg-green-100 text-green-700 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          saves {formatDuration(rec.estimatedTimeSavingsMs)}/run
                        </span>
                      )}
                    </div>

                    {/* Evidence */}
                    <p className="text-ds-xs text-gray-400 mt-ds-2">{rec.evidence}</p>

                    {/* View Process link */}
                    <div className="mt-ds-3">
                      <Link
                        href={`/analytics/process/${rec.processId}`}
                        className="inline-flex items-center gap-1.5 rounded-ds-md bg-brand-50 px-ds-3 py-ds-2 text-ds-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
                      >
                        View Process
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card px-ds-6 py-ds-10 text-center">
          <Lightbulb className="h-8 w-8 text-gray-300 mx-auto mb-ds-3" />
          <p className="text-ds-sm text-gray-500 font-medium">
            {allRecommendations.length === 0
              ? 'No recommendations yet'
              : 'No recommendations match the current filters'}
          </p>
          <p className="text-ds-xs text-gray-400 mt-ds-1">
            {allRecommendations.length === 0
              ? 'Record more workflow executions to generate actionable recommendations.'
              : 'Try adjusting or clearing filters to see more results.'}
          </p>
        </div>
      )}
    </div>
  );
}
