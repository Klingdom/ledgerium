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
} from 'lucide-react';
import { formatDuration, formatDate, formatConfidence } from '@/lib/format';
import { WorkflowTab } from '@/components/detail/WorkflowTab';
import { SOPTab } from '@/components/detail/SOPTab';
import { ReportTab } from '@/components/detail/ReportTab';
import { EvidenceTab } from '@/components/detail/EvidenceTab';
import { IntelligenceTab } from '@/components/detail/IntelligenceTab';
import { Zap } from 'lucide-react';

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

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/workflows/${id}`);
      if (!res.ok) {
        router.push('/dashboard');
        return;
      }
      setData(await res.json());
      setIsLoading(false);
    }
    load();
  }, [id, router]);

  if (isLoading || !data) {
    return <div className="text-center text-sm text-gray-400 py-20">Loading workflow...</div>;
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
  }

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{workflow.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
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
                  {formatConfidence(workflow.confidence)} confidence
                </span>
              )}
              <span className="text-gray-300">|</span>
              <span>{formatDate(workflow.createdAt)}</span>
            </div>

            {/* Tool badges */}
            {workflow.toolsUsed.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {workflow.toolsUsed.map((tool: string) => (
                  <span
                    key={tool}
                    className="inline-flex rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Export buttons */}
          <div className="flex gap-2">
            <button onClick={() => handleExport('report')} className="btn-secondary gap-1 text-xs">
              <Download className="h-3.5 w-3.5" />
              Report
            </button>
            <button onClick={() => handleExport('sop')} className="btn-secondary gap-1 text-xs">
              <Download className="h-3.5 w-3.5" />
              SOP
            </button>
            <button onClick={() => handleExport('workflow')} className="btn-secondary gap-1 text-xs">
              <FileJson className="h-3.5 w-3.5" />
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`flex items-center gap-1.5 border-b-2 pb-3 pt-1 text-sm font-medium transition-colors ${
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
    </div>
  );
}
