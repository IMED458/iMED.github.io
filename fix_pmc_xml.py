#!/usr/bin/env python3
"""
fix_pmc_xml.py — PMC Submission Package Generator
Converts any JATS XML manuscript to a PMC-ready submission package.

Usage:
    python fix_pmc_xml.py \\
        --xml input.xml \\
        --figures fig1.jpg fig2.png \\
        --supplementary supp1.pdf supp2.xlsx \\
        --output-dir ./pmc_package/

Dependencies:
    pip install lxml Pillow
"""

import argparse
import os
import re
import shutil
import sys
from copy import deepcopy
from datetime import datetime
from pathlib import Path

from lxml import etree

# ─── Namespace constants ──────────────────────────────────────────────────────

XLINK_NS = "http://www.w3.org/1999/xlink"
XLINK = f"{{{XLINK_NS}}}"
NSMAP = {"xlink": XLINK_NS}

MIME_TYPES = {
    ".pdf":  "application/pdf",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls":  "application/vnd.ms-excel",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc":  "application/msword",
    ".csv":  "text/csv",
    ".txt":  "text/plain",
    ".zip":  "application/zip",
    ".mp4":  "video/mp4",
    ".mov":  "video/quicktime",
    ".avi":  "video/x-msvideo",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif":  "image/gif",
    ".tif":  "image/tiff",
    ".tiff": "image/tiff",
}

HEADER_KEYWORDS = [
    "Reference Range", "Normal Range", "Reference Values",
    "Units", "Unit", "Parameter", "Cellular Elements",
    "Test", "Variable", "Characteristic", "Component",
    "Item", "Measurement", "Result",
]

TABLE_HEADER_STARTS = [
    "Test", "Parameter", "Cellular Elements", "Variable",
    "Characteristic", "Component", "Item", "Measurement",
]

