/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ChangeEvent, ClipboardEvent, DragEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, Image, Table2, ChartNoAxesColumn, Superscript, Subscript, X, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface RichTextEditorProps {
  label?: string;
  hint?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  showWordCount?: boolean;
  minHeight?: string;
}

export default function RichTextEditor({
  label,
  hint,
  value,
  onChange,
  placeholder = 'Enter text here...',
  showWordCount = false,
  minHeight = '180px',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const isInternalUpdate = useRef(false);
  const draggedMediaRef = useRef<HTMLElement | null>(null);
  const insertionMarkerIdRef = useRef<string | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [showTablePaste, setShowTablePaste] = useState(false);
  const [showDiagramPaste, setShowDiagramPaste] = useState(false);
  const [pasteBuffer, setPasteBuffer] = useState('');
  const [insertTitle, setInsertTitle] = useState('');
  const [insertLegend, setInsertLegend] = useState('');

  // Sync incoming value into contenteditable (only if different to avoid cursor jump)
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);
  };

  const execCmd = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const saveSelectionFromPoint = (x: number, y: number) => {
    if (!editorRef.current) return;
    const range = rangeFromPoint(x, y);
    if (!range || !editorRef.current.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) return;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  };

  const placeCaretAfter = (node: Node) => {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
  };

  const isEmptySpacer = (node: ChildNode | null) => {
    if (!node) return false;
    if (node.nodeType === Node.TEXT_NODE) return !node.textContent?.trim();
    if (!(node instanceof HTMLElement)) return false;
    const html = node.innerHTML.replace(/&nbsp;/g, '').trim().toLowerCase();
    return node.tagName === 'BR' || (node.tagName === 'P' && (!html || html === '<br>'));
  };

  const clearInsertionMarker = () => {
    if (!editorRef.current || !insertionMarkerIdRef.current) return;
    editorRef.current.querySelector(`[data-gbmn-caret-marker="${insertionMarkerIdRef.current}"]`)?.remove();
    insertionMarkerIdRef.current = null;
  };

  const createInsertionMarker = () => {
    if (!editorRef.current) return;
    clearInsertionMarker();
    editorRef.current.focus();
    const selection = window.getSelection();
    const liveRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const baseRange = savedRangeRef.current && editorRef.current.contains(savedRangeRef.current.commonAncestorContainer)
      ? savedRangeRef.current.cloneRange()
      : liveRange && editorRef.current.contains(liveRange.commonAncestorContainer)
        ? liveRange.cloneRange()
        : document.createRange();
    if (
      (!savedRangeRef.current || !editorRef.current.contains(savedRangeRef.current.commonAncestorContainer)) &&
      (!liveRange || !editorRef.current.contains(liveRange.commonAncestorContainer))
    ) {
      baseRange.selectNodeContents(editorRef.current);
      baseRange.collapse(false);
    }
    baseRange.deleteContents();
    const markerId = crypto.randomUUID();
    const marker = document.createElement('span');
    marker.dataset.gbmnCaretMarker = markerId;
    marker.style.display = 'inline-block';
    marker.style.width = '0';
    marker.style.height = '0';
    marker.style.overflow = 'hidden';
    marker.textContent = '\ufeff';
    baseRange.insertNode(marker);
    insertionMarkerIdRef.current = markerId;
    placeCaretAfter(marker);
  };

  const rangeFromPoint = (x: number, y: number) => {
    const doc = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };
    if (doc.caretRangeFromPoint) return doc.caretRangeFromPoint(x, y);
    const position = doc.caretPositionFromPoint?.(x, y);
    if (!position) return null;
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
  };

  const insertHtml = (html: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const savedRange = savedRangeRef.current;
    const selection = window.getSelection();
    const liveRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const activeRange = savedRange && editorRef.current.contains(savedRange.commonAncestorContainer)
      ? savedRange.cloneRange()
      : liveRange && editorRef.current.contains(liveRange.commonAncestorContainer)
        ? liveRange.cloneRange()
      : document.createRange();
    if (
      (!savedRange || !editorRef.current.contains(savedRange.commonAncestorContainer)) &&
      (!liveRange || !editorRef.current.contains(liveRange.commonAncestorContainer))
    ) {
      activeRange.selectNodeContents(editorRef.current);
      activeRange.collapse(false);
    }
    selection?.removeAllRanges();
    selection?.addRange(activeRange);
    activeRange.deleteContents();
    const template = document.createElement('template');
    template.innerHTML = html;
    const fragment = template.content;
    const marker = insertionMarkerIdRef.current
      ? editorRef.current.querySelector(`[data-gbmn-caret-marker="${insertionMarkerIdRef.current}"]`)
      : null;
    if (marker) {
      const nodes = Array.from(fragment.childNodes);
      marker.replaceWith(...nodes);
      const lastInserted = nodes[nodes.length - 1];
      insertionMarkerIdRef.current = null;
      if (lastInserted) placeCaretAfter(lastInserted);
      handleInput();
      saveSelection();
      return;
    }
    const lastNode = fragment.lastChild;
    activeRange.insertNode(fragment);
    if (lastNode) placeCaretAfter(lastNode);
    handleInput();
    saveSelection();
  };

  const escapeHtml = (text: string) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const tableFromDelimitedText = (text: string) => {
    const rows = text.trim().split(/\r?\n/).filter(Boolean).map(row => row.split(/\t|,/).map(cell => cell.trim()));
    if (rows.length === 0) return '';
    return `<table class="gbmn-inline-table"><tbody>${rows.map((row, rIdx) => (
      `<tr>${row.map(cell => rIdx === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    )).join('')}</tbody></table>`;
  };

  const insertTableFromText = () => {
    const html = pasteBuffer.includes('<table')
      ? pasteBuffer
      : tableFromDelimitedText(pasteBuffer);
    if (!html) return;
    insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-table" contenteditable="false" draggable="true" data-media-id="${crypto.randomUUID()}"><figcaption><strong>${escapeHtml(insertTitle || 'Table')}</strong>${insertLegend ? ` — ${escapeHtml(insertLegend)}` : ''}</figcaption>${html}</figure><p><br></p>`);
    setPasteBuffer('');
    setInsertTitle('');
    setInsertLegend('');
    setShowTablePaste(false);
  };

  const insertDiagramFromText = () => {
    if (!pasteBuffer.trim()) return;
    const content = pasteBuffer.includes('<svg') || pasteBuffer.includes('<img') || pasteBuffer.includes('<table')
      ? pasteBuffer
      : `<pre>${escapeHtml(pasteBuffer)}</pre>`;
    insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-diagram" contenteditable="false" draggable="true" data-media-id="${crypto.randomUUID()}"><figcaption><strong>${escapeHtml(insertTitle || 'Diagram')}</strong>${insertLegend ? ` — ${escapeHtml(insertLegend)}` : ''}</figcaption>${content}</figure><p><br></p>`);
    setPasteBuffer('');
    setInsertTitle('');
    setInsertLegend('');
    setShowDiagramPaste(false);
  };

  const insertImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-figure" contenteditable="false" draggable="true" data-media-id="${crypto.randomUUID()}"><figcaption>${escapeHtml(file.name)}</figcaption><img src="${reader.result}" alt="${escapeHtml(file.name)}"></figure><p><br></p>`);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) insertImageFile(file);
    event.target.value = '';
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    const imageFile = Array.from(event.clipboardData.files).find(file => file.type.startsWith('image/'));
    if (imageFile && !html && !text) {
      event.preventDefault();
      insertImageFile(imageFile);
      return;
    }
    if (html.includes('<table')) {
      event.preventDefault();
      insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-table" contenteditable="false" draggable="true" data-media-id="${crypto.randomUUID()}"><figcaption><strong>Table.</strong> Add title and legend...</figcaption>${html}</figure><p><br></p>`);
      return;
    }
    if (text) {
      event.preventDefault();
      insertHtml(escapeHtml(text).replace(/\n/g, '<br>'));
    }
  };

  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const media = target.closest('.gbmn-inline-media');
    if (!media) {
      setSelectedMediaId(null);
      saveSelectionFromPoint(event.clientX, event.clientY);
      return;
    }
    event.preventDefault();
    const element = media as HTMLElement;
    if (!element.dataset.mediaId) element.dataset.mediaId = crypto.randomUUID();
    setSelectedMediaId(element.dataset.mediaId);
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNode(media);
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRangeRef.current = range.cloneRange();
  };

  const moveSelectedMedia = (direction: 'up' | 'down') => {
    if (!editorRef.current || !selectedMediaId) return;
    const media = editorRef.current.querySelector<HTMLElement>(`.gbmn-inline-media[data-media-id="${selectedMediaId}"]`);
    if (!media || !media.parentNode) return;
    let neighbor = direction === 'up' ? media.previousSibling : media.nextSibling;
    while (isEmptySpacer(neighbor)) {
      neighbor = direction === 'up' ? neighbor.previousSibling : neighbor.nextSibling;
    }
    if (!neighbor) return;
    if (direction === 'up') {
      media.parentNode.insertBefore(media, neighbor);
    } else {
      media.parentNode.insertBefore(media, neighbor.nextSibling);
    }
    placeCaretAfter(media);
    handleInput();
  };

  const deleteSelectedMedia = () => {
    if (!editorRef.current || !selectedMediaId) return;
    const media = editorRef.current.querySelector<HTMLElement>(`.gbmn-inline-media[data-media-id="${selectedMediaId}"]`);
    if (!media) return;
    const next = media.nextSibling;
    media.remove();
    if (next) placeCaretAfter(next);
    setSelectedMediaId(null);
    handleInput();
  };

  const selectedMediaFromSelection = () => {
    if (!editorRef.current) return null;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer as Element
      : range.commonAncestorContainer.parentElement;
    return node?.closest?.('.gbmn-inline-media') as HTMLElement | null;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Backspace' && event.key !== 'Delete') return;
    const media = selectedMediaId
      ? editorRef.current?.querySelector<HTMLElement>(`.gbmn-inline-media[data-media-id="${selectedMediaId}"]`)
      : selectedMediaFromSelection();
    if (!media) return;
    event.preventDefault();
    media.remove();
    setSelectedMediaId(null);
    handleInput();
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    const media = (event.target as HTMLElement).closest('.gbmn-inline-media') as HTMLElement | null;
    if (!media) return;
    if (!media.dataset.mediaId) media.dataset.mediaId = crypto.randomUUID();
    draggedMediaRef.current = media;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', media.outerHTML);
    event.dataTransfer.setData('text/plain', media.innerText);
    setSelectedMediaId(media.dataset.mediaId);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const html = event.dataTransfer.getData('text/html');
    const dragged = draggedMediaRef.current;
    if (!html || !dragged || !editorRef.current) return;
    event.preventDefault();
    const dropRange = rangeFromPoint(event.clientX, event.clientY);
    if (!dropRange || !editorRef.current.contains(dropRange.commonAncestorContainer)) return;
    const template = document.createElement('template');
    template.innerHTML = html;
    const moved = template.content.firstElementChild as HTMLElement | null;
    if (!moved) return;
    moved.dataset.mediaId = crypto.randomUUID();
    dropRange.insertNode(moved);
    dragged.remove();
    draggedMediaRef.current = null;
    setSelectedMediaId(moved.dataset.mediaId || null);
    placeCaretAfter(moved);
    handleInput();
  };

  const wordCount = value
    ? value.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block font-bold text-slate-800 text-xs">{label}</label>
      )}
      {hint && (
        <p className="text-[10px] text-slate-500 italic">{hint}</p>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 bg-slate-100 border border-b-0 border-slate-300 rounded-t-lg p-1.5">
        <ToolbarBtn title="Bold" onClick={() => execCmd('bold')}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Italic" onClick={() => execCmd('italic')}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Underline" onClick={() => execCmd('underline')}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Superscript" onClick={() => execCmd('superscript')}>
          <Superscript className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Subscript" onClick={() => execCmd('subscript')}>
          <Subscript className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <div className="w-px bg-slate-300 mx-0.5" />
        <ToolbarBtn title="Bullet list" onClick={() => execCmd('insertUnorderedList')}>
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Numbered list" onClick={() => execCmd('insertOrderedList')}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <div className="w-px bg-slate-300 mx-0.5" />
        <ToolbarBtn title="Remove formatting" onClick={() => execCmd('removeFormat')}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <div className="w-px bg-slate-300 mx-0.5" />
        <ToolbarBtn title="Insert image at cursor" onClick={() => { saveSelection(); imageInputRef.current?.click(); }}>
          <Image className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Paste table at cursor" onClick={() => { saveSelection(); createInsertionMarker(); setShowTablePaste(true); setShowDiagramPaste(false); }}>
          <Table2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Paste diagram at cursor" onClick={() => { saveSelection(); createInsertionMarker(); setShowDiagramPaste(true); setShowTablePaste(false); }}>
          <ChartNoAxesColumn className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Delete selected table, figure, or diagram" onClick={deleteSelectedMedia}>
          <Trash2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Move selected table, figure, or diagram up" onClick={() => moveSelectedMedia('up')}>
          <ArrowUp className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Move selected table, figure, or diagram down" onClick={() => moveSelectedMedia('down')}>
          <ArrowDown className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      {(showTablePaste || showDiagramPaste) && (
        <div className="fixed inset-0 z-60 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-sm shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-xl text-slate-900">{showTablePaste ? 'Insert Table' : 'Insert Diagram'}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {showTablePaste ? 'Create your table in Excel, Word, PowerPoint, Google Docs or Sheets, then paste it here.' : 'Paste SVG/HTML, chart markup, or diagram text. It will be inserted exactly where the cursor was.'}
                </p>
              </div>
              <button type="button" onClick={() => { clearInsertionMarker(); setShowTablePaste(false); setShowDiagramPaste(false); }} className="p-1 text-slate-500 hover:text-slate-900">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="border border-slate-300">
                <div className="flex gap-2 p-2 border-b bg-slate-50 text-slate-700">
                  <Bold className="h-4 w-4" />
                  <Italic className="h-4 w-4" />
                  <Superscript className="h-4 w-4" />
                  <Subscript className="h-4 w-4" />
                </div>
          <textarea
            value={pasteBuffer}
            onChange={(event) => setPasteBuffer(event.target.value)}
                  rows={8}
                  placeholder={showTablePaste ? 'Paste table here. Required before Insert.' : 'Paste diagram here. Required before Insert.'}
                  className="w-full bg-white p-5 text-sm font-sans focus:outline-none resize-y"
          />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Title <span className="text-red-600">*</span></label>
                <input
                  value={insertTitle}
                  onChange={(event) => setInsertTitle(event.target.value)}
                  placeholder={showTablePaste ? 'Table 1: Enter your descriptive title here (required). Do not include reference citations.' : 'Figure 1: Enter your diagram title here (required).'}
                  className="w-full border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="border border-slate-300">
                <div className="flex gap-2 p-2 border-b bg-slate-50 text-slate-700">
                  <Italic className="h-4 w-4" />
                  <Superscript className="h-4 w-4" />
                  <Subscript className="h-4 w-4" />
                </div>
                <textarea
                  value={insertLegend}
                  onChange={(event) => setInsertLegend(event.target.value)}
                  rows={4}
                  placeholder="Enter your legend here (optional). Please include abbreviation definitions and reference citations here."
                  className="w-full bg-white p-5 text-sm focus:outline-none resize-y"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-slate-50">
            <button type="button" onClick={() => { clearInsertionMarker(); setPasteBuffer(''); setInsertTitle(''); setInsertLegend(''); setShowTablePaste(false); setShowDiagramPaste(false); }} className="px-5 py-2 text-sm font-semibold border rounded-md text-slate-600 bg-white">
              Cancel
            </button>
            <button type="button" disabled={!pasteBuffer.trim() || !insertTitle.trim()} onClick={showTablePaste ? insertTableFromText : insertDiagramFromText} className="px-5 py-2 text-sm font-semibold rounded-md bg-sky-300 text-white disabled:opacity-50 disabled:cursor-not-allowed">
              Insert
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onDragStart={handleDragStart}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onMouseDown={(event) => saveSelectionFromPoint(event.clientX, event.clientY)}
        onMouseUp={() => setTimeout(saveSelection, 0)}
        onKeyUp={saveSelection}
        onFocus={saveSelection}
        onClick={handleEditorClick}
        data-placeholder={placeholder}
        className="w-full bg-white border border-slate-300 rounded-b-lg p-3 font-serif text-[14px] leading-relaxed focus:ring-1 focus:ring-teal-600 focus:outline-none text-slate-800 rich-editor-area"
        style={{ minHeight }}
      />

      {showWordCount && (
        <span className="text-[10px] text-slate-400 font-mono italic">
          Word count: {wordCount}
        </span>
      )}

      <style>{`
        .rich-editor-area:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rich-editor-area ul { list-style: disc; padding-left: 1.5em; }
        .rich-editor-area ol { list-style: decimal; padding-left: 1.5em; }
        .gbmn-inline-media { break-inside: avoid; margin: 12px 0; border: 1px solid #cbd5e1; padding: 8px; background: #fff; cursor: move; }
        .gbmn-inline-media[data-media-id="${selectedMediaId || ''}"] { outline: 2px solid #0f766e; outline-offset: 2px; }
        .gbmn-inline-media::selection { background: rgba(15, 118, 110, 0.18); }
        .gbmn-inline-media img { display: block; max-width: 100%; height: auto; margin: 0 auto; }
        .gbmn-inline-media figcaption { margin-top: 6px; font-family: Arial, sans-serif; font-size: 11px; color: #475569; }
        .gbmn-inline-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
        .gbmn-inline-table th, .gbmn-inline-table td { border: 1px solid #cbd5e1; padding: 4px 6px; }
        .gbmn-inline-table th { background: #f1f5f9; font-weight: 700; }
        .gbmn-inline-media-diagram pre { white-space: pre-wrap; font-family: "JetBrains Mono", monospace; font-size: 11px; background: #f8fafc; padding: 8px; }
      `}</style>
    </div>
  );
}

function ToolbarBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // Don't blur editor
        onClick();
      }}
      className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors"
    >
      {children}
    </button>
  );
}
