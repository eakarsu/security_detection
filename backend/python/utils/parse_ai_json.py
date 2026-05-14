"""
parse_ai_json — 3-strategy resilient JSON parser for LLM outputs.

Strategy 1: Direct json.loads on the raw response.
Strategy 2: Extract JSON from a fenced code block (```json ... ``` or ``` ... ```).
Strategy 3: Locate the first balanced { ... } or [ ... ] block in the text and parse.

Returns the parsed object, or `fallback` (default None) if all strategies fail.
"""

from __future__ import annotations

import json
import re
from typing import Any, Optional

_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)


def _try_parse(text: str) -> Optional[Any]:
    try:
        return json.loads(text)
    except (ValueError, TypeError):
        return None


def _extract_from_code_fence(text: str) -> Optional[Any]:
    m = _FENCE_RE.search(text)
    if not m:
        return None
    return _try_parse(m.group(1))


def _extract_balanced_block(text: str) -> Optional[Any]:
    for opener, closer in (("{", "}"), ("[", "]")):
        start = text.find(opener)
        if start == -1:
            continue
        depth = 0
        in_string = False
        escape = False
        for i in range(start, len(text)):
            ch = text[i]
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == opener:
                depth += 1
            elif ch == closer:
                depth -= 1
                if depth == 0:
                    parsed = _try_parse(text[start : i + 1])
                    if parsed is not None:
                        return parsed
                    break
    return None


def parse_ai_json(raw_text: Optional[str], fallback: Any = None) -> Any:
    """Parse JSON from an LLM response using 3 fallback strategies."""
    if raw_text is None:
        return fallback
    text = raw_text if isinstance(raw_text, str) else str(raw_text)

    # Strategy 1
    direct = _try_parse(text)
    if direct is not None:
        return direct

    # Strategy 2
    fenced = _extract_from_code_fence(text)
    if fenced is not None:
        return fenced

    # Strategy 3
    block = _extract_balanced_block(text)
    if block is not None:
        return block

    return fallback
