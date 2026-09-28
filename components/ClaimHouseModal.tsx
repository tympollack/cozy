'use client';

import React, { useState, useEffect } from 'react';
import {
  Home,
  Users,
  CheckCircle2,
  Sparkles,
  Loader2,
  MapPin,
  Camera,
  Mail,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import {
  claimPlotOneTap,
  getVillageSuggestions,
  SuggestedVillage,
  verifyProximity,
  submitInteriorProof,
  triggerPostcard,
} from '@/app/actions/claimActions';
import { joinGroup } from '@/app/actions/groupActions';
import { useCozyStore } from '@/store/useCozyStore';
import { useModalBackButton } from '@/hooks/useModalBackButton';

interface ClaimHouseModalProps {
  postId: string;
  onClose: () => void;
  onClaimSuccess?: () => void;
}

type ModalTab = 'one_tap_claim' | 'village_match' | 'postal_verify';

export function ClaimHouseModal({ postId, onClose, onClaimSuccess }: ClaimHouseModalProps) {
  const { vibeStatus, groupId, setGroupId } = useCozyStore();
  const [activeTab, setActiveTab] = useState<ModalTab>('one_tap_claim');
  const [isLoading, setIsLoading] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Village matching state
  const [villageSuggestions, setVillageSuggestions] = useState<SuggestedVillage[]>([]);
  const [joiningVillageId, setJoiningVillageId] = useState<string | null>(null);
  const [joinedVillageName, setJoinedVillageName] = useState<string | null>(null);
  const [customInviteCode, setCustomInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Advanced postal verification state (legacy fallback)
  const [postalStep, setPostalStep] = useState<1 | 2 | 3>(1);

  useModalBackButton({ isOpen: true, onClose });

  useEffect(() => {
    // Load village suggestions based on friendly vibe
    getVillageSuggestions(vibeStatus)
      .then((suggs) => {
        setVillageSuggestions(suggs);
      })
      .catch(() => {});
  }, [vibeStatus]);

  // --- One-Tap Plot Claim ---
  const handleOneTapClaim = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await claimPlotOneTap(postId);
      if (res.success) {
        setIsClaimed(true);
        setClaimMessage(res.message || '✨ Plot claimed successfully! Welcome to your new home.');
        if (onClaimSuccess) onClaimSuccess();
      } else {
        setErrorMsg(res.error || 'Failed to claim space.');
      }
    } catch {
      setErrorMsg('An unexpected error occurred while claiming.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Village Joining ---
  const handleJoinVillage = async (village: SuggestedVillage) => {
    setJoiningVillageId(village.id);
    setInviteError('');
    try {
      const res = await joinGroup(village.inviteCode);
      if (res.success && res.groupId) {
        setGroupId(res.groupId);
        setJoinedVillageName(village.name);
      } else {
        setInviteError(res.error || 'Failed to join village.');
      }
    } catch {
      setInviteError('Unable to connect to village.');
    } finally {
      setJoiningVillageId(null);
    }
  };

  const handleJoinCustomCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInviteCode.trim()) return;

    setIsLoading(true);
    setInviteError('');
    try {
      const res = await joinGroup(customInviteCode.trim());
      if (res.success && res.groupId) {
        setGroupId(res.groupId);
        setJoinedVillageName('Custom Neighborhood');
      } else {
        setInviteError(res.error || 'Invalid village invite code.');
      }
    } catch {
      setInviteError('Unable to join village with code.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Advanced Postal / Proximity Fallback ---
  const handleProximityCheck = async () => {
    setIsLoading(true);
    setErrorMsg('');
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await verifyProximity(
            postId,
            position.coords.latitude,
            position.coords.longitude
          );
          if (res.success) {
            setPostalStep(2);
          } else {
            setErrorMsg(res.error || 'Proximity check failed.');
          }
        } catch {
          setErrorMsg('An error occurred during location check.');
        } finally {
          setIsLoading(false);
        }
      },
      (geoError) => {
        setErrorMsg(`Location error: ${geoError.message}`);
        setIsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleInteriorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg('');
    try {
      const mockUploadedUrl = `https://pub-mock.r2.dev/interior-${postId}.jpg`;
      const res = await submitInteriorProof(postId, mockUploadedUrl);
      if (res.success) {
        const postcardRes = await triggerPostcard(postId);
        if (postcardRes.success) {
          setPostalStep(3);
        } else {
          setErrorMsg(postcardRes.error || 'Failed to trigger verification postcard.');
        }
      } else {
        setErrorMsg(res.error || 'Failed to submit interior proof.');
      }
    } catch {
      setErrorMsg('An error occurred during interior proof submission.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60 overflow-y-auto">
      <div className="cozy-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-amber-300/40 dark:border-amber-600/30 flex flex-col relative my-auto">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-amber-200/40 dark:border-stone-700 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('one_tap_claim')}
              className={`px-3 py-1.5 rounded-xl text-xs font-800 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'one_tap_claim'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Home size={14} />
              <span>One-Tap Claim</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('village_match')}
              className={`px-3 py-1.5 rounded-xl text-xs font-800 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'village_match'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Users size={14} />
              <span>Village Matching</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close claim modal"
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm font-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* ── TAB 1: Streamlined One-Tap Claim ── */}
        {activeTab === 'one_tap_claim' && (
          <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600/40 rounded-full flex items-center justify-center mb-4">
              <Home className="w-8 h-8 text-amber-700 dark:text-amber-400" />
            </div>

            <h2 className="text-2xl font-900 text-stone-900 dark:text-amber-50 mb-2">
              Claim Your Space Plot
            </h2>

            <p className="text-stone-700 dark:text-amber-200/80 mb-6 leading-relaxed text-sm font-500 max-w-sm">
              Claim this cozy plot as your home base. Decorate your space with stickers, welcome
              porch warmth from neighbors, and build your peaceful habit routine.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 rounded-xl text-xs font-700 w-full text-left">
                {errorMsg}
              </div>
            )}

            {isClaimed ? (
              <div className="w-full p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex flex-col items-center gap-2 mb-4">
                <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-800">{claimMessage}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300/80">
                  Ready to connect with nearby friends? Tap Village Matching above.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('village_match')}
                  className="mt-2 py-2 px-4 bg-emerald-600 text-white rounded-xl text-xs font-800 hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Find a Village →
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleOneTapClaim}
                disabled={isLoading}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:opacity-95 text-white font-900 rounded-2xl hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Claim Space Plot Now ✨</span>
                  </>
                )}
              </button>
            )}

            {/* Advanced Physical Postcard Toggle Link */}
            <div className="mt-5 border-t border-amber-200/30 dark:border-stone-800 pt-3 w-full">
              <button
                type="button"
                onClick={() => setActiveTab('postal_verify')}
                className="text-xs font-700 text-stone-500 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer underline"
              >
                Optional: Physical Postal / GPS Verification
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 2: Automatic Village Matching ── */}
        {activeTab === 'village_match' && (
          <div className="flex flex-col w-full text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-4">
              <h2 className="text-xl font-900 text-stone-900 dark:text-amber-50 mb-1">
                Suggested Villages
              </h2>
              <p className="text-xs text-stone-600 dark:text-amber-200/80">
                Matched to your atmospheric vibe: <span className="font-800 capitalize">🌿 {vibeStatus}</span>
              </p>
            </div>

            {joinedVillageName && (
              <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-800 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>You joined {joinedVillageName}! Welcome neighbor.</span>
              </div>
            )}

            {inviteError && (
              <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 rounded-xl text-xs font-700">
                {inviteError}
              </div>
            )}

            {/* Suggested village list */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 mb-4">
              {villageSuggestions.map((village) => {
                const isCurrentGroup = groupId === village.id;
                const isJoining = joiningVillageId === village.id;

                return (
                  <div
                    key={village.id}
                    className="p-3.5 rounded-2xl border border-amber-200/50 dark:border-stone-700/60 bg-white/70 dark:bg-stone-850/70 backdrop-blur-xs flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{village.emoji}</span>
                      <div>
                        <p className="text-xs font-900 text-stone-900 dark:text-amber-50">
                          {village.name}
                        </p>
                        <p className="text-[11px] text-stone-600 dark:text-amber-200/70 line-clamp-1">
                          {village.description}
                        </p>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-700">
                          {village.memberCount} neighbors
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isCurrentGroup || isJoining}
                      onClick={() => handleJoinVillage(village)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-900 transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                        isCurrentGroup
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
                      }`}
                    >
                      {isJoining ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : isCurrentGroup ? (
                        'Joined'
                      ) : (
                        'Join'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Invite Code Input */}
            <form
              onSubmit={handleJoinCustomCode}
              className="border-t border-amber-200/40 dark:border-stone-700 pt-3"
            >
              <p className="text-[11px] font-800 text-stone-600 dark:text-stone-400 mb-1.5 uppercase tracking-wider">
                Have a friend&apos;s village invite code?
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInviteCode}
                  onChange={(e) => setCustomInviteCode(e.target.value)}
                  placeholder="e.g. cozy-glade"
                  className="flex-1 px-3 py-2 rounded-xl text-xs border border-amber-300/60 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={isLoading || !customInviteCode.trim()}
                  className="px-4 py-2 bg-stone-800 dark:bg-amber-600 hover:opacity-90 text-white rounded-xl text-xs font-800 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  Join with Code
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB 3: Optional Postal Verification (Advanced) ── */}
        {activeTab === 'postal_verify' && (
          <div className="flex flex-col items-center text-center animate-in fade-in duration-200">
            <button
              type="button"
              onClick={() => setActiveTab('one_tap_claim')}
              className="self-start mb-3 text-xs font-800 text-amber-700 dark:text-amber-400 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={12} />
              <span>Back to One-Tap Claim</span>
            </button>

            {postalStep === 1 && (
              <>
                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600/40 rounded-full flex items-center justify-center mb-3">
                  <MapPin className="w-7 h-7 text-amber-700 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-900 text-stone-900 dark:text-amber-50 mb-1">
                  GPS Verification
                </h3>
                <p className="text-xs text-stone-600 dark:text-amber-200/80 mb-5 leading-relaxed max-w-xs">
                  Verify you are within 50 meters of the physical space for verified tier badges.
                </p>
                {errorMsg && (
                  <div className="mb-3 p-2 bg-red-50 text-red-700 rounded-xl text-xs font-700">
                    {errorMsg}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleProximityCheck}
                  disabled={isLoading}
                  className="w-full py-3 px-5 bg-amber-600 text-white font-900 rounded-2xl text-xs cursor-pointer"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Check Location'}
                </button>
              </>
            )}

            {postalStep === 2 && (
              <>
                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600/40 rounded-full flex items-center justify-center mb-3">
                  <Camera className="w-7 h-7 text-amber-700 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-900 text-stone-900 dark:text-amber-50 mb-1">
                  Interior Proof
                </h3>
                <p className="text-xs text-stone-600 dark:text-amber-200/80 mb-5 leading-relaxed max-w-xs">
                  Take a live photo of the interior of your space.
                </p>
                <div className="relative w-full">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleInteriorUpload}
                    disabled={isLoading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <button
                    type="button"
                    disabled={isLoading}
                    className="w-full py-3 px-5 bg-amber-600 text-white font-900 rounded-2xl text-xs cursor-pointer"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Open Camera'}
                  </button>
                </div>
              </>
            )}

            {postalStep === 3 && (
              <>
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 rounded-full flex items-center justify-center mb-3">
                  <ShieldCheck className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-lg font-900 text-stone-900 dark:text-amber-50 mb-1">
                  Postcard PIN En Route
                </h3>
                <p className="text-xs text-stone-600 dark:text-amber-200/80 mb-5 leading-relaxed max-w-xs">
                  A verification postcard with your PIN has been dispatched via postal delivery.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-5 bg-emerald-600 text-white font-900 rounded-2xl text-xs cursor-pointer"
                >
                  Done
                </button>
              </>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-700 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

