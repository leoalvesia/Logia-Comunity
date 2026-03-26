"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Eye, Pin, MoreHorizontal, Trash2, Edit } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { formatRelativeTime } from "../../lib/utils";
import { useReactToPost, useDeletePost } from "../../hooks/useFeed";
import { useAuthStore } from "../../stores/auth";
import type { Post } from "shared-types";

interface PostCardProps {
  post: Post;
  showFullBody?: boolean;
}

export function PostCard({ post, showFullBody = false }: PostCardProps) {
  const { user } = useAuthStore();
  const reactMutation = useReactToPost();
  const deleteMutation = useDeletePost();

  const sanitizedBody = DOMPurify.sanitize(post.body, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "code", "pre",
      "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "a", "img",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "class", "target", "rel"],
  });

  const canDelete =
    user && (user.id === post.author?.id || user.role === "admin" || user.role === "moderator");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar
                src={post.author?.avatar_url}
                name={post.author?.full_name ?? "User"}
                size="md"
              />
              <div className="min-w-0">
                <Link
                  href={`/members/${post.author?.username}`}
                  className="font-semibold text-sm hover:text-primary truncate block"
                >
                  {post.author?.full_name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(post.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {post.is_pinned && (
                <Badge variant="secondary" className="gap-1">
                  <Pin className="h-3 w-3" />
                  Fixado
                </Badge>
              )}
              {post.category && (
                <Badge
                  style={{ backgroundColor: post.category.color ?? undefined }}
                  className="text-white"
                >
                  {post.category.icon} {post.category.name}
                </Badge>
              )}
            </div>
          </div>

          {post.title && (
            <h2 className="font-display font-bold text-lg mt-2 leading-snug">
              {post.title}
            </h2>
          )}
        </CardHeader>

        <CardContent className="py-0">
          <div
            className={`prose prose-sm max-w-none text-foreground ${!showFullBody ? "line-clamp-4" : ""}`}
            dangerouslySetInnerHTML={{ __html: sanitizedBody }}
          />
          {!showFullBody && (
            <Link
              href={`/posts/${post.id}`}
              className="text-primary text-sm mt-2 block hover:underline"
            >
              Continuar lendo...
            </Link>
          )}
        </CardContent>

        <CardFooter className="pt-3 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 ${post.user_has_liked ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => reactMutation.mutate({ id: post.id })}
              disabled={reactMutation.isPending}
            >
              <Heart className={`h-4 w-4 ${post.user_has_liked ? "fill-current" : ""}`} />
              <span className="text-sm">{post.likes_count}</span>
            </Button>

            <Link href={`/posts/${post.id}`}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">{post.comments_count}</span>
              </Button>
            </Link>

            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Eye className="h-4 w-4" />
              <span>{post.views}</span>
            </div>
          </div>

          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-8 w-8"
              onClick={() => {
                if (confirm("Deletar esta publicação?")) {
                  deleteMutation.mutate(post.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
