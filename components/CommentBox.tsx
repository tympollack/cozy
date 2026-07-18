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
          className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 text-zinc-900 dark:text-zinc-100"
          disabled={isLoading || isSubmittingPenalty}
        />
        <button
          onClick={handlePost}
          disabled={!text.trim() || isLoading || isSubmittingPenalty}
          className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 flex items-center justify-center min-w-[80px]"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post'}
        </button>
      </div>

      {showWarningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-white/80 dark:bg-black/80">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
              Hold on. This comment violates our Positivity Only guidelines.
            </h2>
            
            <p className="text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
              Posting this will apply the Grumpy Cloud penalty to your account, resulting in a 20% daily point decay. Are you sure you want to proceed?
            </p>
            
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => setShowWarningModal(false)}
                disabled={isSubmittingPenalty}
                className="w-full py-3.5 px-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleAcceptPenalty}
                disabled={isSubmittingPenalty}
                className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isSubmittingPenalty ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
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
