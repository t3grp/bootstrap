"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  EditorContent,
  useEditor,
  type ChainedCommands,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import type {
  Page,
  PageContent,
  WorkspaceFile,
  WorkspaceTable,
} from "@bootstrap/core";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  CheckSquare2,
  ChevronDown,
  Code2,
  Copy,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Lightbulb,
  Link2,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Paperclip,
  Plus,
  Quote,
  Redo2,
  Search,
  Strikethrough,
  Table2,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { WorkspaceReferences } from "./reference-nodes";
import { createPageEditorExtensions, isSafePageLink } from "./extensions";
import {
  performBlockAction,
  selectedTopLevelBlock,
  type BlockAction,
} from "./block-actions";
import "./editor.css";

export type PageEditorProps = {
  content: PageContent;
  onChange: (content: PageContent) => void;
  readOnly?: boolean;
  tables: WorkspaceTable[];
  files: WorkspaceFile[];
  pages: Page[];
  workspaceId?: string;
  onOpenPage?: (id: string) => void;
  onOpenTable?: (id: string) => void;
  onTableChange?: (table: WorkspaceTable) => void;
};

type InsertAction = {
  id: string;
  label: string;
  description: string;
  keywords: string;
  icon: typeof Type;
  group: string;
  disabled?: boolean;
  run: (chain: ChainedCommands) => ChainedCommands;
};
type InsertMenu = {
  mode: "slash" | "button";
  query: string;
  from: number;
  to: number;
  top: number;
  left: number;
};

const basicActions: InsertAction[] = [
  {
    id: "paragraph",
    label: "Text",
    description: "Start writing with a plain paragraph",
    keywords: "paragraph text",
    icon: Type,
    group: "Basic blocks",
    run: (chain) => chain.clearNodes().setParagraph(),
  },
  {
    id: "heading1",
    label: "Heading 1",
    description: "A large section heading",
    keywords: "h1 heading title",
    icon: Heading1,
    group: "Basic blocks",
    run: (chain) => chain.setHeading({ level: 1 }),
  },
  {
    id: "heading2",
    label: "Heading 2",
    description: "A medium section heading",
    keywords: "h2 heading subtitle",
    icon: Heading2,
    group: "Basic blocks",
    run: (chain) => chain.setHeading({ level: 2 }),
  },
  {
    id: "heading3",
    label: "Heading 3",
    description: "A smaller section heading",
    keywords: "h3 heading",
    icon: Heading3,
    group: "Basic blocks",
    run: (chain) => chain.setHeading({ level: 3 }),
  },
  {
    id: "bulletList",
    label: "Bulleted list",
    description: "Keep a simple list of ideas",
    keywords: "bullet list unordered",
    icon: List,
    group: "Basic blocks",
    run: (chain) => chain.toggleBulletList(),
  },
  {
    id: "orderedList",
    label: "Numbered list",
    description: "Put steps in order",
    keywords: "number list ordered",
    icon: ListOrdered,
    group: "Basic blocks",
    run: (chain) => chain.toggleOrderedList(),
  },
  {
    id: "taskList",
    label: "Checklist",
    description: "Track items inside this page",
    keywords: "checklist todo task checkbox",
    icon: CheckSquare2,
    group: "Basic blocks",
    run: (chain) => chain.toggleTaskList(),
  },
  {
    id: "blockquote",
    label: "Quote",
    description: "Make a quotation stand out",
    keywords: "quote blockquote",
    icon: Quote,
    group: "Basic blocks",
    run: (chain) => chain.toggleBlockquote(),
  },
  {
    id: "callout",
    label: "Callout",
    description: "Draw attention to a useful detail",
    keywords: "callout note info",
    icon: Lightbulb,
    group: "Basic blocks",
    run: (chain) => chain.toggleWrap("callout"),
  },
  {
    id: "codeBlock",
    label: "Code",
    description: "Write a code snippet",
    keywords: "code snippet",
    icon: Code2,
    group: "Basic blocks",
    run: (chain) => chain.toggleCodeBlock(),
  },
  {
    id: "horizontalRule",
    label: "Divider",
    description: "Separate sections with a line",
    keywords: "divider rule line",
    icon: Minus,
    group: "Basic blocks",
    run: (chain) => chain.setHorizontalRule(),
  },
];

