"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Palette,
} from "lucide-react";

const FONT_SIZES = [
  { label: "작게", value: "14px" },
  { label: "보통", value: "16px" },
  { label: "크게", value: "20px" },
  { label: "매우 크게", value: "24px" },
];

const COLORS = [
  "#000000", "#374151", "#6b7280", "#dc2626", "#ea580c",
  "#d97706", "#16a34a", "#2563eb", "#7c3aed", "#db2777",
];

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-accent transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [showFontSize, setShowFontSize] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) {
        setShowFontSize(false);
      }
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColor(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b px-2 py-1.5 bg-muted/30">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="굵게"
      >
        <Bold className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="기울임"
      >
        <Italic className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="밑줄"
      >
        <UnderlineIcon className="w-3.5 h-3.5" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Font Size */}
      <div className="relative" ref={fontSizeRef}>
        <ToolbarButton
          onClick={() => {
            setShowFontSize(!showFontSize);
            setShowColor(false);
          }}
          title="글자 크기"
        >
          <Type className="w-3.5 h-3.5" />
        </ToolbarButton>
        {showFontSize && (
          <div className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-md z-50 py-1 min-w-[100px]">
            {FONT_SIZES.map((size) => (
              <button
                key={size.value}
                type="button"
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                onClick={() => {
                  editor.chain().focus().setFontSize(size.value).run();
                  setShowFontSize(false);
                }}
              >
                <span style={{ fontSize: size.value }}>{size.label}</span>
              </button>
            ))}
            <button
              type="button"
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors text-muted-foreground"
              onClick={() => {
                editor.chain().focus().unsetFontSize().run();
                setShowFontSize(false);
              }}
            >
              초기화
            </button>
          </div>
        )}
      </div>

      {/* Color */}
      <div className="relative" ref={colorRef}>
        <ToolbarButton
          onClick={() => {
            setShowColor(!showColor);
            setShowFontSize(false);
          }}
          title="글자 색상"
        >
          <Palette className="w-3.5 h-3.5" />
        </ToolbarButton>
        {showColor && (
          <div className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-md z-50 p-2">
            <div className="grid grid-cols-5 gap-1.5">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColor(false);
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground mt-1.5 hover:text-foreground"
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                setShowColor(false);
              }}
            >
              색상 초기화
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="왼쪽 정렬"
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="가운데 정렬"
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="오른쪽 정렬"
      >
        <AlignRight className="w-3.5 h-3.5" />
      </ToolbarButton>
    </div>
  );
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        listItem: false,
        bulletList: false,
        orderedList: false,
      }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({ types: ["paragraph"] }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none px-3 py-2 min-h-[80px] focus:outline-none text-sm",
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!editor) return null;

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      <Toolbar editor={editor} />
      <div className="relative">
        <EditorContent editor={editor} />
        {editor.isEmpty && placeholder && (
          <p className="absolute top-2 left-3 text-sm text-muted-foreground pointer-events-none">
            {placeholder}
          </p>
        )}
      </div>
    </div>
  );
}
