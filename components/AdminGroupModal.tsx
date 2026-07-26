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
        className="w-full max-w-lg rounded-3xl p-6 cozy-glass border border-[--cozy-amber]/30 shadow-2xl space-y-5 max-h-[85vh] flex flex-col"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[--cozy-amber]/20 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-800 text-[--cozy-bark]">Group Admin Portal</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[--cozy-muted] hover:bg-black/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-400 text-xs font-700 flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-400 text-xs font-700 flex items-center gap-2">
            <Check size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl flex-shrink-0 text-xs font-700">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-zinc-800 text-[--cozy-bark] shadow-sm font-800'
                : 'text-[--cozy-muted] hover:text-[--cozy-bark]'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'members'
                ? 'bg-white dark:bg-zinc-800 text-[--cozy-bark] shadow-sm font-800'
                : 'text-[--cozy-muted] hover:text-[--cozy-bark]'
            }`}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('tiers')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'tiers'
                ? 'bg-white dark:bg-zinc-800 text-[--cozy-bark] shadow-sm font-800'
                : 'text-[--cozy-muted] hover:text-[--cozy-bark]'
            }`}
          >
            Tier Upgrades
          </button>
        </div>

        {/* Tab 1: Group Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Group Name Editor */}
            <div className="space-y-2 bg-white/40 dark:bg-zinc-800/40 p-4 rounded-2xl border border-white/20">
              <label className="block text-xs font-700 text-[--cozy-muted]">Group Name</label>
              {isEditingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={48}
                    className="flex-1 rounded-xl px-3 py-2 text-sm font-600 outline-none bg-white dark:bg-zinc-900 border border-amber-400"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-stone-900 font-800 text-xs shadow-md hover:bg-amber-300"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-base font-800 text-[--cozy-bark]">{group.name}</span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-2 text-[--cozy-muted] hover:text-[--cozy-bark]"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Invite Code & Share Pill */}
            <div className="space-y-2 bg-white/40 dark:bg-zinc-800/40 p-4 rounded-2xl border border-white/20">
              <label className="block text-xs font-700 text-[--cozy-muted]">Invite Code & Sharing</label>
              <InviteCodePill
                code={group.invite_code}
                groupName={group.name}
                isFuturistic={isFuturistic}
              />
              <p className="text-[11px] text-[--cozy-muted] pt-1">
                Tap to copy code · Press & hold or click share to invite via Messaging apps.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Member Management */}
        {activeTab === 'members' && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {members.map((member) => {
              const isSelf = member.user_id === currentUserId;

              return (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/40 dark:bg-zinc-800/40 border border-white/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-400/80 flex items-center justify-center text-xs font-800 text-stone-900 flex-shrink-0">
                      {member.display_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-700 text-[--cozy-bark] truncate flex items-center gap-1">
                        <span>{member.display_name}</span>
                        {member.role === 'admin' && <Crown size={11} className="text-amber-500 flex-shrink-0" />}
                        {isSelf && <span className="text-[10px] opacity-60">(You)</span>}
                      </p>
                      <p className="text-[10px] text-[--cozy-muted]">
                        {member.points} personal pts · {member.role}
                      </p>
                    </div>
                  </div>

                  {!isSelf && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRoleToggle(member)}
                        disabled={isPending}
                        className={`p-2 rounded-xl text-xs font-700 transition-all ${
                          member.role === 'admin'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-zinc-200/70 text-zinc-700 hover:bg-zinc-300'
                        }`}
                        title={member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                      >
                        {member.role === 'admin' ? <UserCheck size={14} /> : <Crown size={14} />}
                      </button>

                      <button
                        onClick={() => setMemberToDelete(member)}
                        disabled={isPending}
                        className="p-2 rounded-xl text-xs font-700 bg-red-100 dark:bg-red-950/40 text-red-600 hover:bg-red-200"
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
                <p className="text-xs font-700">
                  Remove {memberToDelete.display_name} from {group.name}?
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setMemberToDelete(null)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-700 bg-white text-zinc-700 border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRemoveMember}
                    disabled={isPending}
                    className="flex-1 py-1.5 rounded-xl text-xs font-700 bg-red-600 text-white hover:bg-red-700"
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
            <p className="text-xs text-[--cozy-muted]">
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
                      ? 'bg-amber-100/80 border-amber-400 font-800'
                      : 'bg-white/40 dark:bg-zinc-800/40 border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <p className="text-xs font-800 text-[--cozy-bark] flex items-center gap-1.5">
                        <span>{meta.label}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-800 px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                            Current Scale
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-[--cozy-muted]">
                        Capacity: ≤ {meta.capacity} · Min Members: {meta.minToUpgrade}
                      </p>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleUpgradeTier(typeKey, meta.minToUpgrade)}
                      disabled={isPending || !hasMinMembers}
                      className={`px-3 py-1.5 rounded-xl text-xs font-800 transition-all ${
                        hasMinMembers
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md hover:scale-105'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
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