export function PageEditor(props: PageEditorProps) {
  const { content, readOnly = false } = props;
  const latestProps = useRef(props);
  latestProps.current = props;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const insertSearchRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(JSON.stringify(content));
  const [menu, setMenu] = useState<InsertMenu | null>(null);
  const menuRef = useRef(menu);
  menuRef.current = menu;
  const [menuIndex, setMenuIndex] = useState(0);
  const menuIndexRef = useRef(0);
  menuIndexRef.current = menuIndex;
  const dismissedSlash = useRef("");
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [notice, setNotice] = useState("");
  const [, setTransactionVersion] = useState(0);
  const menuId = useId();
  const handleKeyRef = useRef<(event: KeyboardEvent) => boolean>(() => false);
  const syncSlashRef = useRef<(editor: Editor) => void>(() => {});
  const runActionRef = useRef<(action: InsertAction) => void>(() => {});
  const filteredActionsRef = useRef<InsertAction[]>([]);

  const extensions = useMemo(createPageEditorExtensions, []);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions,
    content: content as JSONContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "be-prose",
        role: "textbox",
        "aria-label": "Page content",
        "aria-multiline": "true",
        "aria-keyshortcuts": "Alt+ArrowUp Alt+ArrowDown",
        spellcheck: "true",
      },
      handleKeyDown: (_view, event) => handleKeyRef.current(event),
    },
    onUpdate: ({ editor: current }) => {
      const next = current.getJSON() as PageContent;
      lastEmitted.current = JSON.stringify(next);
      latestProps.current.onChange(next);
      syncSlashRef.current(current);
    },
    onSelectionUpdate: ({ editor: current }) => syncSlashRef.current(current),
    onTransaction: () => setTransactionVersion((value) => value + 1),
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = JSON.stringify(content);
    if (
      incoming === lastEmitted.current ||
      incoming === JSON.stringify(editor.getJSON())
    )
      return;
    editor.commands.setContent(content as JSONContent, { emitUpdate: false });
    lastEmitted.current = incoming;
  }, [content, editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly, false);
  }, [editor, readOnly]);
  useEffect(() => {
    if (menu?.mode === "button") insertSearchRef.current?.focus();
  }, [menu?.mode]);
  useEffect(() => {
    if (showLink) linkInputRef.current?.focus();
  }, [showLink]);

  useEffect(() => {
    if (!editor) return;
    if (menu) {
      editor.view.dom.setAttribute("aria-controls", menuId);
      editor.view.dom.setAttribute("aria-expanded", "true");
      editor.view.dom.setAttribute(
        "aria-activedescendant",
        `${menuId}-option-${menuIndex}`,
      );
    } else {
      editor.view.dom.removeAttribute("aria-controls");
      editor.view.dom.removeAttribute("aria-expanded");
      editor.view.dom.removeAttribute("aria-activedescendant");
    }
  }, [editor, menu, menuIndex, menuId]);

  useEffect(() => {
    if (!menu && !showBlockMenu && !showLink) return;
    const outside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as globalThis.Node)) {
        setMenu(null);
        setShowBlockMenu(false);
        setShowLink(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [menu, showBlockMenu, showLink]);

  syncSlashRef.current = (current) => {
    if (latestProps.current.readOnly || menuRef.current?.mode === "button")
      return;
    const { selection } = current.state;
    if (!selection.empty || selection.$from.parent.type.name !== "paragraph") {
      setMenu(null);
      return;
    }
    const before = selection.$from.parent.textBetween(
      0,
      selection.$from.parentOffset,
      "\ufffc",
    );
    if (
      !before.startsWith("/") ||
      before.length > 65 ||
      before.slice(1).includes("/")
    ) {
      setMenu(null);
      return;
    }
    const from = selection.from - before.length;
    const query = before.slice(1);
    if (dismissedSlash.current === `${from}:${query}`) return;
    const wrapper = wrapperRef.current?.getBoundingClientRect();
    const caret = current.view.coordsAtPos(selection.from);
    const left = wrapper
      ? Math.min(
          Math.max(0, caret.left - wrapper.left),
          Math.max(0, wrapper.width - 320),
        )
      : 0;
    const roomBelow = window.innerHeight - caret.bottom;
    const top = wrapper
      ? roomBelow < 240 && caret.top > 340
        ? caret.top - wrapper.top - 320
        : caret.bottom - wrapper.top + 8
      : 40;
    if (menuRef.current?.query !== query || menuRef.current?.from !== from)
      setMenuIndex(0);
    setMenu({ mode: "slash", query, from, to: selection.from, top, left });
  };

  const actions = useMemo<InsertAction[]>(
    () => [
      ...basicActions,
      ...props.tables.map((table) => ({
        id: `table-${table.id}`,
        label: table.name,
        description: "Linked table · the same records, here",
        keywords: "table database embed",
        icon: Table2,
        group: "Workspace tables",
        run: (chain: ChainedCommands) =>
          chain.insertContent({
            type: "tableReference",
            attrs: { id: crypto.randomUUID(), tableId: table.id },
          }),
      })),
      ...props.files.map((file) => ({
        id: `file-${file.id}`,
        label: file.name,
        description: "Link to a workspace file",
        keywords: "file attachment embed",
        icon: Paperclip,
        group: "Workspace files",
        run: (chain: ChainedCommands) =>
          chain.insertContent({
            type: "fileReference",
            attrs: { id: crypto.randomUUID(), fileId: file.id },
          }),
      })),
      ...props.pages
        .filter((page) => !page.trashedAt)
        .map((page) => ({
          id: `page-${page.id}`,
          label: page.title || "Untitled",
          description: "Link to a workspace page",
          keywords: "page child subpage link",
          icon: FileText,
          group: "Workspace pages",
          run: (chain: ChainedCommands) =>
            chain.insertContent({
              type: "childPage",
              attrs: { id: crypto.randomUUID(), pageId: page.id },
            }),
        })),
    ],
    [props.tables, props.files, props.pages],
  );
  const filteredActions = useMemo(() => {
    const term = menu?.query.toLocaleLowerCase().trim() ?? "";
    return actions
      .filter(
        (action) =>
          !term ||
          `${action.label} ${action.keywords} ${action.description}`
            .toLocaleLowerCase()
            .includes(term),
      )
      .slice(0, 40);
  }, [actions, menu?.query]);
  filteredActionsRef.current = filteredActions;

  runActionRef.current = (action) => {
    if (!editor || action.disabled) return;
    const selectedMenu = menuRef.current;
    setMenu(null);
    menuRef.current = null;
    let chain = editor.chain().focus();
    if (selectedMenu?.mode === "slash")
      chain = chain.deleteRange({
        from: selectedMenu.from,
        to: selectedMenu.to,
      });
    action.run(chain).run();
    setNotice(`${action.label} inserted.`);
  };

  const blockAction = (action: BlockAction) => {
    if (!editor) return;
    setShowBlockMenu(false);
    if (performBlockAction(editor, action))
      setNotice(
        {
          up: "Block moved up.",
          down: "Block moved down.",
          duplicate: "Block duplicated.",
          delete: "Block removed.",
        }[action],
      );
  };

  handleKeyRef.current = (event) => {
    if (event.isComposing) return false;
    const currentMenu = menuRef.current;
    const options = filteredActionsRef.current;
    if (currentMenu) {
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const last = Math.max(0, options.length - 1);
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : event.key === "ArrowDown"
                ? (menuIndexRef.current + 1) % Math.max(1, options.length)
                : (menuIndexRef.current - 1 + options.length) %
                  Math.max(1, options.length);
        setMenuIndex(next);
        wrapperRef.current
          ?.querySelector<HTMLElement>(`[data-insert-index="${next}"]`)
          ?.scrollIntoView({ block: "nearest" });
        return true;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const action = options[menuIndexRef.current];
        if (action) runActionRef.current(action);
        return true;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        dismissedSlash.current = `${currentMenu.from}:${currentMenu.query}`;
        setMenu(null);
        menuRef.current = null;
        editor?.commands.focus();
        return true;
      }
    }
    if (
      event.altKey &&
      (event.key === "ArrowUp" || event.key === "ArrowDown")
    ) {
      event.preventDefault();
      blockAction(event.key === "ArrowUp" ? "up" : "down");
      return true;
    }
    if (
      (event.metaKey || event.ctrlKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === "d"
    ) {
      event.preventDefault();
      blockAction("duplicate");
      return true;
    }
    return false;
  };

  const openInsertMenu = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    setMenu(
      menu?.mode === "button"
        ? null
        : { mode: "button", query: "", from, to, top: 42, left: 0 },
    );
    setMenuIndex(0);
    setShowBlockMenu(false);
    setShowLink(false);
  };
  const openLink = () => {
    if (!editor) return;
    setLink(String(editor.getAttributes("link").href ?? ""));
    setLinkError("");
    setShowLink(!showLink);
    setMenu(null);
  };
  const applyLink = () => {
    if (!editor) return;
    const url = link.trim();
    if (url && !isSafePageLink(url)) {
      setLinkError("Use a complete https://, http:// or mailto: link.");
      return;
    }
    if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else if (editor.state.selection.empty && !editor.isActive("link"))
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: url,
          marks: [
            {
              type: "link",
              attrs: {
                href: url,
                target: "_blank",
                rel: "noopener noreferrer",
              },
            },
          ],
        })
        .run();
    else
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    setShowLink(false);
  };
  const activeBlockType = editor?.isActive("heading", { level: 1 })
    ? "heading1"
    : editor?.isActive("heading", { level: 2 })
      ? "heading2"
      : editor?.isActive("heading", { level: 3 })
        ? "heading3"
        : ([
            "taskList",
            "bulletList",
            "orderedList",
            "codeBlock",
            "blockquote",
            "callout",
          ].find((type) => editor?.isActive(type)) ?? "paragraph");
  const selectedBlock = editor ? selectedTopLevelBlock(editor) : null;
  const words =
    editor?.getText().trim().split(/\s+/).filter(Boolean).length ?? 0;

  return (
    <WorkspaceReferences.Provider value={props}>
      <div
        ref={wrapperRef}
        className={`be-editor${readOnly ? " be-editor-readonly" : ""}`}
      >
        {!readOnly && (
          <div
            className="be-toolbar"
            role="toolbar"
            aria-label="Page formatting"
          >
            <button
              type="button"
              className="be-insert-button"
              aria-label="Insert block"
              aria-expanded={Boolean(menu)}
              aria-controls={menuId}
              onMouseDown={(event) => event.preventDefault()}
              onClick={openInsertMenu}
            >
              <Plus size={16} aria-hidden="true" />
              <span>Insert</span>
              <ChevronDown size={12} aria-hidden="true" />
            </button>
            <span className="be-toolbar-divider" />
            <select
              aria-label="Block type"
              value={activeBlockType}
              onChange={(event) => {
                if (!editor) return;
                basicActions
                  .find((action) => action.id === event.target.value)
                  ?.run(editor.chain().focus())
                  .run();
              }}
              disabled={!editor}
            >
              {basicActions
                .filter((action) => action.id !== "horizontalRule")
                .map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.label}
                  </option>
                ))}
            </select>
            <span className="be-toolbar-divider" />
            <button
              type="button"
              title="Bold (Ctrl/Cmd+B)"
              aria-label="Bold"
              aria-pressed={editor?.isActive("bold") ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Italic (Ctrl/Cmd+I)"
              aria-label="Italic"
              aria-pressed={editor?.isActive("italic") ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Strikethrough"
              aria-label="Strikethrough"
              aria-pressed={editor?.isActive("strike") ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            >
              <Strikethrough size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Inline code"
              aria-label="Inline code"
              aria-pressed={editor?.isActive("code") ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleCode().run()}
            >
              <Code2 size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Add link"
              aria-label="Add link"
              aria-pressed={editor?.isActive("link") ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={openLink}
            >
              <Link2 size={15} aria-hidden="true" />
            </button>
            <span className="be-toolbar-divider" />
            <button
              type="button"
              title="Undo"
              aria-label="Undo"
              disabled={!editor?.can().undo()}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <Undo2 size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Redo"
              aria-label="Redo"
              disabled={!editor?.can().redo()}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <Redo2 size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="be-block-actions-trigger"
              title="Block actions"
              aria-label="Block actions"
              aria-expanded={showBlockMenu}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setShowBlockMenu(!showBlockMenu);
                setMenu(null);
              }}
            >
              <MoreHorizontal size={17} aria-hidden="true" />
            </button>
          </div>
        )}

        {showBlockMenu && !readOnly && (
          <div
            className="be-block-menu"
            role="group"
            aria-label="Actions for current block"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setShowBlockMenu(false);
                editor?.commands.focus();
              }
            }}
          >
            <span>Current block</span>
            <button
              type="button"
              disabled={!selectedBlock || selectedBlock.index === 0}
              onClick={() => blockAction("up")}
            >
              <ArrowUp size={14} aria-hidden="true" /> Move up <kbd>Alt ↑</kbd>
            </button>
            <button
              type="button"
              disabled={
                !selectedBlock ||
                selectedBlock.index === selectedBlock.count - 1
              }
              onClick={() => blockAction("down")}
            >
              <ArrowDown size={14} aria-hidden="true" /> Move down{" "}
              <kbd>Alt ↓</kbd>
            </button>
            <button type="button" onClick={() => blockAction("duplicate")}>
              <Copy size={14} aria-hidden="true" /> Duplicate
            </button>
            <button
              type="button"
              className="be-danger"
              onClick={() => blockAction("delete")}
            >
              <Trash2 size={14} aria-hidden="true" /> Delete block
            </button>
          </div>
        )}

        {showLink && !readOnly && (
          <div
            className="be-link-editor"
            role="group"
            aria-label="Edit link"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setShowLink(false);
                editor?.commands.focus();
              }
            }}
          >
            <label htmlFor={`${menuId}-link`}>Link address</label>
            <div>
              <input
                ref={linkInputRef}
                id={`${menuId}-link`}
                type="text"
                inputMode="url"
                value={link}
                placeholder="https://example.com"
                onChange={(event) => {
                  setLink(event.target.value);
                  setLinkError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    applyLink();
                  }
                }}
              />
              <button type="button" onClick={applyLink}>
                Apply
              </button>
              <button
                type="button"
                aria-label="Close link editor"
                onClick={() => {
                  setShowLink(false);
                  editor?.commands.focus();
                }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            {linkError && <p role="alert">{linkError}</p>}
            {editor?.isActive("link") && (
              <button
                type="button"
                className="be-remove-link"
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .unsetLink()
                    .run();
                  setShowLink(false);
                }}
              >
                Remove link
              </button>
            )}
          </div>
        )}

        <EditorContent editor={editor} />
        {!editor && (
          <div className="be-editor-loading" aria-live="polite">
            Opening your page…
          </div>
        )}

        {menu && !readOnly && (
          <div
            className="be-insert-menu"
            style={{ top: menu.top, left: menu.left }}
          >
            {menu.mode === "button" ? (
              <label className="be-insert-search">
                <Search size={14} aria-hidden="true" />
                <input
                  ref={insertSearchRef}
                  aria-label="Search blocks and references"
                  aria-controls={menuId}
                  aria-activedescendant={`${menuId}-option-${menuIndex}`}
                  aria-expanded="true"
                  role="combobox"
                  value={menu.query}
                  onChange={(event) => {
                    setMenu({ ...menu, query: event.target.value });
                    setMenuIndex(0);
                  }}
                  onKeyDown={(event) => {
                    if (handleKeyRef.current(event.nativeEvent))
                      event.preventDefault();
                  }}
                  placeholder="Search blocks, tables, pages…"
                />
              </label>
            ) : (
              <div className="be-insert-search be-insert-query">
                <Search size={13} aria-hidden="true" />
                <span>{menu.query || "Add a block"}</span>
                <kbd>esc</kbd>
              </div>
            )}
            <div
              id={menuId}
              className="be-insert-options"
              role="listbox"
              aria-label="Insert a block"
            >
              {filteredActions.map((action, index) => (
                <div key={action.id}>
                  {(index === 0 ||
                    filteredActions[index - 1]?.group !== action.group) && (
                    <div className="be-insert-group">{action.group}</div>
                  )}
                  <button
                    type="button"
                    id={`${menuId}-option-${index}`}
                    data-insert-index={index}
                    role="option"
                    aria-selected={menuIndex === index}
                    disabled={action.disabled}
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setMenuIndex(index)}
                    onClick={() => runActionRef.current(action)}
                  >
                    <span className="be-insert-symbol">
                      <action.icon size={18} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{action.label}</strong>
                      <small>{action.description}</small>
                    </span>
                  </button>
                </div>
              ))}
              {filteredActions.length === 0 && (
                <p className="be-insert-empty">
                  No matching blocks or workspace resources.
                </p>
              )}
            </div>
            <footer>
              <span>↑ ↓ to choose</span>
              <span>↵ to insert</span>
            </footer>
          </div>
        )}
        {!readOnly && (
          <footer className="be-editor-footer">
            <span>
              Type <kbd>/</kbd> to insert a block
            </span>
            <span>
              {words} {words === 1 ? "word" : "words"}
            </span>
          </footer>
        )}
        <span className="be-sr-only" role="status">
          {notice}
        </span>
      </div>
    </WorkspaceReferences.Provider>
  );
}
