'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Crown,
  Shield,
  Eye,
  UserPlus,
  Copy,
  Check,
  Trash2,
  Mail,
  Clock,
} from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  joinedAt: string;
}

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: Users,
  viewer: Eye,
};

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [teamName, setTeamName] = useState('');
  const [myRole, setMyRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Invite form state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    loadTeam();
  }, [id]);

  async function loadTeam() {
    const [teamsRes, membersRes, invitesRes] = await Promise.all([
      fetch('/api/teams'),
      fetch(`/api/teams/${id}/members`),
      fetch(`/api/teams/${id}/invite`),
    ]);

    if (teamsRes.ok) {
      const teamsData = await teamsRes.json();
      const team = teamsData.teams.find((t: any) => t.id === id);
      if (team) {
        setTeamName(team.name);
        setMyRole(team.role);
      }
    }

    if (membersRes.ok) {
      const membersData = await membersRes.json();
      setMembers(membersData.members);
    }

    if (invitesRes.ok) {
      const invitesData = await invitesRes.json();
      setInvites(invitesData.invites);
    }

    setIsLoading(false);
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    const res = await fetch(`/api/teams/${id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const data = await res.json();
    if (res.ok && data.inviteUrl) {
      setInviteUrl(data.inviteUrl);
      setInviteEmail('');
      await loadTeam();
    }
    setIsInviting(false);
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Remove this member from the team?')) return;
    await fetch(`/api/teams/${id}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    await loadTeam();
  }

  function handleCopyInvite() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  const isAdmin = myRole === 'owner' || myRole === 'admin';

  if (isLoading) {
    return <div className="text-center text-ds-sm text-gray-400 py-20">Loading team...</div>;
  }

  return (
    <div className="mx-auto max-w-ds-content">
      <Link href="/teams" className="inline-flex items-center gap-1 text-ds-sm text-gray-500 hover:text-gray-700 mb-ds-3">
        <ArrowLeft className="h-4 w-4" /> Back to Teams
      </Link>

      <div className="flex items-center justify-between mb-ds-6">
        <div>
          <h1 className="text-ds-2xl font-bold tracking-tight text-gray-900">{teamName}</h1>
          <p className="text-ds-sm text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''} · Your role: {myRole}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)} className="btn-primary gap-1.5">
            <UserPlus className="h-4 w-4" /> Invite
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="card px-ds-5 py-ds-4 mb-ds-6">
          <h3 className="text-ds-sm font-medium text-gray-900 mb-ds-3">Invite a team member</h3>
          <div className="flex gap-ds-2 mb-ds-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="input-field flex-1"
              autoFocus
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="input-field w-32"
            >
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()} className="btn-primary text-xs">
              {isInviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>

          {inviteUrl && (
            <div className="ds-callout ds-callout-success mt-ds-3">
              <p className="text-ds-xs font-semibold text-green-800 mb-ds-1">
                Invite created! Share this link with {inviteEmail || 'the recipient'}:
              </p>
              <div className="flex items-center gap-ds-2">
                <code className="flex-1 rounded-ds-md bg-white px-ds-3 py-ds-2 text-ds-xs font-mono text-gray-900 border border-green-200 truncate">
                  {inviteUrl}
                </code>
                <button onClick={handleCopyInvite} className="btn-secondary text-xs gap-1 flex-shrink-0">
                  {inviteCopied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  {inviteCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <button onClick={() => { setInviteUrl(null); setShowInvite(false); }} className="text-ds-xs text-green-700 mt-ds-2">
                Done
              </button>
            </div>
          )}
        </div>
      )}

      {/* Members */}
      <section className="ds-section mb-ds-8">
        <h2 className="ds-section-label">Members</h2>
        <div className="space-y-ds-2">
          {members.map(member => {
            const RoleIcon = ROLE_ICONS[member.role] ?? Users;
            return (
              <div key={member.id} className="card flex items-center gap-ds-3 px-ds-5 py-ds-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-ds-xs font-medium text-gray-600">
                  {(member.name ?? member.email)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-ds-sm font-medium text-gray-900">{member.name ?? member.email}</p>
                  {member.name && <p className="text-ds-xs text-gray-400">{member.email}</p>}
                </div>
                <span className="ds-tag ds-tag-neutral text-[11px] flex items-center gap-1">
                  <RoleIcon className="h-3 w-3" />
                  {member.role}
                </span>
                {isAdmin && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="rounded-ds-sm p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Pending Invites</h2>
          <div className="space-y-ds-2">
            {invites.map(invite => (
              <div key={invite.id} className="card flex items-center gap-ds-3 px-ds-5 py-ds-3">
                <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-ds-sm text-gray-700">{invite.email}</p>
                  <p className="text-ds-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="ds-tag ds-tag-neutral text-[11px]">{invite.role}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
