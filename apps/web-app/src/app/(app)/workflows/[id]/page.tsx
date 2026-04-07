'use client';

import { useEffect, useState } from 'react';
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
  ListChecks,
  FileText,
  Eye,
  Zap,
  Share2,
  Star,
  Copy,
  Check,
  Link2,
  Plus,
} from 'lucide-react';
import { formatDuration, formatDate, formatConfidence } from '@/lib/format';
import { track } from '@/lib/analytics';
import { completeStep } from '@/lib/onboarding';
import { WorkflowTab } from '@/components/detail/WorkflowTab';
import { SOPTab } from '@/components/detail/SOPTab';
import { ReportTab } from '@/components/detail/ReportTab';
import { EvidenceTab } from '@/components/detail/EvidenceTab';
import { IntelligenceTab } from '@/components/detail/IntelligenceTab';

type TabId = 'workflow' | 'sop' | 'report' | 'intelligence' | 'evidence';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'workflow', label: 'Workflow', icon: Layers },
  { id: 'sop', label: 'SOP', icon: ListChecks },
  { id: 'report', label: 'Report', icon: FileText },
  { id: 'intelligence', label: 'Intelligence', icon: Zap },
  { id: 'evidence', label: 'Evidence', icon: Eye },
];

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('workflow');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

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
    track({ event: 'workflow_viewed', workflowId: id, tab: 'workflow' });
  }, [id, router]);

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    track({ event: 'tab_switched', tab });
    if (tab === 'sop') completeStep('view_sop');
    if (tab === 'workflow') completeStep('view_process_map');
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
    } else {
      setShareUrl(null);
    }
  }

  function handleCopyShareUrl() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  if (isLoading || !data) {
    return <div className="text-center text-ds-sm text-gray-400 py-20">Loading workflow...</div>;
  }

  const { workflow, artifacts } = data;
  const processOutput = artifacts.find((a: any) => a.artifactType === 'process_output')?.contentJson;
  const workflowReport = artifacts.find((a: any) => a.artifactType === 'workflow_report')?.contentJson;
  const sopArtifact = artifacts.find((a: any) => a.artifactType === 'sop')?.contentJson;
  const processMap = artifacts.find((a: any) => a.artifactType === 'process_map')?.contentJson;

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
          className="inline-flex items-center gap-1 text-ds-sm text-gray-500 hover:text-gray-700 mb-ds-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-ds-2">
              <h1 className="text-ds-2xl font-bold tracking-tight text-gray-900">{workflow.title}</h1>
              <button
                onClick={handleToggleFavorite}
                className="rounded-ds-sm p-1 hover:bg-gray-100 transition-colors"
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={`h-5 w-5 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
              </button>
            </div>
            <div className="mt-ds-2 flex flex-wrap items-center gap-ds-3 text-ds-xs text-gray-500">
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
              <span className="text-gray-300">·</span>
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

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-ds-6 no-print">
        <nav className="flex gap-ds-6">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => handleTabChange(tabId)}
              className={`flex items-center gap-1.5 border-b-2 pb-ds-3 pt-ds-1 text-ds-sm font-medium transition-colors ${
                activeTab === tabId
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'workflow' && <WorkflowTab processOutput={processOutput} processMap={processMap} />}
      {activeTab === 'sop' && <SOPTab sop={sopArtifact} />}
      {activeTab === 'report' && <ReportTab report={workflowReport} />}
      {activeTab === 'intelligence' && <IntelligenceTab workflowId={id} />}
      {activeTab === 'evidence' && <EvidenceTab processOutput={processOutput} />}

      {/* Post-view guidance */}
      <div className="mt-ds-8 card px-ds-6 py-ds-5 bg-gray-50/50 no-print">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-ds-sm font-medium text-gray-700">Build your workflow library</p>
            <p className="text-ds-xs text-gray-500">Record more workflows to compare patterns and find improvement opportunities.</p>
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
