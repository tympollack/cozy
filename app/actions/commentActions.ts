'use server';

import { createServerClient } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  is_toxic: boolean;
  created_at: string;
}

/**
 * Checks a comment for toxicity using the OpenAI Moderation API.
 */
export async function checkToxicity(text: string): Promise<{ isToxic: boolean }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[checkToxicity] Missing OPENAI_API_KEY. Defaulting to safe.');
      return { isToxic: false };
    }

    const response = await openai.moderations.create({ input: text });
    const isToxic = response.results[0].flagged;
    
    return { isToxic };
  } catch (error) {
    console.error('[checkToxicity] API Error:', error);
    // Default to safely allowing the comment if the AI service goes down
    return { isToxic: false };
  }
}

/**
 * Submits a comment. If acceptPenalty is true, the user has opted to post
 * despite toxicity, which applies the Grumpy Cloud penalty.
 */
export async function submitComment(postId: string, text: string, acceptPenalty: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required.' };
    }

    // Insert the comment
    const { error: insertError } = await supabase.schema('cozy').from('comments').insert({
      post_id: postId,
      user_id: user.id,
      text: text,
      is_toxic: acceptPenalty,
    });

    if (insertError) {
      console.error('[submitComment] Insert error:', insertError.message);
      return { success: false, error: 'Failed to post comment.' };
    }

    // Apply the penalty if they accepted it
    if (acceptPenalty) {
      const { error: penaltyError } = await supabase
        .schema('cozy')
        .from('users')
        .update({ is_toxic: true })
        .eq('id', user.id);

      if (penaltyError) {
        console.error('[submitComment] Penalty error:', penaltyError.message);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[submitComment] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Fetches comments for a given post.
 */
export async function getComments(postId: string): Promise<Comment[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .schema('cozy')
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[getComments] Select error:', error.message);
      return [];
    }

    return data as Comment[];
  } catch (error) {
    console.error('[getComments] Unexpected error:', error);
    return [];
  }
}
