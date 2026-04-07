'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, ChevronRight, Crown, Shield, Eye } from 'lucide-react';
import { track } from '@/lib/analytics';

interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
  createdAt: string;
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: Users,
  viewer: Eye,
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTeams();
    track({ event: 'page_viewed', path: '/teams' });
  }, []);

  async function loadTeams() {
    const res = await fetch('/api/teams');
    if (res.ok) {
      const data = await res.json();
      setTeams(data.teams);
    }
    setIsLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsCreating(true);
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName('');
      setShowCreate(false);
      await loadTeams();
    }
    setIsCreating(false);
  }

  if (isLoading) {
    return <div className="text-center text-ds-sm text-gray-400 py-20">Loading teams...</div>;
  }

  return (
    <div className="mx-auto max-w-ds-content">
      <div className="flex items-center justify-between mb-ds-6">
        <div>
          <h1 className="text-ds-2xl font-bold tracking-tight text-gray-900">Teams</h1>
          <p className="text-ds-sm text-gray-500">
            {teams.length} team{teams.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-1.5">
          <Plus className="h-4 w-4" />
          Create Team
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card px-ds-5 py-ds-4 mb-ds-4">
          <h3 className="text-ds-sm font-medium text-gray-900 mb-ds-2">Create a new team</h3>
          <div className="flex gap-ds-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Team name"
              className="input-field flex-1"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button onClick={handleCreate} disabled={isCreating || !newName.trim()} className="btn-primary text-xs">
              {isCreating ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Team list */}
      {teams.length === 0 ? (
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-gray-50 to-white px-ds-8 py-ds-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <Users className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="mt-ds-4 text-ds-base font-medium text-gray-900">No teams yet</h3>
            <p className="mt-ds-1 text-ds-sm text-gray-500">
              Create a team to share workflows with colleagues and collaborate on process documentation.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-ds-4 gap-1.5">
              <Plus className="h-4 w-4" />
              Create your first team
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-ds-2">
          {teams.map(team => {
            const RoleIcon = ROLE_ICONS[team.role] ?? Users;
            return (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="card flex items-center gap-ds-4 px-ds-5 py-ds-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-ds-lg bg-brand-50">
                  <Users className="h-5 w-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-ds-sm font-medium text-gray-900">{team.name}</p>
                  <div className="flex items-center gap-ds-2 mt-0.5 text-ds-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <RoleIcon className="h-3 w-3" />
                      {team.role}
                    </span>
                    <span>·</span>
                    <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
