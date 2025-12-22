'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Code2,
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
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  error?: boolean;
  minHeight?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Enter text...',
  error = false,
  minHeight = 'min-h-[200px]',
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getText());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none px-3 py-2 text-sm ${minHeight}`,
      },
    },
  });

  if (!editor) {
    return null;
  }

  const getCharacterCount = () => {
    return editor.getText().length;
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className={`rounded-t border p-2 ${
        error
          ? 'border-red-500 bg-red-50'
          : 'border-slate-300 bg-slate-50'
      }`}>
        <div className="flex flex-wrap items-center gap-1">
          {/* Text Formatting */}
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('bold') ? 'default' : 'outline'}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className="h-8 w-8 p-0"
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant={editor.isActive('italic') ? 'default' : 'outline'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className="h-8 w-8 p-0"
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant={editor.isActive('strike') ? 'default' : 'outline'}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className="h-8 w-8 p-0"
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-slate-300" />

          {/* Headings */}
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'outline'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className="h-8 w-8 p-0"
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'outline'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
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
            variant={editor.isActive('bulletList') ? 'default' : 'outline'}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className="h-8 w-8 p-0"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant={editor.isActive('orderedList') ? 'default' : 'outline'}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
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
            variant={editor.isActive('blockquote') ? 'default' : 'outline'}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className="h-8 w-8 p-0"
            title="Blockquote"
          >
            <Quote className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant={editor.isActive('codeBlock') ? 'default' : 'outline'}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className="h-8 w-8 p-0"
            title="Code Block"
          >
            <Code2 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
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
            variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'outline'}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className="h-8 w-8 p-0"
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className="h-8 w-8 p-0"
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className="h-8 w-8 p-0"
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-slate-300" />

          {/* Link */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('link') ? 'default' : 'outline'}
              onClick={() => {
                const url = window.prompt('URL:');
                if (url) {
                  editor.chain().focus().toggleLink({ href: url }).run();
                }
              }}
              className="h-8 w-8 p-0"
              title="Add Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>

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
        </div>
      </div>

      {/* Editor */}
      <div className={`rounded-b border ${
        error
          ? 'border-t-0 border-red-500 bg-red-50'
          : 'border-t-0 border-slate-300 bg-slate-50'
      }`}>
        <EditorContent 
          editor={editor}
          className={`${minHeight}`}
        />
      </div>

      {/* Character count and error */}
      <div className="flex items-start justify-between text-xs">
        <div className="text-slate-500">
          {getCharacterCount()} characters
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