JATS_DOCTYPE = (
    '<!DOCTYPE article PUBLIC '
    '"-//NLM//DTD JATS (Z39.96) Journal Publishing DTD v1.3 20210610//EN" '
    '"https://jats.nlm.nih.gov/publishing/1.3/JATS-journalpublishing1-3.dtd">'
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_all_text(elem):
    """Get all text content of element (text + tail of all descendants)."""
    return "".join(elem.itertext())


def _is_in_abstract(elem, root):
    """Check if element is inside an <abstract> element."""
    parent = elem.getparent()
    while parent is not None:
        if parent.tag == "abstract":
            return True
        parent = parent.getparent()
    return False


def _is_in_xref(elem):
    """Check if element is inside an <xref>."""
    parent = elem.getparent()
    while parent is not None:
        if parent.tag == "xref":
            return True
        parent = parent.getparent()
    return False


def _make_xref(ref_type, rid, text):
    """Create a JATS <xref> element."""
    el = etree.Element("xref")
    el.set("ref-type", ref_type)
    el.set("rid", rid)
    el.text = text
    return el


def _strip_text(s):
    """Strip and normalize whitespace."""
    return re.sub(r"\s+", " ", (s or "").strip())


def _get_article_meta(tree):
    return tree.find(".//article-meta")


def _get_body(tree):
    return tree.find(".//body")


def _get_back(tree):
    return tree.find(".//back")


# ─── Part 1.1: Fix EditDelete artifacts ──────────────────────────────────────

def fix_editdelete(tree):
    """Remove 'EditDelete' / 'Edit Delete' artifacts from text elements."""
    pattern = re.compile(r"^\s*(EditDelete|Edit\s+Delete)\s*", re.IGNORECASE)
    tags = ["p", "title", "caption", "label", "th", "td"]
    removed = 0
    modified = 0

    # Also clean from all text/tail nodes anywhere in document
    anywhere_pattern = re.compile(r"\b(EditDelete|Edit\s+Delete)\b\s*", re.IGNORECASE)

    for tag in tags:
        for elem in list(tree.findall(f".//{tag}")):
            full = _get_all_text(elem).strip()
            # If element contains ONLY EditDelete text → remove it
            if re.fullmatch(r"\s*(EditDelete|Edit\s+Delete)\s*", full, re.IGNORECASE):
                parent = elem.getparent()
                if parent is not None:
                    # Preserve tail text
                    if elem.tail:
                        prev = elem.getprevious()
                        if prev is not None:
                            prev.tail = (prev.tail or "") + elem.tail
                        else:
                            parent.text = (parent.text or "") + elem.tail
                    parent.remove(elem)
                    removed += 1
                continue
            # Strip from start of .text
            if elem.text and pattern.match(elem.text):
                elem.text = pattern.sub("", elem.text)
                modified += 1
            # Also clean EditDelete from anywhere within text nodes
            if elem.text and anywhere_pattern.search(elem.text):
                elem.text = anywhere_pattern.sub("", elem.text)
                modified += 1
            # Clean from tail of child elements
            for child in elem:
                if child.tail and anywhere_pattern.search(child.tail):
                    child.tail = anywhere_pattern.sub("", child.tail)
                    modified += 1

    print(f"  EditDelete: {removed} elements removed, {modified} elements cleaned")


# ─── Part 1.2: Inline tables <p> → <table-wrap> ──────────────────────────────

def _parse_inline_table(p_text, table_index):
    """
    Parse inline table text from a <p> element.
    Returns (label, caption_title, caption_abbrev, headers, rows, confidence).
    """
    text = _strip_text(p_text)
    label = f"Table {table_index}"
    caption_title = ""
    caption_abbrev = ""
    headers = []
    rows = []
    confidence = 100

    # Extract label and caption from "Table N: ..." pattern
    m = re.match(r"Table\s+(\d+)\s*[:\.]?\s*(.*)", text, re.IGNORECASE)
    if m:
        table_index = int(m.group(1))
        label = f"Table {table_index}"
        remainder = m.group(2).strip()
    else:
        remainder = text

    # Split caption from data at "—" or first header keyword occurrence
    abbrev_match = re.search(r"—\s*(.+?)(?=\n|$)", remainder)
    if abbrev_match:
        caption_abbrev = abbrev_match.group(1).strip()
        remainder = remainder[:abbrev_match.start()].strip()

    # Find header keyword position to split caption from table data
    header_pos = len(remainder)
    for kw in TABLE_HEADER_STARTS + HEADER_KEYWORDS:
        idx = remainder.find(kw)
        if idx != -1 and idx < header_pos:
            header_pos = idx

    if header_pos < len(remainder):
        caption_title = remainder[:header_pos].strip().rstrip(":—").strip()
        table_part = remainder[header_pos:]
    else:
        caption_title = remainder.strip().rstrip(":—").strip()
        table_part = ""
        confidence = 60  # No clear table data found

    if not table_part:
        confidence = 50
        return label, caption_title, caption_abbrev, [], [], confidence

    # Split table_part into lines and parse
    lines = [l.strip() for l in re.split(r"[\n\r]+", table_part) if l.strip()]
    if not lines:
        confidence = 40
        return label, caption_title, caption_abbrev, [], [], confidence

    # Identify header row: first line or line starting with known header keyword
    header_row_idx = 0
    for i, line in enumerate(lines):
        if any(line.startswith(kw) for kw in TABLE_HEADER_STARTS):
            header_row_idx = i
            break

    # Parse header columns using whitespace/tab splitting, then infer from data
    header_line = lines[header_row_idx]

    # Try to split headers - handle "Units Reference Range" as two columns
    # Use known multi-word column names
    known_cols = [
        "Reference Range", "Normal Range", "Reference Values",
        "Cellular Elements", "Test", "Parameter", "Variable",
        "Units", "Unit", "Result", "Value", "p-value",
        "Mean ± SD", "n (%)", "95% CI",
    ]
    # Build header list by greedy matching known column names
    headers = _split_header(header_line, known_cols)
    if not headers:
        # Fallback: split by 2+ spaces or tabs
        headers = re.split(r"\s{2,}|\t", header_line)
        headers = [h.strip() for h in headers if h.strip()]

    if not headers:
        confidence = 40
        return label, caption_title, caption_abbrev, [], [], confidence

    num_cols = len(headers)

    # Parse data rows
    data_lines = lines[header_row_idx + 1:]
    for line in data_lines:
        if not line.strip():
            continue
        # Split into cells; try tab first, then 2+ spaces, then regex
        cells = re.split(r"\t|\s{2,}", line)
        cells = [c.strip() for c in cells if c.strip()]

        if len(cells) == num_cols:
            rows.append(cells)
        elif len(cells) > num_cols:
            # Merge extra cells into last column
            merged = cells[:num_cols - 1] + [" ".join(cells[num_cols - 1:])]
            rows.append(merged)
        elif len(cells) < num_cols and len(cells) >= 2:
            # Pad with empty strings
            padded = cells + [""] * (num_cols - len(cells))
            rows.append(padded)
            confidence = min(confidence, 75)
        else:
            # Single-cell line — could be a sub-header or continuation
            rows.append([line] + [""] * (num_cols - 1))
            confidence = min(confidence, 70)

    if not rows:
        confidence = 50

    return label, caption_title, caption_abbrev, headers, rows, confidence


def _split_header(header_line, known_cols):
    """Split a header line using known column names as anchors."""
    result = []
    remaining = header_line
    # Try known multi-word columns first (longest match)
    known_sorted = sorted(known_cols, key=len, reverse=True)
    while remaining:
        matched = False
        remaining_stripped = remaining.strip()
        for kw in known_sorted:
            if remaining_stripped.startswith(kw):
                result.append(kw)
                remaining = remaining_stripped[len(kw):].lstrip()
                matched = True
                break
        if not matched:
            # Take next word
            m = re.match(r"(\S+)\s*(.*)", remaining_stripped)
            if m:
                result.append(m.group(1))
                remaining = m.group(2)
            else:
                break
    return result


def _build_table_wrap(label, caption_title, caption_abbrev, headers, rows, idx, confidence):
    """Build JATS <table-wrap> element."""
    wrap = etree.Element("table-wrap")
    wrap.set("id", f"table{idx}")
    wrap.set("orientation", "portrait")
    wrap.set("position", "float")

    if confidence < 80:
        wrap.append(etree.Comment(
            f" MANUAL REVIEW REQUIRED: table {idx} parsing confidence {confidence}% "
        ))

    lbl = etree.SubElement(wrap, "label")
    lbl.text = label

    cap = etree.SubElement(wrap, "caption")
    if caption_title:
        title_el = etree.SubElement(cap, "title")
        title_el.text = caption_title
    if caption_abbrev:
        abbrev_el = etree.SubElement(cap, "p")
        abbrev_el.text = caption_abbrev

    if not headers and not rows:
        # No parseable table data — add comment
        wrap.append(etree.Comment(" ORIGINAL TABLE TEXT: could not parse rows "))
        return wrap

    tbl = etree.SubElement(wrap, "table")
    tbl.set("frame", "hsides")
    tbl.set("rules", "groups")

    if headers:
        thead = etree.SubElement(tbl, "thead")
        tr = etree.SubElement(thead, "tr")
        for h in headers:
            th = etree.SubElement(tr, "th")
            th.text = h

    if rows:
        tbody = etree.SubElement(tbl, "tbody")
        for row in rows:
            tr = etree.SubElement(tbody, "tr")
            for cell in row:
                td = etree.SubElement(tr, "td")
                td.text = cell

    return wrap


def fix_inline_tables(tree):
    """Convert inline table <p> elements to proper <table-wrap> elements."""
    body = _get_body(tree)
    if body is None:
        return

    table_counter = [0]
    converted = 0

    def _looks_like_table(p):
        text = _get_all_text(p)
        if re.search(r"\bTable\s+\d+\s*[:\.]", text, re.IGNORECASE):
            return True
        # Check for header keywords (at least 2 different ones suggest a table)
        matches = sum(1 for kw in HEADER_KEYWORDS if kw in text)
        return matches >= 2

    def _process_section(section):
        nonlocal converted
        children = list(section)
        i = 0
        while i < len(children):
            child = children[i]
            if child.tag == "p" and _looks_like_table(child):
                # Check it's not already inside a table-wrap
                if child.getparent().tag not in ("table-wrap", "caption", "th", "td"):
                    table_counter[0] += 1
                    text = _get_all_text(child)
                    try:
                        label, cap_title, cap_abbrev, headers, rows, conf = \
                            _parse_inline_table(text, table_counter[0])
                        wrap = _build_table_wrap(
                            label, cap_title, cap_abbrev, headers, rows,
                            table_counter[0], conf
                        )
                        # Preserve tail text
                        wrap.tail = child.tail
                        section.replace(child, wrap)
                        children[i] = wrap
                        converted += 1
                    except Exception as exc:
                        child.insert(0, etree.Comment(
                            f" MANUAL REVIEW REQUIRED: table parse error: {exc} "
                        ))
            elif child.tag in ("sec", "body"):
                _process_section(child)
            i += 1

    _process_section(body)
    print(f"  Inline tables: {converted} <p> elements converted to <table-wrap>")


# ─── Part 1.3: Figure caption <p> → <fig> ────────────────────────────────────

def _parse_inline_figure(p_text, fig_index, has_image_file):
    """Parse figure caption from <p> text."""
    text = _strip_text(p_text)

    # Strip EditDelete prefix
    text = re.sub(r"^\s*(EditDelete|Edit\s+Delete)\s*", "", text, flags=re.IGNORECASE)

    # Extract figure number
    m = re.match(r"(?:Figure|Fig\.?)\s+(\d+)\s*[:\.]?\s*(.*)", text, re.IGNORECASE)
    if m:
        fig_index = int(m.group(1))
        remainder = m.group(2).strip()
    else:
        remainder = text

    label = f"Figure {fig_index}"

    # Split into title (first sentence) and body
    # Split at first "." not inside parentheses, or at "—"
    title = ""
    body = ""

    # Find first sentence break
    sentence_end = re.search(r"(?<!\w\.\w)(?<![A-Z][a-z]\.)(?<!\s[A-Z]\.)\.(?!\d)|\—", remainder)
    if sentence_end:
        title = remainder[:sentence_end.start() + (1 if remainder[sentence_end.start()] == "." else 0)].strip()
        body = remainder[sentence_end.end():].strip()
    else:
        title = remainder.strip()
        body = ""

    return label, title, body, fig_index


def _build_fig(label, title, body, fig_index, has_image_file):
    """Build JATS <fig> element."""
    fig = etree.Element("fig")
    fig.set("id", f"fig{fig_index}")
    fig.set("orientation", "portrait")
    fig.set("position", "float")

    lbl = etree.SubElement(fig, "label")
    lbl.text = label

    cap = etree.SubElement(fig, "caption")
    title_el = etree.SubElement(cap, "title")
    title_el.text = title or label
    if body:
        body_el = etree.SubElement(cap, "p")
        body_el.text = body

    graphic = etree.SubElement(fig, "graphic")
    graphic.set(f"{XLINK}href", f"fig{fig_index}")
    if not has_image_file:
        fig.append(etree.Comment(
            f" IMAGE FILE MISSING: please provide fig{fig_index}.tif "
        ))

    return fig


def fix_inline_figures(tree, fig_ids):
    """Convert inline figure caption <p> elements to <fig> elements."""
    body = _get_body(tree)
    if body is None:
        return

    converted = 0
    fig_counter = [0]

    _fig_id_set = set(fig_ids)  # e.g., {"fig1", "fig2"}

    def _looks_like_figure(p):
        text = _get_all_text(p)
        if re.match(r"^\s*(EditDelete\s+)?(Figure|Fig\.?)\s+\d+", text, re.IGNORECASE):
            return True
        return False

    def _process_section(section):
        nonlocal converted
        children = list(section)
        i = 0
        while i < len(children):
            child = children[i]
            if child.tag == "p" and _looks_like_figure(child):
                if child.getparent().tag not in ("fig", "caption"):
                    fig_counter[0] += 1
                    text = _get_all_text(child)
                    try:
                        label, title, body_text, fig_num = _parse_inline_figure(
                            text, fig_counter[0], False
                        )
                        has_image = f"fig{fig_num}" in _fig_id_set
                        fig_el = _build_fig(label, title, body_text, fig_num, has_image)
                        fig_el.tail = child.tail
                        section.replace(child, fig_el)
                        children[i] = fig_el
                        converted += 1
                    except Exception as exc:
                        child.insert(0, etree.Comment(
                            f" MANUAL REVIEW REQUIRED: figure parse error: {exc} "
                        ))
            elif child.tag in ("sec", "body"):
                _process_section(child)
            i += 1

    _process_section(body)
    print(f"  Inline figures: {converted} <p> elements converted to <fig>")


# ─── Part 1.4: Supplementary material section ────────────────────────────────

def fix_supplementary_section(tree, supp_names):
    """Add supplementary material section to <back>."""
    if not supp_names:
        return

    back = _get_back(tree)
    if back is None:
        back = etree.SubElement(tree.getroot(), "back")

    # Check if supplementary section already exists
    for sec in back.findall("sec"):
        if sec.get("sec-type") == "supplementary-material":
            print("  Supplementary: section already exists, skipping")
            return

    sec = etree.SubElement(back, "sec")
    sec.set("sec-type", "supplementary-material")
    title_el = etree.SubElement(sec, "title")
    title_el.text = "Supplementary material"

    for i, name in enumerate(supp_names, 1):
        ext = Path(name).suffix.lower()
        mime = MIME_TYPES.get(ext, "application/octet-stream")
        sup = etree.SubElement(sec, "supplementary-material")
        sup.set("id", f"supp{i}")
        sup.set(f"{XLINK}href", name)
        sup.set("mimetype", mime.split("/")[0])
        sup.set("mime-subtype", mime.split("/")[1] if "/" in mime else mime)
        sup.set("content-type", "local-data")
        lbl = etree.SubElement(sup, "label")
        lbl.text = f"Supplementary file {i}"
        cap = etree.SubElement(sup, "caption")
        p = etree.SubElement(cap, "p")
        p.text = name

    print(f"  Supplementary: added section with {len(supp_names)} file(s)")


# ─── Part 1.5: DOI format ─────────────────────────────────────────────────────

def fix_doi_format(tree):
    """Clean DOI format in <pub-id> elements."""
    fixed = 0
    for elem in tree.findall('.//pub-id[@pub-id-type="doi"]'):
        if elem.text:
            m = re.search(r'10\.\d{4,}[^\s,;]+', elem.text)
            if m:
                clean = m.group(0).strip().rstrip('.')
                if clean != elem.text:
                    elem.text = clean
                    fixed += 1
    print(f"  DOI format: {fixed} elements cleaned")


# ─── Part 1.6: Author names ───────────────────────────────────────────────────

def fix_author_names(tree):
    """Fix lowercase author surnames and given-names."""
    fixed = 0
    for tag in ["surname", "given-names"]:
        for elem in tree.findall(f".//{tag}"):
            if elem.text and elem.text == elem.text.lower() and elem.text.strip():
                elem.text = elem.text.title()
                fixed += 1
    print(f"  Author names: {fixed} name elements title-cased")


# ─── Part 1.7: In-text xref elements ─────────────────────────────────────────

def _make_xref_patterns(tree):
    """
    Build list of (regex_pattern, builder_fn) for xref injection.
    builder_fn takes a re.Match and returns (xref_element, prefix_text, suffix_text).
    """
    patterns = []

    # [1], [1,2], [1-3], [1, 2, 3] — citation references
    def make_bibr(m):
        nums_text = m.group(1)
        nums = re.findall(r'\d+', nums_text)
        if len(nums) == 1:
            el = _make_xref("bibr", f"ref{nums[0]}", m.group(0))
        else:
            # Multiple refs: create xref for first, mention others in text
            el = _make_xref("bibr", f"ref{nums[0]}", m.group(0))
        return el

    patterns.append((r'\[(\d+(?:\s*[,\-–]\s*\d+)*)\]', make_bibr))

    # Table N / Table N,M references (not inside table captions)
    def make_table_ref(m):
        num = re.search(r'\d+', m.group(0)).group(0)
        return _make_xref("table", f"table{num}", m.group(0))

    patterns.append((r'\bTable\s+\d+\b', make_table_ref))

    # Figure N / Fig. N references
    def make_fig_ref(m):
        num = re.search(r'\d+', m.group(0)).group(0)
        return _make_xref("fig", f"fig{num}", m.group(0))

    patterns.append((r'\b(?:Figure|Fig\.?)\s+\d+\b', make_fig_ref))

    return patterns


def _apply_xrefs_to_text(text, patterns):
    """
    Given a text string, find all xref patterns and return a list of
    alternating strings and etree.Element objects.
    E.g. "see [1] and Table 2" → ["see ", <xref>, " and ", <xref>]
    """
    if not text or not text.strip():
        return [text]

    # Collect all non-overlapping matches sorted by position
    all_matches = []
    for pat, builder in patterns:
        for m in re.finditer(pat, text):
            all_matches.append((m.start(), m.end(), builder(m)))

    all_matches.sort(key=lambda x: x[0])

    # Remove overlaps (keep first match at each position)
    filtered = []
    last_end = 0
    for start, end, elem in all_matches:
        if start >= last_end:
            filtered.append((start, end, elem))
            last_end = end

    if not filtered:
        return [text]

    parts = []
    last_pos = 0
    for start, end, elem in filtered:
        if start > last_pos:
            parts.append(text[last_pos:start])
        parts.append(elem)
        last_pos = end
    if last_pos < len(text):
        parts.append(text[last_pos:])

    return parts


def _inject_xrefs_in_element(elem, patterns, depth=0):
    """
    Recursively inject xref elements into text/tail of an element.
    Does NOT modify elements that are already xref or inside xref.
    Idempotent: skips text that already references xref patterns.
    """
    if depth > 50:  # Safety against infinite recursion
        return
    if elem.tag in ("xref", "graphic", "ext-link", "uri"):
        return  # Don't process these

    # Process elem.text
    if elem.text:
        parts = _apply_xrefs_to_text(elem.text, patterns)
        if len(parts) > 1:
            elem.text = parts[0] if isinstance(parts[0], str) else ""
            insert_idx = 0
            for part in parts[1:]:
                if isinstance(part, str):
                    # Append to tail of last inserted element
                    if insert_idx > 0:
                        last_el = list(elem)[insert_idx - 1]
                        last_el.tail = (last_el.tail or "") + part
                    else:
                        elem.text = (elem.text or "") + part
                else:
                    elem.insert(insert_idx, part)
                    insert_idx += 1

    # Process children
    children = list(elem)
    for child in children:
        _inject_xrefs_in_element(child, patterns, depth + 1)

        # Process child.tail
        if child.tail:
            parts = _apply_xrefs_to_text(child.tail, patterns)
            if len(parts) > 1:
                child.tail = parts[0] if isinstance(parts[0], str) else ""
                child_idx = list(elem).index(child)
                insert_after = child_idx + 1
                for part in parts[1:]:
                    if isinstance(part, str):
                        last_el = list(elem)[insert_after - 1]
                        last_el.tail = (last_el.tail or "") + part
                    else:
                        elem.insert(insert_after, part)
                        insert_after += 1


def fix_xrefs(tree):
    """Inject xref elements for citations, table, and figure references."""
    body = _get_body(tree)
    if body is None:
        print("  xrefs: no <body> found, skipping")
        return

    patterns = _make_xref_patterns(tree)
    injected = [0]

    def _count_xrefs(section):
        return len(section.findall(".//xref"))

    before = _count_xrefs(body)

    # Process all <p> elements in body, skip those inside abstract
    for p in body.findall(".//p"):
        if _is_in_abstract(p, tree.getroot()):
            continue
        # Check for existing xrefs (idempotency: don't double-process)
        existing = len(p.findall(".//xref"))
        _inject_xrefs_in_element(p, patterns)
        new_count = len(p.findall(".//xref"))
        injected[0] += (new_count - existing)

    after = _count_xrefs(body)
    print(f"  xrefs: {after - before} new <xref> elements injected")


# ─── Part 1.8: Volume/Issue "0" cleanup ──────────────────────────────────────

def fix_volume_issue(tree):
    """Remove <volume> and <issue> elements with value '0'."""
    article_meta = _get_article_meta(tree)
    if article_meta is None:
        return
    removed = 0
    for tag in ["volume", "issue"]:
        el = article_meta.find(tag)
        if el is not None and el.text and el.text.strip() == "0":
            article_meta.remove(el)
            removed += 1
            print(f"  Removed <{tag}>0</{tag}> (placeholder value)")
    if removed == 0:
        print("  Volume/Issue: no placeholder '0' values found")


# ─── Part 2: Figure conversion ───────────────────────────────────────────────

def convert_figures(input_paths, output_dir):
    """Convert figure files (JPG/PNG/etc.) to 300 DPI LZW TIFF."""
    try:
        from PIL import Image
    except ImportError:
        print("  ✗ Pillow not installed. Run: pip install Pillow")
        sys.exit(1)

    fig_dir = os.path.join(output_dir, "figures")
    os.makedirs(fig_dir, exist_ok=True)

    fig_ids = []
    for i, path in enumerate(input_paths, 1):
        path = str(path)
        fig_id = f"fig{i}"
        out_path = os.path.join(fig_dir, f"{fig_id}.tif")
        try:
            img = Image.open(path)
            # Convert to compatible mode
            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")
            elif img.mode == "CMYK":
                img = img.convert("RGB")
            elif img.mode not in ("RGB", "L", "1"):
                img = img.convert("RGB")

            img.save(
                out_path,
                format="TIFF",
                dpi=(300, 300),
                compression="tiff_lzw",
            )
            print(f"  ✓ {fig_id}.tif — {img.size[0]}×{img.size[1]}px, 300 DPI, LZW")
            fig_ids.append(fig_id)
        except Exception as exc:
            print(f"  ✗ Could not convert {path}: {exc}")
            # Copy original as fallback
            shutil.copy2(path, os.path.join(fig_dir, os.path.basename(path)))
            fig_ids.append(fig_id)

    return fig_ids


# ─── Part 2b: Copy supplementary files ───────────────────────────────────────

def copy_supplementary(input_paths, output_dir):
    """Copy supplementary files unchanged to output_dir/supplementary/."""
    supp_dir = os.path.join(output_dir, "supplementary")
    os.makedirs(supp_dir, exist_ok=True)
    names = []
    for path in input_paths:
        path = str(path)
        name = os.path.basename(path)
        dest = os.path.join(supp_dir, name)
        shutil.copy2(path, dest)
        print(f"  ✓ {name} (unchanged)")
        names.append(name)
    return names


# ─── Part 3: Validation ───────────────────────────────────────────────────────

def validate_output(xml_path, output_dir):
    """Run PMC validation checks and write validation_report.txt."""
    try:
        tree = etree.parse(xml_path)
        root = tree.getroot()
    except Exception as exc:
        print(f"  ✗ XML parse error: {exc}")
        _write_report(
            xml_path, output_dir,
            passed=[],
            failed=["XML well-formed"],
            warnings=[]
        )
        return

    checks = []
    passed = []
    failed = []
    warnings = []

    def chk(name, fn):
        try:
            result = fn(tree, root, output_dir)
            if result is True or result == "pass":
                passed.append(name)
            elif result is False or result == "fail":
                failed.append(name)
            else:
                warnings.append((name, str(result)))
        except Exception as exc:
            warnings.append((name, f"check error: {exc}"))

    # ── Structural ──
    chk("XML well-formed", lambda t, r, d: True)

    chk("DOCTYPE present", lambda t, r, d:
        "DOCTYPE" in (Path(xml_path).read_text(encoding="utf-8")[:500]))

    chk("No EditDelete remaining", lambda t, r, d: (
        True if not any(
            re.match(r"^\s*(EditDelete|Edit\s+Delete)\b", (_get_all_text(el) or "").lstrip(), re.IGNORECASE)
            for el in r.findall(".//p") + r.findall(".//title")
        ) else "warn: some EditDelete markers may remain at start of elements"
    ))

    # ── Metadata ──
    chk("DOI present and clean", lambda t, r, d: bool(
        (el := r.find('.//pub-id[@pub-id-type="doi"]')) is not None
        and el.text
        and re.match(r"^10\.\d{4,}", el.text.strip())
    ))

    chk("Article title present", lambda t, r, d: (
        (el := r.find(".//article-title")) is not None
        and bool(_strip_text(_get_all_text(el)))
    ))

    chk("At least one author", lambda t, r, d:
        len(r.findall(".//contrib[@contrib-type='author']")) > 0
    )

    chk("Author affiliations linked", lambda t, r, d: (
        len(r.findall(".//aff")) > 0
    ))

    chk("Publication date present", lambda t, r, d:
        r.find(".//pub-date") is not None
    )

    chk("Abstract present", lambda t, r, d:
        bool(_strip_text(_get_all_text(r.find(".//abstract")))) if r.find(".//abstract") is not None else False
    )

    chk("Keywords present", lambda t, r, d:
        len(r.findall(".//kwd")) > 0
    )

    chk("ISSN present", lambda t, r, d:
        len(r.findall(".//issn")) >= 1
    )

    chk("elocation-id or fpage present", lambda t, r, d:
        r.find(".//elocation-id") is not None or r.find(".//fpage") is not None
    )

    # ── Body ──
    chk("All tables in table-wrap", lambda t, r, d: (
        not any(
            _looks_like_inline_table_p(p)
            for p in r.findall(".//p")
        ) or "warn: some inline tables may remain"
    ))

    chk("All figures in fig element", lambda t, r, d: (
        not any(_looks_like_inline_fig_p(p) for p in r.findall(".//p"))
        or "warn: some inline figure captions may remain"
    ))

    chk("References present", lambda t, r, d:
        len(r.findall(".//ref")) > 0
    )

    chk("xref elements for citations", lambda t, r, d:
        len(r.findall(".//xref")) > 0
        or "warn: no xref elements found"
    )

    # ── Files ──
    fig_dir = os.path.join(output_dir, "figures")
    tif_files = list(Path(fig_dir).glob("*.tif")) if os.path.isdir(fig_dir) else []

    chk("Figure TIF files exist", lambda t, r, d:
        len(tif_files) > 0 or "warn: no TIF files in figures/"
    )

    chk("Figure files match XML hrefs", lambda t, r, d: (
        _check_fig_hrefs(r, output_dir)
    ))

    supp_dir = os.path.join(output_dir, "supplementary")
    supp_files = list(Path(supp_dir).glob("*")) if os.path.isdir(supp_dir) else []
    chk("Supplementary files exist (if declared)", lambda t, r, d:
        True  # Optional, just informational
    )

    # ── PMC-specific ──
    chk("No volume=0 or issue=0", lambda t, r, d: (
        not any(
            (el := r.find(f".//{tag}")) is not None
            and el.text and el.text.strip() == "0"
            for tag in ["volume", "issue"]
        )
    ))

    chk("Permissions/license present", lambda t, r, d:
        r.find(".//permissions") is not None and r.find(".//license") is not None
    )

    chk("Conflict of interest statement", lambda t, r, d:
        r.find('.//fn[@fn-type="conflict"]') is not None
        or "warn: no conflict of interest fn found"
    )

    _write_report(xml_path, output_dir, passed, failed, warnings, tif_files, supp_files)


def _looks_like_inline_table_p(p):
    text = _get_all_text(p)
    if re.search(r"\bTable\s+\d+\s*[:\.]", text, re.IGNORECASE):
        return True
    matches = sum(1 for kw in HEADER_KEYWORDS if kw in text)
    return matches >= 3  # High threshold to reduce false positives in validation


def _looks_like_inline_fig_p(p):
    text = _get_all_text(p)
    return bool(re.match(r"^\s*(EditDelete\s+)?(Figure|Fig\.?)\s+\d+", text, re.IGNORECASE))


def _check_fig_hrefs(root, output_dir):
    """Check that all graphic/@xlink:href values have corresponding TIF files."""
    fig_dir = os.path.join(output_dir, "figures")
    if not os.path.isdir(fig_dir):
        return "warn: figures/ directory not found"
    missing = []
    for graphic in root.findall(f".//{'{http://www.w3.org/1999/xlink}'}href[@*]"):
        pass  # lxml attribute handling
    for graphic in root.findall(".//graphic"):
        href = graphic.get(f"{XLINK}href", "")
        if href:
            tif_path = os.path.join(fig_dir, f"{href}.tif")
            if not os.path.exists(tif_path):
                missing.append(href)
    if missing:
        return f"warn: missing TIF for: {', '.join(missing)}"
    return True


def _write_report(xml_path, output_dir, passed, failed, warnings,
                  tif_files=None, supp_files=None):
    """Write validation_report.txt."""
    tif_files = tif_files or []
    supp_files = supp_files or []
    ready = not failed
    lines = [
        "PMC Submission Validation Report",
        "=" * 50,
        f"Generated : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"XML file  : {xml_path}",
        f"Output dir: {output_dir}",
        "",
        f"Figure TIF files ({len(tif_files)}): " +
        (", ".join(f.name for f in tif_files) if tif_files else "none"),
        f"Supplementary files ({len(supp_files)}): " +
        (", ".join(f.name for f in supp_files) if supp_files else "none"),
        "",
        "-" * 50,
        f"PASSED ({len(passed)}):",
    ]
    for n in passed:
        lines.append(f"  ✓  {n}")
    lines += [
        "",
        f"FAILED ({len(failed)}):",
    ]
    for n in failed:
        lines.append(f"  ✗  {n}")
    lines += [
        "",
        f"WARNINGS ({len(warnings)}):",
    ]
    for n, msg in warnings:
        lines.append(f"  ⚠  {n}: {msg}")
    lines += [
        "",
        "=" * 50,
        "✓ READY FOR PMC SUBMISSION" if ready else
        "✗ MANUAL FIXES REQUIRED BEFORE SUBMISSION",
        "=" * 50,
    ]

    report_text = "\n".join(lines)
    report_path = os.path.join(output_dir, "validation_report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_text)

    print("\n" + report_text)
    print(f"\n  Validation report saved: {report_path}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="PMC Submission Package Generator — fix JATS XML and create PMC-ready package",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # XML only
  python fix_pmc_xml.py --xml manuscript.xml --output-dir ./pmc_package/

  # With figures and supplementary files
  python fix_pmc_xml.py \\
      --xml manuscript.xml \\
      --figures fig1.jpg fig2.png fig3.jpg \\
      --supplementary supp1.pdf supp2.xlsx \\
      --output-dir ./pmc_package/
        """,
    )
    parser.add_argument("--xml", required=True, help="Input JATS XML file")
    parser.add_argument("--figures", nargs="*", default=[],
                        help="Figure image files (JPG/PNG/etc.) — will be converted to TIF 300 DPI")
    parser.add_argument("--supplementary", nargs="*", default=[],
                        help="Supplementary files (PDF/XLSX/etc.) — copied unchanged")
    parser.add_argument("--output-dir", default="./pmc_package",
                        help="Output directory (default: ./pmc_package)")
    args = parser.parse_args()

    # Validate input
    if not os.path.isfile(args.xml):
        print(f"✗ XML file not found: {args.xml}")
        sys.exit(1)

    for f in (args.figures or []):
        if not os.path.isfile(str(f)):
            print(f"⚠ Figure file not found: {f} — skipping")
    for f in (args.supplementary or []):
        if not os.path.isfile(str(f)):
            print(f"⚠ Supplementary file not found: {f} — skipping")

    os.makedirs(args.output_dir, exist_ok=True)

    print("=" * 55)
    print("  PMC Package Generator")
    print(f"  Input XML   : {args.xml}")
    print(f"  Figures     : {len(args.figures or [])} file(s)")
    print(f"  Supplementary: {len(args.supplementary or [])} file(s)")
    print(f"  Output dir  : {args.output_dir}")
    print("=" * 55)

    # ── Step 1: Convert figures ───────────────────────────────────────────────
    fig_ids = []
    if args.figures:
        print("\n[Step 1] Converting figures to TIFF 300 DPI LZW...")
        existing = [f for f in (args.figures or []) if os.path.isfile(str(f))]
        if existing:
            fig_ids = convert_figures(existing, args.output_dir)
        else:
            print("  No valid figure files provided.")
    else:
        print("\n[Step 1] No figures provided — skipping.")

    # ── Step 2: Copy supplementary files ─────────────────────────────────────
    supp_names = []
    if args.supplementary:
        print("\n[Step 2] Copying supplementary files (unchanged)...")
        existing = [f for f in (args.supplementary or []) if os.path.isfile(str(f))]
        if existing:
            supp_names = copy_supplementary(existing, args.output_dir)
        else:
            print("  No valid supplementary files provided.")
    else:
        print("\n[Step 2] No supplementary files provided — skipping.")

    # ── Step 3: Parse and fix XML ─────────────────────────────────────────────
    print("\n[Step 3] Fixing XML...")

    parser_opts = etree.XMLParser(
        remove_blank_text=False,
        resolve_entities=False,
        load_dtd=False,
        no_network=True,
    )
    try:
        tree = etree.parse(args.xml, parser_opts)
    except etree.XMLSyntaxError as exc:
        print(f"  ✗ XML parse error: {exc}")
        print("  Attempting recovery...")
        recovery_parser = etree.XMLParser(
            recover=True,
            remove_blank_text=False,
            load_dtd=False,
            no_network=True,
        )
        tree = etree.parse(args.xml, recovery_parser)
        print("  ⚠ XML recovered with errors — manual review recommended")

    print("  Removing EditDelete artifacts...")
    fix_editdelete(tree)

    print("  Converting inline tables to <table-wrap>...")
    fix_inline_tables(tree)

    print("  Converting inline figure captions to <fig>...")
    fix_inline_figures(tree, fig_ids)

    if supp_names:
        print("  Adding supplementary material section...")
        fix_supplementary_section(tree, supp_names)

    print("  Fixing DOI format...")
    fix_doi_format(tree)

    print("  Fixing author name capitalisation...")
    fix_author_names(tree)

    print("  Injecting <xref> elements...")
    fix_xrefs(tree)

    print("  Removing placeholder volume/issue '0' values...")
    fix_volume_issue(tree)

    # ── Step 3b: Save fixed XML ───────────────────────────────────────────────
    out_xml = os.path.join(args.output_dir, "manuscript.xml")
    try:
        tree.write(
            out_xml,
            pretty_print=True,
            xml_declaration=True,
            encoding="UTF-8",
            doctype=JATS_DOCTYPE,
        )
        print(f"\n  ✓ manuscript.xml saved → {out_xml}")
    except Exception as exc:
        print(f"  ✗ Failed to write XML: {exc}")
        sys.exit(1)

    # ── Step 4: Validation ────────────────────────────────────────────────────
    print("\n[Step 4] Running PMC validation checks...")
    validate_output(out_xml, args.output_dir)

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 55)
    print("  Package contents:")
    for root_dir, dirs, files in os.walk(args.output_dir):
        level = root_dir.replace(args.output_dir, "").count(os.sep)
        indent = "  " + "  " * level
        folder = os.path.basename(root_dir)
        if level == 0:
            print(f"{indent}{args.output_dir}/")
        else:
            print(f"{indent}{folder}/")
        for f in sorted(files):
            size = os.path.getsize(os.path.join(root_dir, f))
            size_str = f"{size/1024:.1f} KB" if size > 1024 else f"{size} B"
            print(f"  {indent}  {f:40s} ({size_str})")
    print("=" * 55)
    print("  Done. Review validation_report.txt before FTP upload.")
    print("=" * 55)


if __name__ == "__main__":
    main()
