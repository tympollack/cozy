'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Shield,
  Crown,
  UserCheck,
  UserX,
  Edit2,
  Check,
  TrendingUp,
  AlertTriangle,
  Users,
  Sparkles,
} from 'lucide-react';
import {
  updateGroupName,
  removeGroupMember,
  updateMemberRole,
  upgradeGroupTier,
} from '@/app/actions/groupActions';
import type { GroupRow, GroupMemberRow } from '@/app/actions/groupActions';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';
import { InviteCodePill } from './InviteCodePill';

interface AdminGroupModalProps {
  group: GroupRow;
  members: GroupMemberRow[];
  currentUserId: string;
  onClose: () => void;
}

export function AdminGroupModal({
  group,
  members,
  currentUserId,
  onClose,
}: AdminGroupModalProps) {
  const [name, setName] = useState(group.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'members' | 'tiers'>('settings');

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [memberToDelete, setMemberToDelete] = useState<GroupMemberRow | null>(null);

  const currentMeta = GROUP_TYPE_META[group.type] ?? GROUP_TYPE_META['household'];
  const isFuturistic = currentMeta.palette === 'futuristic';

  const handleSaveName = () => {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await updateGroupName(group.id, name);
      if (!res.success) {
        setError(res.error ?? 'Failed to update name.');
      } else {
        setIsEditingName(false);
        setSuccessMsg('Group name updated!');
        setTimeout(() => setSuccessMsg(null), 2500);
      }
    });
  };

  const handleRoleToggle = (member: GroupMemberRow) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    setError(null);
    startTransition(async () => {
      const res = await updateMemberRole(group.id, member.user_id, newRole);
      if (!res.success) {
        setError(res.error ?? 'Failed to update role.');
      } else {
        setSuccessMsg(`Updated ${member.display_name}'s role.`);
        setTimeout(() => setSuccessMsg(null), 2500);
      }
    });
  };

  const handleRemoveMember = () => {
    if (!memberToDelete) return;
    setError(null);
    startTransition(async () => {
      const res = await removeGroupMember(group.id, memberToDelete.user_id);
      if (!res.success) {
        setError(res.error ?? 'Failed to remove member.');
      } else {
        setMemberToDelete(null);
        setSuccessMsg(`Removed ${memberToDelete.display_name}.`);
        setTimeout(() => setSuccessMsg(null), 2500);
      }
    });
  };

  const handleUpgradeTier = (targetType: string, minReq: number) => {
    setError(null);
    startTransition(async () => {
      const res = await upgradeGroupTier(group.id, targetType, minReq);
      if (!res.success) {
        setError(res.error ?? 'Failed to upgrade tier.');
      } else {
        setSuccessMsg(`Upgraded group to ${GROUP_TYPE_META[targetType]?.label}!`);
        setTimeout(() => setSuccessMsg(null), 2500);
      }
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg rounded-3xl p-6 cozy-glass border border-amber-300/40 dark:border-amber-600/30 shadow-2xl space-y-5 max-h-[85vh] flex flex-col"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-amber-900/10 dark:border-amber-500/20 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-900 text-stone-900 dark:text-amber-50">Group Admin Portal</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-700 dark:text-amber-200 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 text-xs font-700 flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs font-700 flex items-center gap-2">
            <Check size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl flex-shrink-0 text-xs font-800">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-amber-400 text-stone-950 shadow-sm font-900'
                : 'text-stone-700 dark:text-amber-200/80 hover:text-stone-900 dark:hover:text-amber-100'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'bg-amber-400 text-stone-950 shadow-sm font-900'
                : 'text-stone-700 dark:text-amber-200/80 hover:text-stone-900 dark:hover:text-amber-100'
            }`}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('tiers')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'tiers'
                ? 'bg-amber-400 text-stone-950 shadow-sm font-900'
                : 'text-stone-700 dark:text-amber-200/80 hover:text-stone-900 dark:hover:text-amber-100'
            }`}
          >
            Tier Upgrades
          </button>
        </div>

        {/* Tab 1: Group Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Group Name Editor */}
            <div className="space-y-2 bg-white/60 dark:bg-[#201813] p-4 rounded-2xl border border-amber-900/10 dark:border-amber-500/20 shadow-xs">
              <label className="block text-xs font-800 text-stone-700 dark:text-amber-300">Group Name</label>
              {isEditingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={48}
                    className="flex-1 rounded-xl px-3 py-2 text-sm font-700 outline-none bg-white dark:bg-[#14100e] text-stone-900 dark:text-amber-100 border border-amber-400"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-900 text-xs shadow-md hover:bg-amber-400 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-base font-900 text-stone-900 dark:text-amber-50">{group.name}</span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-2 text-stone-600 dark:text-amber-300 hover:text-stone-900 dark:hover:text-amber-100 cursor-pointer"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Invite Code & Share Pill */}
            <div className="space-y-2 bg-white/60 dark:bg-[#201813] p-4 rounded-2xl border border-amber-900/10 dark:border-amber-500/20 shadow-xs">
              <label className="block text-xs font-800 text-stone-700 dark:text-amber-300">Invite Code & Sharing</label>
              <InviteCodePill
                code={group.invite_code}
                groupName={group.name}
                isFuturistic={isFuturistic}
              />
              <p className="text-[11px] text-stone-600 dark:text-amber-200/70 pt-1 font-500">
                Tap to copy code · Press & hold or click share to invite via Messaging apps.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Member Management */}
        {activeTab === 'members' && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {(Array.isArray(members) ? members : []).map((member) => {
              const isSelf = member.user_id === currentUserId;
              const displayName = member.display_name || 'Cozy Neighbor';

              return (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/60 dark:bg-[#201813] border border-amber-900/10 dark:border-amber-500/20 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-xs font-900 text-stone-950 flex-shrink-0">
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-800 text-stone-900 dark:text-amber-100 truncate flex items-center gap-1">
                        <span>{displayName}</span>
                        {member.role === 'admin' && <Crown size={11} className="text-amber-500 flex-shrink-0" />}
                        {isSelf && <span className="text-[10px] opacity-60">(You)</span>}
                      </p>
                      <p className="text-[10px] text-stone-600 dark:text-amber-200/70 font-500">
                        {member.points ?? 0} personal pts · {member.role}
                      </p>
                    </div>
                  </div>

                  {!isSelf && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRoleToggle(member)}
                        disabled={isPending}
                        className={`p-2 rounded-xl text-xs font-800 transition-all cursor-pointer ${
                          member.role === 'admin'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-600/40'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                        }`}
                        title={member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                      >
                        {member.role === 'admin' ? <UserCheck size={14} /> : <Crown size={14} />}
                      </button>

                      <button
                        onClick={() => setMemberToDelete(member)}
                        disabled={isPending}
                        className="p-2 rounded-xl text-xs font-800 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-200 cursor-pointer"
                        title="Remove Member"
                      >
                        <UserX size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Confirm Remove Member Dialog */}
            {memberToDelete && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 text-red-800 dark:text-red-300 space-y-2">
                <p className="text-xs font-800">
                  Remove {memberToDelete.display_name} from {group.name}?
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setMemberToDelete(null)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-700 bg-white dark:bg-[#281e19] text-stone-800 dark:text-amber-100 border border-stone-300 dark:border-stone-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRemoveMember}
                    disabled={isPending}
                    className="flex-1 py-1.5 rounded-xl text-xs font-800 bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                  >
                    Confirm Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Tier Upgrades */}
        {activeTab === 'tiers' && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            <p className="text-xs text-stone-700 dark:text-amber-200/80 font-500">
              Upgrade your group scale as your community grows. Tier upgrades expand isometric map capacity and unlock new theme aesthetics.
            </p>

            {Object.entries(GROUP_TYPE_META).map(([typeKey, meta]) => {
              const isCurrent = typeKey === group.type;
              const hasMinMembers = members.length >= meta.minToUpgrade;

              return (
                <div
                  key={typeKey}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    isCurrent
                      ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 dark:border-amber-500 font-800 shadow-xs'
                      : 'bg-white/60 dark:bg-[#201813] border-amber-900/10 dark:border-amber-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <p className="text-xs font-900 text-stone-900 dark:text-amber-50 flex items-center gap-1.5">
                        <span>{meta.label}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-900 px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                            Current Scale
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-stone-600 dark:text-amber-200/70 font-500">
                        Capacity: ≤ {meta.capacity} · Min Members: {meta.minToUpgrade}
                      </p>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleUpgradeTier(typeKey, meta.minToUpgrade)}
                      disabled={isPending || !hasMinMembers}
                      className={`px-3 py-1.5 rounded-xl text-xs font-900 transition-all cursor-pointer ${
                        hasMinMembers
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-amber-950 shadow-md hover:scale-105'
                          : 'bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {hasMinMembers ? 'Upgrade' : `Need ${meta.minToUpgrade} Members`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
