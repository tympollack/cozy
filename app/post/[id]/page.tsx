import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { getPost } from '@/app/actions/profileActions';
import { PostDetail } from './PostDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Post — Cozy`,
    description: 'A cozy space shared on Cozy.',
    openGraph: { images: [] },
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { post, error } = await getPost(id);

  if (!post || error) {
    notFound();
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #faf7f2 0%, #f5ede0 100%)' }}
    >
      <PostDetail post={post} currentUserId={user?.id ?? null} />
    </div>
  );
}
