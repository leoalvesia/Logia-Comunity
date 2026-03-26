"use client";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { postsApi } from "../lib/api";
import type { PostCreate, PostUpdate, CommentCreate } from "shared-types";

export const feedKeys = {
  all: ["posts"] as const,
  list: (filters: object) => [...feedKeys.all, "list", filters] as const,
  detail: (id: string) => [...feedKeys.all, "detail", id] as const,
  comments: (postId: string) => [...feedKeys.all, "comments", postId] as const,
};

export function useFeed(category?: string) {
  return useInfiniteQuery({
    queryKey: feedKeys.list({ category }),
    queryFn: ({ pageParam = 1 }) =>
      postsApi.list({ category, page: pageParam as number, limit: 20 }),
    getNextPageParam: (lastPage) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: feedKeys.detail(id),
    queryFn: () => postsApi.get(id),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PostCreate) => postsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useUpdatePost(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PostUpdate) => postsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.detail(id) });
      qc.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useReactToPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji?: string }) =>
      postsApi.react(id, emoji),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: feedKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: feedKeys.comments(postId),
    queryFn: () => postsApi.getComments(postId),
    enabled: !!postId,
  });
}

export function useCreateComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CommentCreate) => postsApi.createComment(postId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.comments(postId) });
      qc.invalidateQueries({ queryKey: feedKeys.detail(postId) });
    },
  });
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => postsApi.deleteComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.comments(postId) });
    },
  });
}
