/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ChangeEvent, ClipboardEvent, DragEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, Image, Table2, ChartNoAxesColumn, Superscript, Subscript, X, Trash2, ArrowUp, ArrowDown, Undo2 } from 'lucide-react';
import { uploadImageDataUrlToCloudinary } from '../cloudinary';

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
  minHeight = '620px',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const isInternalUpdate = useRef(false);
  const draggedMediaRef = useRef<HTMLElement | null>(null);
  const insertionMarkerIdRef = useRef<string | null>(null);
  const historyRef = useRef<string[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [showTablePaste, setShowTablePaste] = useState(false);
  const [showDiagramPaste, setShowDiagramPaste] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageUploadFile, setImageUploadFile] = useState<File | null>(null);
  const [imageUploadPreview, setImageUploadPreview] = useState('');
  const [imageExistingSrc, setImageExistingSrc] = useState('');
  const [pasteBuffer, setPasteBuffer] = useState('');
  const [insertTitle, setInsertTitle] = useState('');
  const [insertLegend, setInsertLegend] = useState('');
  const [insertLayout, setInsertLayout] = useState<'two-column' | 'one-column'>('two-column');
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);

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

  const applyBlockStyle = (style: 'normal' | 'subheading') => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, style === 'subheading' ? 'h3' : 'p');
    handleInput();
  };

  const pushHistory = () => {
    if (!editorRef.current) return;
    historyRef.current = [...historyRef.current.slice(-24), editorRef.current.innerHTML];
  };

  const undoLast = () => {
    if (!editorRef.current) return;
    const previous = historyRef.current.pop();
    if (previous === undefined) {
      document.execCommand('undo');
      handleInput();
      return;
    }
    editorRef.current.innerHTML = previous;
    setSelectedMediaId(null);
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
    if (editingMediaId) {
      const media = editorRef.current.querySelector<HTMLElement>(`.gbmn-inline-media[data-media-id="${editingMediaId}"]`);
      if (media) {
        pushHistory();
        const template = document.createElement('template');
        template.innerHTML = html;
        const replacement = template.content.firstElementChild;
        const spacer = template.content.querySelector('p');
        if (replacement) {
          media.replaceWith(replacement);
          if (spacer && replacement.parentNode) replacement.parentNode.insertBefore(spacer, replacement.nextSibling);
          setSelectedMediaId((replacement as HTMLElement).dataset.mediaId || null);
          placeCaretAfter(replacement);
          setEditingMediaId(null);
          handleInput();
          saveSelection();
        }
      }
      return;
    }
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
    pushHistory();
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

  const mediaActionsHtml = () => '<div class="gbmn-media-actions" contenteditable="false"><button type="button" data-media-action="edit" title="Edit"><span>Edit</span></button><button type="button" data-media-action="delete" title="Delete"><span>Delete</span></button></div>';

  const resetInsertState = () => {
    clearInsertionMarker();
    setPasteBuffer('');
    setImageUploadFile(null);
    setImageUploadPreview('');
    setImageExistingSrc('');
    setInsertTitle('');
    setInsertLegend('');
    setInsertLayout('two-column');
    setEditingMediaId(null);
    setShowImageUpload(false);
    setShowTablePaste(false);
    setShowDiagramPaste(false);
  };

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
    const mediaId = editingMediaId || crypto.randomUUID();
    insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-table gbmn-media-${insertLayout}" data-layout="${insertLayout}" contenteditable="false" draggable="true" data-media-id="${mediaId}">${mediaActionsHtml()}<figcaption><strong>${escapeHtml(insertTitle || 'Table')}</strong>${insertLegend ? ` — ${escapeHtml(insertLegend)}` : ''}</figcaption>${html}</figure><p><br></p>`);
    resetInsertState();
  };

  const insertDiagramFromText = () => {
    if (!pasteBuffer.trim()) return;
    const content = pasteBuffer.includes('<svg') || pasteBuffer.includes('<img') || pasteBuffer.includes('<table')
      ? pasteBuffer
      : `<pre>${escapeHtml(pasteBuffer)}</pre>`;
    const mediaId = editingMediaId || crypto.randomUUID();
    insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-diagram gbmn-media-${insertLayout}" data-layout="${insertLayout}" contenteditable="false" draggable="true" data-media-id="${mediaId}">${mediaActionsHtml()}<figcaption><strong>${escapeHtml(insertTitle || 'Diagram')}</strong>${insertLegend ? ` — ${escapeHtml(insertLegend)}` : ''}</figcaption>${content}</figure><p><br></p>`);
    resetInsertState();
  };

  const insertImageDataUrl = (src: string, title: string, legend?: string) => {
    const caption = title.trim() || 'Figure';
    const mediaId = editingMediaId || crypto.randomUUID();
    insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-figure gbmn-media-${insertLayout}" data-layout="${insertLayout}" contenteditable="false" draggable="true" data-media-id="${mediaId}">${mediaActionsHtml()}<figcaption><strong>${escapeHtml(caption)}</strong>${legend?.trim() ? ` — ${escapeHtml(legend)}` : ''}</figcaption><img src="${src}" alt="${escapeHtml(caption)}"></figure><p><br></p>`);
  };

  const readCompressedImage = (file: File) => new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement('img');
      img.onload = () => {
        const max = 1400;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(String(reader.result || ''));
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });

  const insertImageFile = (file: File, title?: string, legend?: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      insertImageDataUrl(String(reader.result || ''), title?.trim() || file.name, legend);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageUploadFile(file);
      setInsertTitle(file.name);
      const reader = new FileReader();
      reader.onload = () => setImageUploadPreview(String(reader.result || ''));
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const insertSelectedImage = () => {
    if ((!imageUploadFile && !imageExistingSrc) || !insertTitle.trim()) return;
    if (imageUploadFile) {
      const file = imageUploadFile;
      const title = insertTitle;
      const legend = insertLegend;
      readCompressedImage(file).then((src) => uploadImageDataUrlToCloudinary(src).catch(() => src)).then((src) => {
        insertImageDataUrl(src, title.trim() || file.name, legend);
        resetInsertState();
      });
      return;
    } else {
      insertImageDataUrl(imageExistingSrc, insertTitle, insertLegend);
    }
    resetInsertState();
  };

  const sanitizeRichPaste = (html: string) => {
    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll('*').forEach(element => {
      const tag = element.tagName.toLowerCase();
      if (!['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'sup', 'sub', 'ul', 'ol', 'li', 'table', 'tbody', 'thead', 'tr', 'th', 'td', 'span', 'h3'].includes(tag)) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }
      Array.from(element.attributes).forEach(attr => {
        if (!['rowspan', 'colspan'].includes(attr.name.toLowerCase())) element.removeAttribute(attr.name);
      });
    });
    return template.innerHTML;
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    const imageFile = Array.from(event.clipboardData.files).find(file => file.type.startsWith('image/'));
    if (imageFile) {
      event.preventDefault();
      saveSelection();
      createInsertionMarker();
      setShowImageUpload(true);
      setImageUploadFile(imageFile);
      setInsertTitle(imageFile.name);
      const reader = new FileReader();
      reader.onload = () => setImageUploadPreview(String(reader.result || ''));
      reader.readAsDataURL(imageFile);
      return;
    }
    if (html.includes('<table')) {
      event.preventDefault();
      insertHtml(`<figure class="gbmn-inline-media gbmn-inline-media-table gbmn-media-two-column" data-layout="two-column" contenteditable="false" draggable="true" data-media-id="${crypto.randomUUID()}">${mediaActionsHtml()}<figcaption><strong>Table.</strong> Add title and legend...</figcaption>${sanitizeRichPaste(html)}</figure><p><br></p>`);
      return;
    }
    if (html) {
      event.preventDefault();
      insertHtml(sanitizeRichPaste(html));
      return;
    }
    if (text) {
      event.preventDefault();
      insertHtml(escapeHtml(text).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>'));
    }
  };

  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const action = target.closest('[data-media-action]') as HTMLElement | null;
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      const media = action.closest('.gbmn-inline-media') as HTMLElement | null;
      if (!media) return;
      if (!media.dataset.mediaId) media.dataset.mediaId = crypto.randomUUID();
      setSelectedMediaId(media.dataset.mediaId);
      if (action.dataset.mediaAction === 'delete') {
        pushHistory();
        media.remove();
        handleInput();
        setSelectedMediaId(null);
        return;
      }
      editExistingMedia(media);
      return;
    }
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

  const splitCaption = (caption: string) => {
    const parts = caption.split(/\s+—\s+/);
    return { title: parts[0]?.trim() || '', legend: parts.slice(1).join(' — ').trim() };
  };

  const editExistingMedia = (media: HTMLElement) => {
    const id = media.dataset.mediaId || crypto.randomUUID();
    media.dataset.mediaId = id;
    setEditingMediaId(id);
    const parsed = splitCaption(media.querySelector('figcaption')?.textContent || '');
    setInsertTitle(parsed.title);
    setInsertLegend(parsed.legend);
    setInsertLayout(media.dataset.layout === 'one-column' || media.classList.contains('gbmn-media-one-column') ? 'one-column' : 'two-column');
    const image = media.querySelector('img') as HTMLImageElement | null;
    const table = media.querySelector('table') as HTMLTableElement | null;
    setShowImageUpload(false);
    setShowTablePaste(false);
    setShowDiagramPaste(false);
    if (image) {
      setImageExistingSrc(image.src);
      setImageUploadPreview(image.src);
      setShowImageUpload(true);
      return;
    }
    if (table) {
      setPasteBuffer(table.outerHTML);
      setShowTablePaste(true);
      return;
    }
    setPasteBuffer(Array.from(media.childNodes).filter(node => !(node instanceof HTMLElement && (node.matches('figcaption') || node.matches('.gbmn-media-actions')))).map(node => node instanceof HTMLElement ? node.outerHTML : node.textContent || '').join(''));
    setShowDiagramPaste(true);
  };

  const editSelectedMedia = () => {
    if (!editorRef.current || !selectedMediaId) return;
    const media = editorRef.current.querySelector<HTMLElement>(`.gbmn-inline-media[data-media-id="${selectedMediaId}"]`);
    if (media) editExistingMedia(media);
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
    pushHistory();
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
    pushHistory();
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
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undoLast();
      return;
    }
    if (event.key !== 'Backspace' && event.key !== 'Delete') return;
    const media = selectedMediaId
      ? editorRef.current?.querySelector<HTMLElement>(`.gbmn-inline-media[data-media-id="${selectedMediaId}"]`)
      : selectedMediaFromSelection();
    if (!media) return;
    event.preventDefault();
    pushHistory();
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
    const droppedImage = Array.from(event.dataTransfer.files).find(file => file.type.startsWith('image/'));
    if (droppedImage) {
      event.preventDefault();
      saveSelectionFromPoint(event.clientX, event.clientY);
      createInsertionMarker();
      setShowImageUpload(true);
      setImageUploadFile(droppedImage);
      setInsertTitle(droppedImage.name);
      const reader = new FileReader();
      reader.onload = () => setImageUploadPreview(String(reader.result || ''));
      reader.readAsDataURL(droppedImage);
      return;
    }
    const html = event.dataTransfer.getData('text/html');
    const dragged = draggedMediaRef.current;
    if (!html || !dragged || !editorRef.current) return;
    event.preventDefault();
    pushHistory();
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
        <select
          onChange={(event) => applyBlockStyle(event.target.value as 'normal' | 'subheading')}
          defaultValue="normal"
          className="h-8 border border-slate-300 bg-white px-2 text-xs font-semibold"
          title="Block style"
        >
          <option value="normal">Normal</option>
          <option value="subheading">Subheading</option>
        </select>
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
        <ToolbarBtn title="Undo" onClick={undoLast}>
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Insert image at cursor" onClick={() => { saveSelection(); createInsertionMarker(); setShowImageUpload(true); setShowTablePaste(false); setShowDiagramPaste(false); }}>
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

      {selectedMediaId && (
        <div className="flex flex-wrap items-center gap-2 border-x border-t border-teal-200 bg-teal-50 px-3 py-2 text-[11px]">
          <span className="font-bold text-teal-950">Selected table / figure</span>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={editSelectedMedia}
            className="rounded border border-teal-300 bg-white px-3 py-1 font-bold text-teal-800 hover:bg-teal-100"
          >
            Edit
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={deleteSelectedMedia}
            className="rounded border border-rose-200 bg-white px-3 py-1 font-bold text-rose-700 hover:bg-rose-50"
          >
            Delete
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => moveSelectedMedia('up')}
            className="rounded border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-100"
          >
            Move up
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => moveSelectedMedia('down')}
            className="rounded border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-100"
          >
            Move down
          </button>
        </div>
      )}

      {showImageUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4">
          <div className="bg-white w-full max-w-3xl max-h-[calc(100vh-48px)] overflow-y-auto border border-slate-300 shadow-2xl">
            <div className="flex items-start justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-xl text-slate-900">Insert Figure</h3>
                <p className="text-sm text-slate-600 mt-1">Upload an image, add title and legend, then insert it exactly where the cursor was.</p>
              </div>
              <button type="button" onClick={resetInsertState} className="p-1 text-slate-500 hover:text-slate-900">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div
                className="border-2 border-dashed border-slate-300 rounded bg-slate-50 p-5 text-center"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = Array.from(event.dataTransfer.files).find(item => item.type.startsWith('image/'));
                  if (file) handleImageUpload({ target: { files: [file], value: '' } } as any);
                }}
                onPaste={(event) => {
                  const file = Array.from(event.clipboardData.files).find(item => item.type.startsWith('image/'));
                  if (file) {
                    event.preventDefault();
                    handleImageUpload({ target: { files: [file], value: '' } } as any);
                  }
                }}
                tabIndex={0}
              >
                {imageUploadPreview ? (
                  <img src={imageUploadPreview} alt="Figure preview" className="max-h-56 mx-auto object-contain bg-white border" />
                ) : (
                  <p className="text-sm text-slate-500">Upload, drag & drop, or paste copied image here.</p>
                )}
                <button type="button" onClick={() => imageInputRef.current?.click()} className="mt-3 px-4 py-2 text-xs font-bold rounded bg-white border text-slate-700">
                  {imageUploadFile ? imageUploadFile.name : 'Upload Image'}
                </button>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Title <span className="text-red-600">*</span></label>
                <input value={insertTitle} onChange={(event) => setInsertTitle(event.target.value)} placeholder="Figure 1. Descriptive title" className="w-full border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <textarea value={insertLegend} onChange={(event) => setInsertLegend(event.target.value)} rows={4} placeholder="Legend (optional)" className="w-full border border-slate-300 p-3 text-sm" />
              <select value={insertLayout} onChange={(event) => setInsertLayout(event.target.value as any)} className="w-full border border-slate-300 px-3 py-2 text-sm">
                <option value="two-column">Two-column width</option>
                <option value="one-column">One-column full article width</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-slate-50">
              <button type="button" onClick={resetInsertState} className="px-5 py-2 text-sm font-semibold border rounded-md text-slate-600 bg-white">Cancel</button>
              <button type="button" disabled={(!imageUploadFile && !imageExistingSrc) || !insertTitle.trim()} onClick={insertSelectedImage} className="px-5 py-2 text-sm font-semibold rounded-md bg-sky-300 text-white disabled:opacity-50 disabled:cursor-not-allowed">{editingMediaId ? 'Update' : 'Insert'}</button>
            </div>
          </div>
        </div>
      )}

      {(showTablePaste || showDiagramPaste) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4">
          <div className="bg-white w-full max-w-4xl max-h-[calc(100vh-48px)] overflow-y-auto border border-slate-300 shadow-2xl">
            <div className="flex items-start justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-xl text-slate-900">{showTablePaste ? 'Insert Table' : 'Insert Diagram'}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {showTablePaste ? 'Create your table in Excel, Word, PowerPoint, Google Docs or Sheets, then paste it here.' : 'Paste SVG/HTML, chart markup, or diagram text. It will be inserted exactly where the cursor was.'}
                </p>
              </div>
              <button type="button" onClick={resetInsertState} className="p-1 text-slate-500 hover:text-slate-900">
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
              <select value={insertLayout} onChange={(event) => setInsertLayout(event.target.value as any)} className="w-full border border-slate-300 px-3 py-2 text-sm">
                <option value="two-column">Two-column width</option>
                <option value="one-column">One-column full article width</option>
              </select>
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
            <button type="button" onClick={resetInsertState} className="px-5 py-2 text-sm font-semibold border rounded-md text-slate-600 bg-white">
              Cancel
            </button>
            <button type="button" disabled={!pasteBuffer.trim() || !insertTitle.trim()} onClick={showTablePaste ? insertTableFromText : insertDiagramFromText} className="px-5 py-2 text-sm font-semibold rounded-md bg-sky-300 text-white disabled:opacity-50 disabled:cursor-not-allowed">
              {editingMediaId ? 'Update' : 'Insert'}
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
        style={{ minHeight, maxHeight: '72vh', overflowY: 'auto' }}
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
        .gbmn-inline-media { break-inside: avoid; margin: 12px 0; border: 1px solid #cbd5e1; padding: 8px; background: #fff; cursor: move; position: relative; }
        .gbmn-inline-media[data-media-id="${selectedMediaId || ''}"] { outline: 2px solid #0f766e; outline-offset: 2px; }
        .gbmn-inline-media::selection { background: rgba(15, 118, 110, 0.18); }
        .gbmn-inline-media img { display: block; max-width: 100%; height: auto; margin: 0 auto; }
        .gbmn-inline-media figcaption { margin-top: 6px; font-family: Arial, sans-serif; font-size: 11px; color: #475569; }
        .gbmn-inline-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
        .gbmn-inline-table th, .gbmn-inline-table td { border: 1px solid #cbd5e1; padding: 4px 6px; overflow-wrap: anywhere; word-break: normal; vertical-align: top; }
        .gbmn-inline-table th { background: #f1f5f9; font-weight: 700; }
        .gbmn-inline-media-diagram pre { white-space: pre-wrap; font-family: "JetBrains Mono", monospace; font-size: 11px; background: #f8fafc; padding: 8px; }
        .gbmn-media-actions {
          position: absolute;
          top: 6px;
          right: 6px;
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity .15s ease;
          z-index: 2;
        }
        .gbmn-inline-media:hover .gbmn-media-actions,
        .gbmn-inline-media[data-media-id="${selectedMediaId || ''}"] .gbmn-media-actions { opacity: 1; }
        .gbmn-media-actions button {
          border: 1px solid #cbd5e1;
          background: rgba(255,255,255,.96);
          color: #334155;
          font: 700 10px/1 Arial, sans-serif;
          padding: 4px 6px;
          border-radius: 4px;
          cursor: pointer;
        }
        .gbmn-media-actions button[data-media-action="delete"] { color: #b91c1c; }
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
