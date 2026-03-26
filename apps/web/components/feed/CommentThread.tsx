"use client";

import React, { useState } from "react";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Trash2, Reply } from "lucide-react";
import { formatRelativeTime } from "../../lib/utils";
import { useComments, useCreateComment, useDeleteComment } from "../../hooks/useFeed";
import { useAuthStore } from "../../stores/auth";
import type { Comment } from "shared-types";

interface CommentItemProps {
  comment: Comment;
  postId: string;
  depth?: number;
}

function CommentItem({ comment, postId, depth = 0 }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const { user } = useAuthStore();
  const createComment = useCreateComment(postId);
  const deleteComment = useDeleteComment(postId);

  const canDelete =
    user && (user.id === comment.author?.id || user.role === "admin" || user.role === "moderator");

  const handleReply = async () => {
    if (!replyText.trim()) return;
    await createComment.mutateAsync({ body: replyText, parent_id: comment.id });
    setReplyText("");
    setShowReplyForm(false);
  };

  return (
    <div className={`flex gap-3 ${depth > 0 ? "ml-8 mt-3" : ""}`}>
      <Avatar
        src={comment.author?.avatar_url}
        name={comment.author?.full_name ?? "User"}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="bg-muted/50 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-semibold text-sm">{comment.author?.full_name}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>
          <p className="text-sm text-foreground">{comment.body}</p>
        </div>

        <div className="flex items-center gap-2 mt-1 px-1">
          {depth === 0 && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <Reply className="h-3 w-3" />
              Responder
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => deleteComment.mutate(comment.id)}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Deletar
            </button>
          )}
        </div>

        {showReplyForm && (
          <div className="mt-2 flex gap-2">
            <Textarea
              placeholder="Escreva uma resposta..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={handleReply}
                disabled={!replyText.trim() || createComment.isPending}
              >
                Enviar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowReplyForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies?.map((reply) => (
          <CommentItem key={reply.id} comment={reply} postId={postId} depth={depth + 1} />
        ))}
      </div>
    </div>
  );
}

interface CommentThreadProps {
  postId: string;
}

export function CommentThread({ postId }: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const { data: comments, isLoading } = useComments(postId);
  const createComment = useCreateComment(postId);
  const { user } = useAuthStore();

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await createComment.mutateAsync({ body: newComment });
    setNewComment("");
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base">
        Comentários {comments ? `(${comments.length})` : ""}
      </h3>

      {user && (
        <div className="flex gap-3">
          <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Escreva um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || createComment.isPending}
            >
              {createComment.isPending ? "Enviando..." : "Comentar"}
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-10 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {comments?.map((comment) => (
        <CommentItem key={comment.id} comment={comment} postId={postId} />
      ))}

      {comments?.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-4">
          Seja o primeiro a comentar!
        </p>
      )}
    </div>
  );
}
