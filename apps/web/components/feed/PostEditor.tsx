"use client";

import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Quote, Link as LinkIcon, Image as ImageIcon, Send, Video,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { useCreatePost } from "../../hooks/useFeed";
import { cn, extractYoutubeId, extractVimeoId } from "../../lib/utils";

const MAX_CHARS = 5000;

export function PostEditor() {
  const [title, setTitle] = useState("");
  const createPost = useCreatePost();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Image.configure({ HTMLAttributes: { class: "max-w-full rounded-lg my-2" } }),
      Placeholder.configure({ placeholder: "Compartilhe algo com a comunidade..." }),
      CharacterCount.configure({ limit: MAX_CHARS }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[120px] px-4 py-3 focus:outline-none text-foreground",
      },
    },
  });

  const handleSubmit = async () => {
    if (!editor || editor.isEmpty) return;
    const body = editor.getHTML();
    try {
      await createPost.mutateAsync({ title: title || undefined, body });
      editor.commands.clearContent();
      setTitle("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkInsert = () => {
    const url = window.prompt("Cole o URL do link:");
    if (!url) return;
    const href = url.startsWith("http") ? url : `https://${url}`;
    editor?.chain().focus().toggleLink({ href }).run();
  };

  const handleImageUrl = () => {
    const url = window.prompt("Cole o URL da imagem (ex: https://...):");
    if (!url || !url.startsWith("http")) return;
    editor?.chain().focus().setImage({ src: url }).run();
  };

  const handleVideoEmbed = () => {
    const url = window.prompt("Cole o URL do vídeo (YouTube ou Vimeo):");
    if (!url) return;

    const ytId = extractYoutubeId(url);
    const vmId = extractVimeoId(url);

    if (ytId) {
      editor?.chain().focus().insertContent(
        `<p><a href="https://www.youtube.com/watch?v=${ytId}" target="_blank" rel="noopener noreferrer">▶ ${url}</a></p>`
      ).run();
    } else if (vmId) {
      editor?.chain().focus().insertContent(
        `<p><a href="https://vimeo.com/${vmId}" target="_blank" rel="noopener noreferrer">▶ ${url}</a></p>`
      ).run();
    } else {
      alert("URL inválida. Use um link do YouTube ou Vimeo.");
    }
  };

  const charCount = editor?.storage.characterCount?.characters() ?? 0;

  const ToolbarButton = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title?: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded hover:bg-muted transition-colors",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Nova publicação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-0">
        <div>
          <Input
            placeholder="Título (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-medium"
          />
        </div>

        <div className="border rounded-md overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30 flex-wrap">
            <ToolbarButton
              title="Negrito"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive("bold")}
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Itálico"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive("italic")}
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Tachado"
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              active={editor?.isActive("strike")}
            >
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Código"
              onClick={() => editor?.chain().focus().toggleCode().run()}
              active={editor?.isActive("code")}
            >
              <Code className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-1" />

            <ToolbarButton
              title="Lista"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive("bulletList")}
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Lista numerada"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive("orderedList")}
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Citação"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              active={editor?.isActive("blockquote")}
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-1" />

            <ToolbarButton
              title="Inserir link"
              onClick={handleLinkInsert}
              active={editor?.isActive("link")}
            >
              <LinkIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Inserir imagem (por URL)"
              onClick={handleImageUrl}
            >
              <ImageIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Inserir vídeo do YouTube ou Vimeo"
              onClick={handleVideoEmbed}
            >
              <Video className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <EditorContent editor={editor} />
        </div>
      </CardContent>

      <CardFooter className="pt-3 flex items-center justify-between">
        <span className={`text-xs ${charCount > MAX_CHARS * 0.9 ? "text-destructive" : "text-muted-foreground"}`}>
          {charCount}/{MAX_CHARS}
        </span>
        <Button
          onClick={handleSubmit}
          disabled={!editor || editor.isEmpty || createPost.isPending}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {createPost.isPending ? "Publicando..." : "Publicar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
