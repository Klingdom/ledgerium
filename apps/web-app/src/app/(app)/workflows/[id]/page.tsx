'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Layers,
  BarChart3,
  Monitor,
  Download,
  FileJson,
  Eye,
  Share2,
  Star,
  Copy,
  Check,
  Link2,
  Plus,
  HelpCircle,
} from 'lucide-react';
import { formatDuration, formatDate, formatConfidence } from '@/lib/format';
import { track, trackActivation } from '@/lib/analytics';
import { completeStep } from '@/lib/onboarding';
import { WorkflowPageShell } from '@/components/workflow-view/WorkflowPageShell';
import { SOPPageShell } from '@/components/sop-view/SOPPageShell';
import { WorkflowReportPage } from '@/components/detail/WorkflowReportPage';
import { EvidenceTab } from '@/components/detail/EvidenceTab';
import { AgentIntelligenceTab } from '@/components/detail/AgentIntelligenceTab';
import { SOPUsefulnessSurvey } from '@/components/shared/SOPUsefulnessSurvey';

type ViewId = 'process' | 'analysis';

const TABS: { id: ViewId; label: string; icon: React.ElementType; docsAnchor: string }[] = [
  { id: 'process', label: 'Process', icon: Layers, docsAnchor: 'process-map' },
  { id: 'analysis', label: 'Analysis', icon: BarChart3, docsAnchor: 'report-tab' },
];

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewId>('process');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [intelligenceData, setIntelligenceData] = useState<any>(null);
  const [agentIntelligenceData, setAgentIntelligenceData] = useState<any>(null);
  // Loading flag still drives handleRunIntelligence's fetch lifecycle; the value
  // is no longer rendered (IntelligenceTab retired — WorkflowReportPage shows the
  // intelligence sections directly).
  const [, setIntelligenceLoading] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);

  // Tracks whether we've already fired the 30-second SOP dwell event this session.
  const sopViewedFiredRef = useRef(false);

  // Guard: only auto-trigger analysis once per page load.
  const analysisAutoFiredRef = useRef(false);

  // Guard: fire process-map activation exactly once after data loads on the default Process view.
  const mapActivationFiredRef = useRef(false);

  // Fire `sop_section_viewed` once the user has spent 30 continuous seconds on the Process view.
  // Rekeyed from activeTab === 'sop' to activeTab === 'process' because SOP now lives in Process view.
  // FIX 4: SOP activation (view_sop / first_sop) is also fired here so it reflects genuine SOP
  // engagement (dwell time) rather than merely clicking the Process tab.
  useEffect(() => {
    if (activeTab !== 'process') return;

    const SOP_DWELL_MS = 30_000;
    const timer = setTimeout(() => {
      if (sopViewedFiredRef.current) return;
      sopViewedFiredRef.current = true;
      setShowSurvey(true);
      track({ event: 'sop_section_viewed', workflowId: id, durationMs: SOP_DWELL_MS });
      completeStep('view_sop');
      trackActivation('first_sop', { workflowId: id });
    }, SOP_DWELL_MS);

    return () => clearTimeout(timer);
  }, [activeTab, id]);

  // FIX 4: fire process-map activation once data has loaded on the default Process view.
  // Guards with a ref so it fires exactly once per page load regardless of re-renders.
  useEffect(() => {
    if (!data) return;
    if (activeTab !== 'process') return;
    if (mapActivationFiredRef.current) return;
    mapActivationFiredRef.current = true;
    completeStep('view_process_map');
    trackActivation('first_map', { workflowId: id });
  }, [data, activeTab, id]);

  // Auto-load analysis data when the Analysis view first becomes active.
  useEffect(() => {
    if (activeTab !== 'analysis') return;
    if (analysisAutoFiredRef.current) return;
    analysisAutoFiredRef.current = true;
    handleRunIntelligence();
    handleRunAgentIntelligence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/workflows/${id}`);
      if (!res.ok) {
        router.push('/dashboard');
        return;
      }
      const result = await res.json();
      setData(result);
      setIsFavorite(result.workflow.isFavorite ?? false);
      if (result.workflow.shareToken) {
        setShareUrl(`${window.location.origin}/share/${result.workflow.shareToken}`);
      }
      setIsLoading(false);
    }
    load();
    track({ event: 'workflow_viewed', workflowId: id, tab: 'process' });
  }, [id, router]);

  function handleTabChange(tab: ViewId) {
    setActiveTab(tab);
    track({ event: 'tab_switched', tab });
  }

  async function handleToggleFavorite() {
    const newValue = !isFavorite;
    setIsFavorite(newValue);
    await fetch(`/api/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: newValue }),
    });
  }

  async function handleToggleShare() {
    const enabling = !shareUrl;
    const res = await fetch(`/api/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enableSharing: enabling }),
    });
    const result = await res.json();
    if (enabling && result.shareToken) {
      const url = `${window.location.origin}/share/${result.shareToken}`;
      setShareUrl(url);
      navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
      track({ event: 'share_link_created', workflowId: id });
    } else {
      setShareUrl(null);
      track({ event: 'share_link_disabled', workflowId: id });
    }
  }

  function handleCopyShareUrl() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
    track({ event: 'share_link_copied', workflowId: id });
  }

  async function handleRunIntelligence() {
    setIntelligenceLoading(true);
    try {
      const res = await fetch(`/api/workflows/${id}/analyze`, { method: 'POST' });
      if (!res.ok) return;
      const result = await res.json();
      setIntelligenceData(result.intelligence ?? null);
    } catch {
      // Non-fatal — user can retry from within the report page
    } finally {
      setIntelligenceLoading(false);
    }
  }

  async function handleRunAgentIntelligence() {
    setAgentLoading(true);
    try {
      const res = await fetch(`/api/workflows/${id}/agent-intelligence`, { method: 'POST' });
      if (!res.ok) return;
      const result = await res.json();
      setAgentIntelligenceData(result.data ?? null);
    } catch {
      // Non-fatal — user can retry from within the report page
    } finally {
      setAgentLoading(false);
    }
  }

  if (isLoading || !data) {
    return <div className="text-center text-ds-sm text-[var(--content-tertiary)] py-20">Loading workflow...</div>;
  }

  const { workflow, artifacts } = data;
  const processOutput = artifacts.find((a: any) => a.artifactType === 'process_output')?.contentJson;
  const workflowReport = artifacts.find((a: any) => a.artifactType === 'workflow_report')?.contentJson;
  const sopArtifact = artifacts.find((a: any) => a.artifactType === 'sop')?.contentJson;
  const processMap = artifacts.find((a: any) => a.artifactType === 'process_map')?.contentJson;
  const workflowInsights = artifacts.find((a: any) => a.artifactType === 'workflow_insights')?.contentJson;
  const interpretation = artifacts.find((a: any) => a.artifactType === 'workflow_interpretation')?.contentJson;

  // Template artifacts
  const templateSelection = artifacts.find((a: any) => a.artifactType === 'template_selection')?.contentJson;
  const processMapTemplates = {
    swimlane: artifacts.find((a: any) => a.artifactType === 'template_process_map_swimlane')?.contentJson,
    bpmn_informed: artifacts.find((a: any) => a.artifactType === 'template_process_map_bpmn_informed')?.contentJson,
    sipoc_high_level: artifacts.find((a: any) => a.artifactType === 'template_process_map_sipoc_high_level')?.contentJson,
  };
  const sopTemplates = {
    operator_centric: artifacts.find((a: any) => a.artifactType === 'template_sop_operator_centric')?.contentJson,
    enterprise: artifacts.find((a: any) => a.artifactType === 'template_sop_enterprise')?.contentJson,
    decision_based: artifacts.find((a: any) => a.artifactType === 'template_sop_decision_based')?.contentJson,
  };

  function handleExport(type: string) {
    let content: string;
    let filename: string;
    if (type === 'report') {
      content = JSON.stringify(workflowReport, null, 2);
      filename = `${workflow.title.replace(/\s+/g, '-').toLowerCase()}-report.json`;
    } else if (type === 'sop') {
      content = JSON.stringify(sopArtifact, null, 2);
      filename = `${workflow.title.replace(/\s+/g, '-').toLowerCase()}-sop.json`;
    } else {
      content = JSON.stringify(processOutput, null, 2);
      filename = `${workflow.title.replace(/\s+/g, '-').toLowerCase()}-workflow.json`;
    }
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    track({ event: 'workflow_exported', workflowId: id, format: type });
  }

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-ds-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-ds-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] mb-ds-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-ds-2">
              <h1 className="text-ds-2xl font-bold tracking-tight text-[var(--content-primary)]">{workflow.title}</h1>
              <button
                onClick={handleToggleFavorite}
                className="rounded-ds-sm p-1 hover:bg-[var(--surface-secondary)] transition-colors"
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={`h-5 w-5 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-[var(--content-tertiary)]'}`} />
              </button>
            </div>
            <div className="mt-ds-2 flex flex-wrap items-center gap-ds-3 text-ds-xs text-[var(--content-secondary)]">
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                {workflow.stepCount} steps
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(workflow.durationMs)}
              </span>
              {workflow.phaseCount > 0 && (
                <span className="flex items-center gap-1">
                  <Monitor className="h-3.5 w-3.5" />
                  {workflow.phaseCount} phase{workflow.phaseCount !== 1 ? 's' : ''}
                </span>
              )}
              {workflow.confidence !== null && (
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {formatConfidence(workflow.confidence)}
                </span>
              )}
              {workflow.viewCount > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {workflow.viewCount} view{workflow.viewCount !== 1 ? 's' : ''}
                </span>
              )}
              <span className="text-[var(--content-tertiary)]">·</span>
              <span>{formatDate(workflow.createdAt)}</span>
            </div>
            {workflow.toolsUsed.length > 0 && (
              <div className="mt-ds-2 flex flex-wrap gap-ds-1">
                {workflow.toolsUsed.map((tool: string) => (
                  <span key={tool} className="ds-tag ds-tag-brand">{tool}</span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-ds-2 no-print">
            {/* Share */}
            <div className="relative">
              <button onClick={handleToggleShare} className={`btn-secondary gap-1 text-xs ${shareUrl ? 'bg-green-50 border-green-200 text-green-700' : ''}`}>
                {shareUrl ? (
                  shareCopied ? <><Check className="h-3.5 w-3.5" /> Copied!</> :
                  <><Link2 className="h-3.5 w-3.5" /> Shared</>
                ) : (
                  <><Share2 className="h-3.5 w-3.5" /> Share</>
                )}
              </button>
              {shareUrl && !shareCopied && (
                <button onClick={handleCopyShareUrl} className="absolute top-full right-0 mt-1 btn-secondary gap-1 text-xs whitespace-nowrap z-10">
                  <Copy className="h-3 w-3" /> Copy link
                </button>
              )}
            </div>
            {/* Export */}
            <button onClick={() => handleExport('report')} className="btn-secondary gap-1 text-xs">
              <Download className="h-3.5 w-3.5" /> Report
            </button>
            <button onClick={() => handleExport('sop')} className="btn-secondary gap-1 text-xs">
              <Download className="h-3.5 w-3.5" /> SOP
            </button>
            <button onClick={() => handleExport('workflow')} className="btn-secondary gap-1 text-xs">
              <FileJson className="h-3.5 w-3.5" /> JSON
            </button>
          </div>
        </div>
      </div>

      {/* View tabs (2 views) */}
      <div className="border-b border-[var(--border-default)] mb-ds-6 no-print overflow-x-auto">
        <nav className="flex gap-ds-6 min-w-max">
          {TABS.map(({ id: tabId, label, icon: Icon, docsAnchor }) => (
            <span key={tabId} className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => handleTabChange(tabId)}
                className={`flex items-center gap-1.5 border-b-2 pb-ds-3 pt-ds-1 text-ds-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tabId
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
              {activeTab === tabId && (
                <a
                  href={`/docs#${docsAnchor}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Learn about the ${label} view`}
                  className="mb-1 ml-0.5 text-[var(--content-tertiary)] hover:text-brand-400 transition-colors"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </a>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* ── Process view ────────────────────────────────────────────────────── */}
      {activeTab === 'process' && (
        <div className="space-y-ds-10">
          {/* Process map */}
          <WorkflowPageShell
            processOutput={processOutput}
            processMap={processMap}
            sopArtifact={sopArtifact}
            workflowRecord={{
              id: workflow.id,
              title: workflow.title,
              confidence: workflow.confidence,
              createdAt: workflow.createdAt,
              status: workflow.status ?? 'active',
            }}
          />

          {/* Procedure / SOP */}
          <section>
            <h2 className="text-ds-lg font-semibold text-[var(--content-primary)] mb-ds-4">Procedure</h2>
            <SOPPageShell
              sop={sopArtifact}
              templateArtifacts={sopTemplates}
              workflowRecord={{
                id: workflow.id,
                title: workflow.title,
                confidence: workflow.confidence,
                createdAt: workflow.createdAt,
                status: workflow.status ?? 'active',
              }}
              workflowId={id}
            />
            {showSurvey && (
              <SOPUsefulnessSurvey workflowId={id} />
            )}
          </section>
        </div>
      )}

      {/* ── Analysis view ────────────────────────────────────────────────────── */}
      {activeTab === 'analysis' && (
        <div className="space-y-ds-10">
          {/* Report — includes insights, interpretation, bottlenecks, automation, steps */}
          <WorkflowReportPage
            workflow={{
              id: workflow.id,
              title: workflow.title,
              durationMs: workflow.durationMs ?? 0,
              stepCount: workflow.stepCount ?? 0,
              phaseCount: workflow.phaseCount ?? 0,
              confidence: workflow.confidence ?? 0,
              toolsUsed: workflow.toolsUsed ?? [],
              status: workflow.status ?? 'active',
              createdAt: workflow.createdAt,
              updatedAt: workflow.updatedAt,
              isFavorite: isFavorite,
              shareToken: workflow.shareToken,
            }}
            report={workflowReport}
            insights={workflowInsights}
            interpretation={interpretation}
            intelligence={intelligenceData}
            agentIntelligence={agentIntelligenceData}
            processOutput={processOutput}
            sop={sopArtifact}
            onRunIntelligence={handleRunIntelligence}
            onRunAgentIntelligence={handleRunAgentIntelligence}
          />

          {/* Agent intelligence — composed agents, skills, integration risk, roadmap
               data= threads the already-fetched result to eliminate the double-fetch.
               isLoadingData= shows a spinner during the page-level auto-fetch.
               hideOpportunities= suppresses the duplicate that WorkflowReportPage already shows. */}
          <section>
            <h2 className="text-ds-lg font-semibold text-[var(--content-primary)] mb-ds-4">Agent Intelligence</h2>
            <AgentIntelligenceTab workflowId={id} data={agentIntelligenceData} isLoadingData={agentLoading} hideOpportunities />
          </section>

          {/* Raw evidence — collapsed by default */}
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center gap-ds-2 text-ds-sm font-medium text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors py-ds-2 select-none">
              <Eye className="h-4 w-4" />
              Raw evidence (JSON)
              <span className="ml-1 text-[var(--content-tertiary)] text-xs group-open:hidden">▶</span>
              <span className="ml-1 text-[var(--content-tertiary)] text-xs hidden group-open:inline">▼</span>
            </summary>
            <div className="mt-ds-3">
              <EvidenceTab processOutput={processOutput} />
            </div>
          </details>
        </div>
      )}

      {/* Post-view guidance */}
      <div className="mt-ds-8 card px-ds-6 py-ds-5 bg-[var(--surface-secondary)] no-print">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-ds-sm font-medium text-[var(--content-primary)]">Build your workflow library</p>
            <p className="text-ds-xs text-[var(--content-secondary)]">Record more workflows to compare patterns and find improvement opportunities.</p>
          </div>
          <Link href="/upload" className="btn-primary gap-1.5 text-xs flex-shrink-0">
            <Plus className="h-3.5 w-3.5" />
            Add another workflow
          </Link>
        </div>
      </div>
    </div>
  );
}
