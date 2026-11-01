import React, { useState } from 'react';
import { EventPlan, CollaboratorRecord, CollaboratorRole } from '../../types/domain';
import { CollaboratorInviteSchema } from '../../schemas/validation';
import { formatCurrency } from '../../utils/financials';
import { formatIndianDate } from '../../utils/timeline';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Lock,
  Settings,
  CheckCircle2,
  X,
} from 'lucide-react';

interface CollaborationPanelProps {
  event: EventPlan;
  collaborators: CollaboratorRecord[];
  currentUserUid: string;
  currentUserEmail: string;
  onInviteCollaborator: (invite: {
    userId: string;
    email: string;
    displayName: string;
    role: CollaboratorRole;
  }) => Promise<void>;
  onRemoveCollaborator: (userId: string) => Promise<void>;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  event,
  collaborators,
  currentUserUid,
  currentUserEmail,
  onInviteCollaborator,
  onRemoveCollaborator,
}) => {
  const isOwner = event.ownerId === currentUserUid;
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('editor');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = CollaboratorInviteSchema.safeParse({
      userId,
      email,
      displayName,
      role,
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || 'Please check collaborator details.');
      return;
    }

    if (parsed.data.userId === event.ownerId) {
      setErrorMsg('The event owner already has full administrative access.');
      return;
    }

    await onInviteCollaborator(parsed.data);
    setUserId('');
    setEmail('');
    setDisplayName('');
  };

  const activeCollabRecord = collaborators.find((c) => c.userId === currentUserUid);

  return (
    <div className="space-y-8">
      {/* ==================================================
          1. SETTINGS & ACCESS GOVERNANCE HEADER
      ================================================== */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E6E0D7] shadow-2xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E6E0D7]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#B84420]">
              <Settings className="w-3.5 h-3.5" />
              <span>Workspace Settings & Role-Based Access Control</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#242321] mt-1">
              Event Governance, Permissions & Co-Organizers
            </h2>
            <p className="text-sm text-[#77736D] mt-1">
              Manage family members, wedding planners, and committee leads with Firestore-enforced
              role permissions.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-xs">
            <div className="text-[#77736D] uppercase tracking-wider font-semibold text-[10px]">
              Your Active Role
            </div>
            <div className="font-mono font-bold text-[#242321] mt-0.5">
              {isOwner
                ? 'Owner (Full Admin)'
                : activeCollabRecord?.role === 'editor'
                ? 'Co-Planner (Editor)'
                : 'Viewer (Read-Only)'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#77736D]">
              Event Identifier
            </div>
            <div className="font-mono text-xs font-semibold text-[#242321] mt-1 truncate">
              {event.id}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#77736D]">
              Currency & Locale
            </div>
            <div className="font-mono text-xs font-semibold text-[#242321] mt-1">
              {event.currency} · en-IN ({event.city})
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#77736D]">
              Scheduled Date
            </div>
            <div className="font-mono text-xs font-semibold text-[#242321] mt-1">
              {formatIndianDate(event.startDate)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#77736D]">
              Master Budget Cap
            </div>
            <div className="font-mono text-xs font-bold text-[#B84420] mt-1">
              {formatCurrency(event.totalBudget, event.currency)}
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#B42318]/10 border border-[#B42318]/30 text-xs font-semibold text-[#B42318] flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================
          2. ADD CO-ORGANIZER & CURRENT TEAM MATRIX
      ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#E6E0D7] shadow-2xs space-y-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B84420]">
            <UserPlus className="w-4 h-4" />
            <span>Grant Workspace Access</span>
          </div>

          {isOwner ? (
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#242321] mb-1">
                  Collaborator Firebase UID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Paste teammate's Firebase UID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] font-mono text-xs text-[#242321]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#242321] mb-1">
                  Collaborator Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Priya Sharma (Wedding Planner)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm text-[#242321]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#242321] mb-1">
                  Collaborator Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="priya@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm text-[#242321]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#242321] mb-1">
                  Permission Level
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as CollaboratorRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm text-[#242321]"
                >
                  <option value="editor">
                    Editor (Can update budgets, tasks, vendors & guests)
                  </option>
                  <option value="viewer">
                    Viewer (Read-only access to blueprint & trackers)
                  </option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#B84420] hover:bg-[#9B3616] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Add Collaborator to Event
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-xs text-[#77736D] flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#B84420] shrink-0 mt-0.5" />
              <span>Only the Event Owner can add or remove workspace collaborators.</span>
            </div>
          )}

          <div className="pt-4 border-t border-[#E6E0D7] space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#77736D]">
              Your Account Identity
            </div>
            <div className="p-3 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] font-mono text-xs text-[#242321] break-all">
              UID: {currentUserUid}
            </div>
            <div className="text-[11px] text-[#77736D]">Signed in as {currentUserEmail}</div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-[#E6E0D7] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B84420]">
              <ShieldCheck className="w-4 h-4" />
              <span>Active Event Access Roster</span>
            </div>
            <span className="text-xs font-mono text-[#77736D]">
              {collaborators.length + 1} Authorized Member(s)
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#242321] text-[#F8F6F1] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>{event.ownerName || 'Primary Event Owner'}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#87977E]" />
                </div>
                <div className="font-mono text-xs text-white/70 mt-0.5">
                  UID: {event.ownerId}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#B84420] text-white text-[10px] font-mono font-semibold uppercase">
                Owner
              </span>
            </div>

            {collaborators.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-center text-xs text-[#77736D]">
                No additional co-organizers added yet. Invite family or planners on the left.
              </div>
            ) : (
              collaborators.map((collab) => (
                <div
                  key={collab.userId}
                  className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#242321] truncate">
                      {collab.displayName}
                    </div>
                    <div className="text-xs text-[#77736D] truncate mt-0.5">
                      {collab.email} · <span className="font-mono">UID: {collab.userId}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2.5 py-1 rounded-md bg-white border border-[#E6E0D7] text-xs font-mono font-semibold uppercase text-[#242321]">
                      {collab.role}
                    </span>
                    {isOwner && (
                      <button
                        onClick={() => onRemoveCollaborator(collab.userId)}
                        className="p-1.5 rounded-lg text-[#77736D] hover:text-[#B42318] hover:bg-[#B42318]/10 transition-colors cursor-pointer"
                        title="Revoke Access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
