'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Layers, Clock, Monitor, BarChart3, ExternalLink } from 'lucide-react';
import { formatDuration, formatConfidence } from '@/lib/format';
import { track } from '@/lib/analytics';
import { SOPTab } from '@/components/detail/SOPTab';
import { ReportTab } from '@/components/detail/ReportTab';

/**
 * Public shared workflow view — read-only, no auth required.
 * Accessed via /share/{token} where token is generated when user enables sharing.
 */

type TabId = 'sop' | 'report';

export default function SharedWorkflowPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('sop');

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/share/${token}`);
      if (!res.ok) {
        setError(res.status === 404 ? 'This workflow link is no longer active.' : 'Failed to load workflow.');
        setIsLoading(false);
        return;
      }
      setData(await res.json());
      setIsLoading(false);
      track({ event: 'shared_workflow_viewed', token });
    }
    load();
  }, [token]);

  if (isLoading) {
    return <div className="text-center text-ds-sm text-gray-400 py-20">Loading shared workflow...</div>;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-ds-content py-ds-12 text-center">
        <Layers className="mx-auto h-10 w-10 text-gray-300" />
        <h2 className="mt-ds-4 text-ds-lg font-semibold text-gray-900">Workflow not found</h2>
        <p className="mt-ds-2 text-ds-sm text-gray-500">{error ?? 'This link may have expired or been revoked.'}</p>
        <Link href="/" className="btn-primary mt-ds-6 inline-flex">
          Learn about Ledgerium AI
        </Link>
      </div>
    );
  }

  const { workflow, sop, report } = data;

  return (
    <div className="mx-auto max-w-ds-content py-ds-6">
      {/* Header */}
      <div className="ds-header">
        <div className="flex items-center gap-ds-2 mb-ds-2">
          <span className="ds-tag ds-tag-brand">Shared Workflow</span>
        </div>
        <h1 className="ds-header-title">{workflow.title}</h1>
        <div className="mt-ds-2 flex flex-wrap items-center gap-ds-3 text-ds-xs text-gray-500">
          {workflow.stepCount && (
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              {workflow.stepCount} steps
            </span>
          )}
          {workflow.durationMs && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(workflow.durationMs)}
            </span>
          )}
          {workflow.confidence !== null && (
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              {formatConfidence(workflow.confidence)}
            </span>
          )}
        </div>
        {workflow.toolsUsed?.length > 0 && (
          <div className="mt-ds-2 flex flex-wrap gap-ds-1">
            {workflow.toolsUsed.map((tool: string) => (
              <span key={tool} className="ds-tag ds-tag-brand">{tool}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-ds-6">
        <nav className="flex gap-ds-6">
          <button
            onClick={() => setActiveTab('sop')}
            className={`border-b-2 pb-ds-3 pt-ds-1 text-ds-sm font-medium transition-colors ${
              activeTab === 'sop' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            SOP
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`border-b-2 pb-ds-3 pt-ds-1 text-ds-sm font-medium transition-colors ${
              activeTab === 'report' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Report
          </button>
        </nav>
      </div>

      {activeTab === 'sop' && <SOPTab sop={sop} />}
      {activeTab === 'report' && <ReportTab report={report} />}

      {/* CTA footer */}
      <div className="mt-ds-8 card px-ds-6 py-ds-5 text-center bg-gradient-to-r from-brand-50 to-white">
        <p className="text-ds-base font-medium text-gray-900">Want to create your own workflow documentation?</p>
        <p className="mt-ds-1 text-ds-sm text-gray-500">
          Record browser workflows and get SOPs, process maps, and reports automatically.
        </p>
        <Link href="/signup" className="btn-primary mt-ds-4 inline-flex gap-1.5">
          <ExternalLink className="h-4 w-4" />
          Try Ledgerium AI free
        </Link>
      </div>
    </div>
  );
}
