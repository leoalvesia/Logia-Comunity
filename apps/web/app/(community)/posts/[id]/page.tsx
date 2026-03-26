"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PostCard } from "../../../../components/feed/PostCard";
import { CommentThread } from "../../../../components/feed/CommentThread";
import { usePost } from "../../../../hooks/useFeed";
import { Button } from "../../../../components/ui/button";

export default function PostDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: post, isLoading, error } = usePost(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Publicação não encontrada.</p>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao feed
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao feed
        </Button>
      </Link>

      <PostCard post={post} showFullBody />

      <div className="border rounded-xl p-5">
        <CommentThread postId={post.id} />
      </div>
    </div>
  );
}
