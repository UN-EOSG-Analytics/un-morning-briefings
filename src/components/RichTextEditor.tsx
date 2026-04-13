"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import {
  DOMParser as ProseMirrorDOMParser,
  DOMSerializer,
} from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import { Mark } from "@tiptap/core";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  AlertCircle,
  Heading2,
  Heading3,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  ImagePlus,
  Maximize,
  Minimize,
  MessageCircle,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect, useCallback } from "react";
import { usePopup } from "@/lib/popup-context";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  error?: boolean;
  minHeight?: string;
  minimalMode?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  error = false,
  minHeight = "min-h-[200px]",
  minimalMode = false,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { warning: showWarning, success: showSuccess } = usePopup();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReformulating, setIsReformulating] = useState(false);

  const memoizedOnChange = useCallback(onChange, [onChange]);

  const handleChange = useCallback(
    (newContent: string) => {
      memoizedOnChange(newContent);
    },
    [memoizedOnChange],
  );

  // Custom Comment mark extension
  const CommentMark = Mark.create({
    name: "comment",
    parseHTML() {
      return [
        {
          tag: "mark[data-comment]",
          getAttrs: (element) => ({
            comment: (element as HTMLElement).getAttribute("data-comment"),
          }),
        },
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return [
        "mark",
        {
          "data-comment": HTMLAttributes.comment,
          class: "bg-orange-100 border-b-2 border-orange-400 cursor-help",
          title: HTMLAttributes.comment,
        },
        0,
      ];
    },
    addAttributes() {
      return {
        comment: {
          default: "",
          parseHTML: (element) =>
            (element as HTMLElement).getAttribute("data-comment"),
          renderHTML: (attributes) => ({
            "data-comment": attributes.comment,
          }),
        },
      };
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      CommentMark,
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "editor-image rounded cursor-pointer",
          draggable: true,
          contenteditable: false,
        },
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            "data-width": {
              default: null,
              parseHTML: (element) => element.getAttribute("data-width"),
              renderHTML: (attributes) => {
                if (attributes["data-width"]) {
                  return {
                    "data-width": attributes["data-width"],
                  };
                }
                return {};
              },
            },
            "data-height": {
              default: null,
              parseHTML: (element) => element.getAttribute("data-height"),
              renderHTML: (attributes) => {
                if (attributes["data-height"]) {
                  return {
                    "data-height": attributes["data-height"],
                  };
                }
                return {};
              },
            },
          };
        },
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      handleChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none px-3 py-2 text-sm ${minHeight}`,
      },
      handlePaste(view, event) {
        const html = event.clipboardData?.getData("text/html");
        if (!html) return false;

        // Check if pasted HTML contains external images
        const doc = new DOMParser().parseFromString(html, "text/html");
        const imgs = Array.from(doc.querySelectorAll("img"));
        const externalImgs = imgs.filter(
          (img) =>
            img.src.startsWith("http://") || img.src.startsWith("https://"),
        );

        if (externalImgs.length === 0) return false;

        // Suppress default paste — we'll insert content async after proxying images
        event.preventDefault();

        // Deduplicate URLs
        const uniqueUrls = [...new Set(externalImgs.map((img) => img.src))];

        // Download each external image via server-side proxy
        const urlToDataUrl = new Map<string, string>();
        Promise.all(
          uniqueUrls.map(async (url) => {
            try {
              const resp = await fetch(
                `/api/image-proxy?url=${encodeURIComponent(url)}`,
              );
              if (!resp.ok) return;
              const { dataUrl } = await resp.json();
              if (dataUrl) urlToDataUrl.set(url, dataUrl);
            } catch {
              // Leave as external URL — save-time internalization will retry
            }
          }),
        ).then(() => {
          // Skip if editor was unmounted before fetches completed
          if (!view.dom.isConnected) return;

          // Replace external src with base64 in the parsed DOM
          for (const img of externalImgs) {
            const dataUrl = urlToDataUrl.get(img.src);
            if (dataUrl) img.src = dataUrl;
          }

          // Parse the modified HTML into a ProseMirror slice and insert
          const wrapper = document.createElement("div");
          wrapper.innerHTML = doc.body.innerHTML;
          const pmParser = ProseMirrorDOMParser.fromSchema(view.state.schema);
          const slice = pmParser.parseSlice(wrapper);
          view.dispatch(view.state.tr.replaceSelection(slice));
        }).catch((err) => {
          console.error("handlePaste: error processing pasted images:", err);
        });

        return true;
      },
    },
  });

  // Update editor content when prop changes (for auto-fill functionality)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const getCharacterCount = () => {
    return editor.getText().length;
  };

  const getWordCount = () => {
    const text = editor.getText().trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      showWarning("Invalid File", "Please select an image file");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showWarning("File Too Large", "Image size should be less than 5MB");
      return;
    }

    // Read file as base64 and get image dimensions
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (url) {
        // Create image element to get dimensions
        const img = new window.Image();
        img.onload = () => {
          editor
            .chain()
            .focus()
            .setImage({
              src: url,
              alt: file.name || "uploaded image",
            })
            .updateAttributes("image", {
              "data-width": String(img.width),
              "data-height": String(img.height),
            })
            .run();
        };
        img.onerror = () => {
          console.error("Failed to load image for dimensions");
          // Fallback: insert without dimensions
          editor.chain().focus().setImage({ src: url }).run();
        };
        img.src = url;
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = "";
  };

  const handleReformulate = async () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;

    setIsReformulating(true);
    try {
      let htmlContent: string;

      if (hasSelection) {
        // Get HTML of the selected range (preserves inline formatting)
        const slice = editor.state.doc.slice(from, to);
        const div = document.createElement("div");
        const fragment =
          DOMSerializer.fromSchema(editor.schema).serializeFragment(
            slice.content,
          );
        div.appendChild(fragment);
        htmlContent = div.innerHTML;

        if (!htmlContent.trim()) {
          showWarning("No Text Selected", "Please select text to regenerate");
          setIsReformulating(false);
          return;
        }
      } else {
        // Regenerate entire content
        htmlContent = editor.getHTML();
        if (!htmlContent || htmlContent === "<p></p>") {
          showWarning("No Content", "Please enter content to reformulate");
          setIsReformulating(false);
          return;
        }
      }

      const response = await fetch("/api/reformulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: htmlContent }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || "Failed to reformulate content";

        if (
          errorMessage.includes("AZURE_OPENAI_API_KEY") ||
          errorMessage.includes("not configured")
        ) {
          showWarning("AI Usage not enabled", "Please wait for Update");
        } else {
          showWarning("Reformulation Failed", errorMessage);
        }
        return;
      }

      const result = await response.json();

      if (hasSelection) {
        // Replace the selected range with reformulated HTML
        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContentAt(from, result.content)
          .run();

        showSuccess("Text Regenerated", "Selected text has been regenerated.");
      } else {
        editor.commands.setContent(result.content);
        showSuccess(
          "Content Reformulated",
          "Your briefing has been reformulated.",
        );
      }
    } catch (error) {
      console.error("[REFORMULATE] Error:", error);
      showWarning("AI Usage not enabled", "Please wait for Update");
    } finally {
      setIsReformulating(false);
    }
  };

  return (
    <div
      className={`transition-all duration-100 ease-in-out ${isFullscreen ? "fixed top-16 right-0 bottom-0 left-0 z-40 flex flex-col bg-slate-100" : ""}`}
    >
      {/* Toolbar */}
      <div
        className={`transition-all duration-100 ${isFullscreen ? "border-b border-slate-200 bg-slate-100 px-4 py-2" : ""}`}
      >
        <div
          className={`transition-all duration-100 ${isFullscreen ? "mx-auto max-w-[280mm] rounded-lg bg-white shadow-sm" : "rounded-t"} border p-2 ${
            error
              ? "border-[var(--form-field-error-border)] bg-[var(--form-field-error-background)]"
              : "border-[var(--form-field-border)] bg-[var(--form-field-background)]"
          }`}
        >
          <div
            className={`flex flex-wrap items-center gap-1 ${!minimalMode ? "justify-between" : ""}`}
          >
            {!minimalMode && (
              <>
                {/* Fullscreen Toggle */}
                <Button
                  type="button"
                  size="sm"
                  variant={isFullscreen ? "default" : "outline"}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8 w-8 p-0"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </Button>

                <div className="h-6 w-px bg-slate-300" />
              </>
            )}
            {/* Text Formatting */}
            <Button
              type="button"
              size="sm"
              variant={editor.isActive("bold") ? "default" : "outline"}
              onClick={() => editor.chain().focus().toggleBold().run()}
              className="h-8 w-8 p-0"
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>

            {!minimalMode && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={editor.isActive("italic") ? "default" : "outline"}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className="h-8 w-8 p-0"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={editor.isActive("strike") ? "default" : "outline"}
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className="h-8 w-8 p-0"
                  title="Strikethrough"
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Highlight */}
            <Button
              type="button"
              size="sm"
              variant={editor.isActive("highlight") ? "default" : "outline"}
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleHighlight({ color: "#FFFF00" })
                  .run()
              }
              className="h-8 w-8 p-0"
              title="Highlight text"
            >
              <div className="h-2 w-6 rounded bg-yellow-300" />
            </Button>

            {!minimalMode && (
              <>
                {/* Comment Mark */}
                <Button
                  type="button"
                  size="sm"
                  variant={editor.isActive("comment") ? "default" : "outline"}
                  onClick={() => {
                    const comment = prompt("Add a comment/note:");
                    if (comment) {
                      editor
                        .chain()
                        .focus()
                        .toggleMark("comment", { comment })
                        .run();
                    }
                  }}
                  className="h-8 w-8 p-0"
                  title="Add comment to selected text"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </>
            )}

            {!minimalMode && (
              <>
                <div className="h-6 w-px bg-slate-300" />

                {/* Headings */}
                <Button
                  type="button"
                  size="sm"
                  variant={
                    editor.isActive("heading", { level: 2 })
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                  }
                  className="h-8 w-8 p-0"
                  title="Heading 2"
                >
                  <Heading2 className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={
                    editor.isActive("heading", { level: 3 })
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 3 }).run()
                  }
                  className="h-8 w-8 p-0"
                  title="Heading 3"
                >
                  <Heading3 className="h-4 w-4" />
                </Button>

                <div className="h-6 w-px bg-slate-300" />

                {/* Lists */}
                <Button
                  type="button"
                  size="sm"
                  variant={
                    editor.isActive("bulletList") ? "default" : "outline"
                  }
                  onClick={() =>
                    editor.chain().focus().toggleBulletList().run()
                  }
                  className="h-8 w-8 p-0"
                  title="Bullet List"
                >
                  <List className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={
                    editor.isActive("orderedList") ? "default" : "outline"
                  }
                  onClick={() =>
                    editor.chain().focus().toggleOrderedList().run()
                  }
                  className="h-8 w-8 p-0"
                  title="Ordered List"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>

                <div className="h-6 w-px bg-slate-300" />

                {/* Block Elements */}
                <Button
                  type="button"
                  size="sm"
                  variant={
                    editor.isActive("blockquote") ? "default" : "outline"
                  }
                  onClick={() =>
                    editor.chain().focus().toggleBlockquote().run()
                  }
                  className="h-8 w-8 p-0"
                  title="Blockquote"
                >
                  <Quote className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    editor.chain().focus().setHorizontalRule().run()
                  }
                  className="h-8 w-8 p-0"
                  title="Horizontal Line"
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <div className="h-6 w-px bg-slate-300" />

                {/* Alignment */}
                <Button
                  type="button"
                  size="sm"
                  variant={
                    editor.isActive({ textAlign: "left" })
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    editor.chain().focus().setTextAlign("left").run()
                  }
                  className="h-8 w-8 p-0"
                  title="Align Left"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={
                    editor.isActive({ textAlign: "center" })
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    editor.chain().focus().setTextAlign("center").run()
                  }
                  className="h-8 w-8 p-0"
                  title="Align Center"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={
                    editor.isActive({ textAlign: "right" })
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    editor.chain().focus().setTextAlign("right").run()
                  }
                  className="h-8 w-8 p-0"
                  title="Align Right"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>

                <div className="h-6 w-px bg-slate-300" />

                {/* Link */}
                <Button
                  type="button"
                  size="sm"
                  variant={editor.isActive("link") ? "default" : "outline"}
                  onClick={() => {
                    const url = window.prompt("URL:");
                    if (url) {
                      editor.chain().focus().toggleLink({ href: url }).run();
                    }
                  }}
                  className="h-8 w-8 p-0"
                  title="Add Link"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>

                {/* Image Upload */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleImageUpload}
                  className="h-8 w-8 p-0"
                  title="Upload Image"
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Image Sizing */}
                <select
                  onChange={(e) => {
                    const size = e.target.value;
                    if (size === "default") {
                      e.target.value = "default";
                      return;
                    }

                    let width: string | undefined;

                    switch (size) {
                      case "small":
                        width = "250px";
                        break;
                      case "medium":
                        width = "400px";
                        break;
                      case "large":
                        width = "600px";
                        break;
                      case "full":
                        width = "100%";
                        break;
                    }

                    if (width) {
                      editor
                        .chain()
                        .focus()
                        .updateAttributes("image", { width })
                        .run();
                    }
                    e.target.value = "default";
                  }}
                  className="editor-image-size-select h-8 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                  title="Image Size (select an image first)"
                  defaultValue="default"
                >
                  <option value="default" disabled>
                    Image Size
                  </option>
                  <option value="small">Small (250px)</option>
                  <option value="medium">Medium (400px)</option>
                  <option value="large">Large (600px)</option>
                  <option value="full">Full Width</option>
                </select>

                <div className="h-6 w-px bg-slate-300" />

                {/* Undo/Redo */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editor.chain().focus().undo().run()}
                  className="h-8 w-8 p-0"
                  disabled={!editor.can().undo()}
                  title="Undo"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editor.chain().focus().redo().run()}
                  className="h-8 w-8 p-0"
                  disabled={!editor.can().redo()}
                  title="Redo"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>

                <div className="h-6 w-px bg-slate-300" />

                {/* Regenerate Button */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleReformulate}
                  disabled={isReformulating}
                  className="h-8 gap-1 px-2"
                  title="Reformulate content to be concise and professional"
                >
                  <Wand2 className="h-4 w-4" />
                  <span className="hidden text-xs sm:inline">
                    {isReformulating ? "Reformulating..." : "Regenerate"}
                  </span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div
        className={`transition-all duration-300 ${isFullscreen ? "flex-1 overflow-y-auto px-4 py-8" : ""}`}
      >
        <div
          className={`transition-all duration-300 ${isFullscreen ? "mx-auto min-h-[297mm] max-w-[280mm] rounded-lg bg-white p-16 shadow-lg" : "rounded-b"} ${isFullscreen ? "" : "-mt-1 border"} ${
            error
              ? "border-t-0 border-[var(--form-field-error-border)] bg-[var(--form-field-error-background)]"
              : "border-t-0 border-[var(--form-field-border)] bg-[var(--form-field-background)]"
          }`}
        >
          <EditorContent
            editor={editor}
            className={
              isFullscreen ? "prose prose-slate max-w-none" : minHeight
            }
          />
        </div>
      </div>

      {/* Character count and error */}
      <div className="mt-2 flex items-start justify-between text-xs">
        <div className="text-slate-500">
          {getCharacterCount()} characters | {getWordCount()} words
        </div>
        {error && (
          <div className="flex items-center gap-1 text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
            Entry must be at least 50 characters
          </div>
        )}
      </div>
    </div>
  );
}
