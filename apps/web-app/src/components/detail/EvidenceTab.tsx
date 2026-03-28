'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface Props {
  processOutput: any;
}

export function EvidenceTab({ processOutput }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!processOutput) {
    return <div className="text-sm text-gray-400">No evidence data available.</div>;
  }

  const sections = [
    { key: 'processRun', label: 'Process Run', data: processOutput.processRun },
    { key: 'processDefinition', label: 'Process Definition', data: processOutput.processDefinition },
    { key: 'processMap', label: 'Process Map', data: processOutput.processMap },
    { key: 'sop', label: 'Standard Operating Procedure', data: processOutput.sop },
  ];

  function handleCopyAll() {
    navigator.clipboard.writeText(JSON.stringify(processOutput, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Structured evidence from the deterministic process engine.
        </p>
        <button onClick={handleCopyAll} className="btn-secondary gap-1 text-xs">
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy All JSON
            </>
          )}
        </button>
      </div>

      {sections.map(({ key, label, data }) => (
        <div key={key} className="card">
          <button
            onClick={() => setExpanded(expanded === key ? null : key)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <span className="text-sm font-medium text-gray-900">{label}</span>
            {expanded === key ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {expanded === key && (
            <div className="border-t border-gray-100 px-4 py-3">
              <pre className="max-h-96 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700 font-mono leading-relaxed">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}

      <div className="rounded-lg bg-gray-50 p-4 text-xs text-gray-400">
        Engine version: {processOutput.processRun?.engineVersion ?? 'unknown'}.
        All outputs are deterministic — identical input produces identical output.
      </div>
    </div>
  );
}
