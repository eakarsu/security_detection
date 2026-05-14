"""Tests for the 3-strategy LLM JSON parser."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.parse_ai_json import parse_ai_json  # noqa: E402


def test_strategy_1_direct_parse():
    assert parse_ai_json('{"a": 1, "b": [2, 3]}') == {"a": 1, "b": [2, 3]}


def test_strategy_2_json_fence():
    text = "Here you go:\n```json\n{\"x\": 1}\n```\nDone."
    assert parse_ai_json(text) == {"x": 1}


def test_strategy_2_generic_fence():
    text = "Reply:\n```\n[1, 2, 3]\n```"
    assert parse_ai_json(text) == [1, 2, 3]


def test_strategy_3_balanced_block():
    text = 'Some prose then { "ok": true, "tags": ["a", "b"] } more text.'
    assert parse_ai_json(text) == {"ok": True, "tags": ["a", "b"]}


def test_fallback_when_no_json():
    assert parse_ai_json("nothing here", fallback={"f": True}) == {"f": True}


def test_handles_none():
    assert parse_ai_json(None) is None
    assert parse_ai_json(None, fallback="x") == "x"


def test_handles_escaped_quotes():
    text = '```json\n{"msg": "He said \\"hi\\""}\n```'
    assert parse_ai_json(text) == {"msg": 'He said "hi"'}
