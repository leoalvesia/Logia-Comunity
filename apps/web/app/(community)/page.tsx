"use client";

import React, { useState } from "react";
import { PostEditor } from "../../components/feed/PostEditor";
import { PostCard } from "../../components/feed/PostCard";
import { Button } from "../../components/ui/button";
import { useFeed } from "../../hooks/useFeed";
import { Loader2 } from "lucide-react";

const CATEGORIES = [
  { slug: "", label: "Tudo" },
  { slug: "geral", label: "💬 Geral" },
  { slug: "negocios", label: "💼 Negócios" },
  { slug: "marketing", label: "📣 Marketing" },
  { slug: "tecnologia", label: "💻 Tecnologia" },
  { slug: "financas", label: "💰 Finanças" },
  { slug: "duvidas", label: "❓ Dúvidas" },
];

export default function FeedPage() {
  const [activeCategory, setActiveCategory] = useState("");
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useFeed(activeCategory || undefined);

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-bold text-2xl mb-1">Feed da Comunidade</h1>
        <p className="text-muted-foreground text-sm">
          Compartilhe ideias, faça perguntas e conecte-se com outros membros.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.slug}
            variant={activeCategory === cat.slug ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat.slug)}
            className="text-xs"
          >
            {cat.label}
          </Button>
        ))}
      </div>

      <PostEditor />

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && posts.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">Nenhuma publicação ainda.</p>
          <p className="text-muted-foreground text-sm mt-1">
            Seja o primeiro a publicar algo!
          </p>
        </div>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando...
              </>
            ) : (
              "Carregar mais"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
