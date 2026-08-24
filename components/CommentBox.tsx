'use client';

import React, { useState } from 'react';
import { checkToxicity, submitComment } from '@/app/actions/commentActions';
import { Loader2, AlertTriangle } from 'lucide-react';

interface CommentBoxProps {
  postId: string;
  onCommentAdded?: () => void;
}

export function CommentBox({ postId, onCommentAdded }: CommentBoxProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isSubmittingPenalty, setIsSubmittingPenalty] = useState(false);

  const handlePost = async () => {
    if (!text.trim()) return;
    setIsLoading(true);

    try {
      const { isToxic } = await checkToxicity(text);
      if (isToxic) {
        setShowWarningModal(true);
      } else {
        await submitComment(postId, text, false);
        setText('');
        if (onCommentAdded) onCommentAdded();
      }
    } catch (error) {
      console.error('Error checking toxicity:', error);
      // Fallback in case of unexpected frontend error during check
      await submitComment(postId, text, false);
      setText('');
      if (onCommentAdded) onCommentAdded();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptPenalty = async () => {
    setIsSubmittingPenalty(true);
    try {
      await submitComment(postId, text, true);
      setText('');
      setShowWarningModal(false);
      if (onCommentAdded) onCommentAdded();
    } catch (error) {
      console.error('Error posting comment with penalty:', error);
    } finally {
      setIsSubmittingPenalty(false);
    }
  };

  return (
    <div className="w-full mt-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Leave a positive tip..."
          className="flex-1 bg-white dark:bg-[#14100e] border border-amber-300 dark:border-amber-600/40 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-amber-400 text-stone-900 dark:text-amber-100 placeholder:text-stone-400 dark:placeholder:text-amber-200/40 text-xs font-600 shadow-xs"
          disabled={isLoading || isSubmittingPenalty}
        />
        <button
          onClick={handlePost}
          disabled={!text.trim() || isLoading || isSubmittingPenalty}
          className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-800 text-xs rounded-full disabled:opacity-50 flex items-center justify-center min-w-[80px] shadow-xs cursor-pointer"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post'}
        </button>
      </div>

      {showWarningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/70">
          <div className="cozy-glass rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-amber-300/40 dark:border-amber-600/30 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/70 border border-red-200 dark:border-red-800/40 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h2 className="text-xl font-900 text-stone-900 dark:text-amber-50 mb-3">
              Hold on. This comment violates our Positivity Only guidelines.
            </h2>
            
            <p className="text-stone-700 dark:text-amber-200/80 mb-6 leading-relaxed text-xs font-500">
              Posting this will apply the Grumpy Cloud penalty to your account, resulting in a 20% daily point decay. Are you sure you want to proceed?
            </p>
            
            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={() => setShowWarningModal(false)}
                disabled={isSubmittingPenalty}
                className="w-full py-3 px-4 bg-white dark:bg-[#281e19] text-stone-800 dark:text-amber-100 font-800 text-xs rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-amber-50 dark:hover:bg-[#342821] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                onClick={handleAcceptPenalty}
                disabled={isSubmittingPenalty}
                className="w-full py-3 px-4 bg-red-600 text-white font-900 text-xs rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isSubmittingPenalty ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Accept Penalty & Post'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
