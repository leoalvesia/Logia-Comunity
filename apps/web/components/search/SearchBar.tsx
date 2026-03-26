"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, BookOpen, Users, X } from "lucide-react";
import { searchApi, type SearchResult } from "../../lib/api";
import { Avatar } from "../ui/avatar";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function SearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    searchApi
      .search(debouncedQuery)
      .then(setResults)
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasResults =
    results &&
    (results.posts.length > 0 || results.courses.length > 0 || results.members.length > 0);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  };

  const totalResults = results
    ? results.posts.length + results.courses.length + results.members.length
    : 0;

  return (
    <div ref={containerRef} className="relative px-3 py-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="w-full pl-7 pr-7 py-1.5 text-sm bg-muted/50 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults(null); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-background border rounded-lg shadow-lg z-50 overflow-hidden max-h-[480px] overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
          )}

          {!loading && !hasResults && results && (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">
              Nenhum resultado para &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && results?.posts && results.posts.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 border-b">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Publicações
                </span>
              </div>
              {results.posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => navigate(`/posts/${post.id}`)}
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                >
                  <p className="text-sm font-medium truncate">{post.title}</p>
                  {post.author && (
                    <p className="text-xs text-muted-foreground truncate">por {post.author}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {!loading && results?.courses && results.courses.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 border-b border-t">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Cursos
                </span>
              </div>
              {results.courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => navigate(`/classroom/${course.slug}`)}
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2"
                >
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt=""
                      className="h-8 w-12 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-12 rounded bg-muted shrink-0" />
                  )}
                  <p className="text-sm font-medium truncate">{course.title}</p>
                </button>
              ))}
            </div>
          )}

          {!loading && results?.members && results.members.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 border-b border-t">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Membros
                </span>
              </div>
              {results.members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => navigate(`/members/${member.username}`)}
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <Avatar
                    src={member.avatar_url}
                    name={member.full_name}
                    size="sm"
                    level={member.level}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && hasResults && (
            <div className="border-t px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">
                {totalResults} resultado{totalResults !== 1 ? "s" : ""} encontrado{totalResults !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
