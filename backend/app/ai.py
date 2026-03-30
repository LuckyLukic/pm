from __future__ import annotations

import json
import logging
import os
from typing import Any

from openai import AuthenticationError, OpenAI
from pydantic import ValidationError

from app.models import (
    AIConnectivityError,
    AIResponseValidationError,
    AIStructuredBoardOutput,
    ChatMessagePayload,
)

logger = logging.getLogger(__name__)

DEFAULT_OPENAI_MODEL = "gpt-5.4-mini"

AI_OUTPUT_FALLBACK_MESSAGE = (
    "I could not apply this AI update safely, so the board was left unchanged."
)


def get_openai_model() -> str:
    return os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL)


def run_openai_connectivity_check(api_key: str, model: str, prompt: str) -> str:
    try:
        client = OpenAI(api_key=api_key)
        response = client.responses.create(model=model, input=prompt)
    except AuthenticationError as error:
        logger.error("OpenAI authentication failed during connectivity check")
        raise AIConnectivityError(
            "OpenAI authentication failed. Check OPENAI_API_KEY.",
            status_code=502,
        ) from error
    except Exception as error:
        logger.error("OpenAI connectivity check failed: %s", error)
        raise AIConnectivityError(f"OpenAI request failed: {error}") from error

    response_text = (response.output_text or "").strip()
    if not response_text:
        raise AIConnectivityError("OpenAI returned an empty response.")
    return response_text


def build_ai_board_operation_input(
    prompt: str,
    chat_history: list[ChatMessagePayload],
    board: dict[str, Any],
) -> str:
    if chat_history:
        history_text = "\n".join(
            f"{item.role}: {item.content.strip()}" for item in chat_history if item.content.strip()
        )
    else:
        history_text = "(none)"

    return (
        "You are an assistant for a project management board.\n"
        "Return only valid JSON with this shape:\n"
        '{"assistant_response":"string","board":{...optional board payload...}}\n'
        "Use the board field only if updates are needed. If no updates are needed, omit board.\n"
        f"Current board JSON:\n{json.dumps(board)}\n"
        f"Conversation history:\n{history_text}\n"
        f"Latest user prompt:\n{prompt.strip()}"
    )


def run_openai_board_operation(
    api_key: str,
    model: str,
    prompt: str,
    chat_history: list[ChatMessagePayload],
    board: dict[str, Any],
) -> str:
    user_input = build_ai_board_operation_input(
        prompt=prompt,
        chat_history=chat_history,
        board=board,
    )
    try:
        client = OpenAI(api_key=api_key)
        response = client.responses.create(model=model, input=user_input)
    except AuthenticationError as error:
        logger.error("OpenAI authentication failed during board operation")
        raise AIConnectivityError(
            "OpenAI authentication failed. Check OPENAI_API_KEY.",
            status_code=502,
        ) from error
    except Exception as error:
        logger.error("OpenAI board operation failed: %s", error)
        raise AIConnectivityError(f"OpenAI request failed: {error}") from error

    response_text = (response.output_text or "").strip()
    if not response_text:
        raise AIConnectivityError("OpenAI returned an empty response.")
    return response_text


def build_ai_plan_input(
    description: str,
    chat_history: list[ChatMessagePayload],
    board: dict[str, Any],
    existing_tags: list[dict[str, Any]],
) -> str:
    if chat_history:
        history_text = "\n".join(
            f"{item.role}: {item.content.strip()}" for item in chat_history if item.content.strip()
        )
    else:
        history_text = "(none)"

    existing_tag_text = json.dumps(existing_tags) if existing_tags else "[]"

    return (
        "You are a project planning assistant for a Kanban board.\n"
        "The user will describe a project. You must:\n"
        "1. Summarize the project\n"
        "2. Create an action plan with numbered macro-points (phases/areas)\n"
        "3. For each macro-point, create specific tasks as cards\n"
        "4. Each task card must have: a clear title, details describing what is needed to fulfill the task "
        "(resources, goals, acceptance criteria), and a tag matching its macro-point name\n"
        "5. All task cards go into the first column (Backlog) in order\n"
        "6. Create a tag for each macro-point with a distinct color from this palette: "
        "#753991, #209dd7, #ecad0a, #e85d3a, #2ecc71, #e74c3c, #3498db, #9b59b6, #1abc9c, #f39c12\n\n"
        "Return only valid JSON with this shape:\n"
        "{\n"
        '  "assistant_response": "string with project summary and plan description",\n'
        '  "tags": [{"name": "string", "color": "#hex"}],\n'
        '  "board": {\n'
        '    "columns": [{"id": "string", "title": "string", "cardIds": ["string"]}],\n'
        '    "cards": {"card-id": {"id": "card-id", "title": "string", "details": "string", "tagIds": [], "tagNames": ["macro-point name"]}}\n'
        "  }\n"
        "}\n\n"
        "IMPORTANT:\n"
        "- Use tagNames (not tagIds) in cards to reference macro-point tags by name. The system will resolve them to IDs.\n"
        "- Keep existing columns: Backlog, In Progress, Review, Done (use IDs col-backlog, col-progress, col-review, col-done)\n"
        "- Generate unique card IDs with prefix 'card-' followed by a short random string\n"
        "- Place ALL new cards in the first column (col-backlog)\n"
        "- Keep any existing cards that are already on the board\n"
        f"\nExisting tags: {existing_tag_text}\n"
        f"Current board JSON:\n{json.dumps(board)}\n"
        f"Conversation history:\n{history_text}\n"
        f"Project description:\n{description.strip()}"
    )


def run_openai_plan_operation(
    api_key: str,
    model: str,
    description: str,
    chat_history: list[ChatMessagePayload],
    board: dict[str, Any],
    existing_tags: list[dict[str, Any]],
) -> str:
    user_input = build_ai_plan_input(
        description=description,
        chat_history=chat_history,
        board=board,
        existing_tags=existing_tags,
    )
    try:
        client = OpenAI(api_key=api_key)
        response = client.responses.create(model=model, input=user_input)
    except AuthenticationError as error:
        logger.error("OpenAI authentication failed during plan operation")
        raise AIConnectivityError(
            "OpenAI authentication failed. Check OPENAI_API_KEY.",
            status_code=502,
        ) from error
    except Exception as error:
        logger.error("OpenAI plan operation failed: %s", error)
        raise AIConnectivityError(f"OpenAI request failed: {error}") from error

    response_text = (response.output_text or "").strip()
    if not response_text:
        raise AIConnectivityError("OpenAI returned an empty response.")
    return response_text


def _extract_json(raw: str) -> Any:
    """Extract JSON from raw AI output, stripping markdown fences and surrounding text."""
    text = raw.strip()
    # Strip markdown code fences
    if "```" in text:
        import re
        match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
        if match:
            text = match.group(1).strip()
    # Try parsing directly
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try to find a JSON object in the text
    start = text.find("{")
    if start != -1:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start : i + 1])
                    except json.JSONDecodeError:
                        break
    raise AIResponseValidationError("AI response does not contain valid JSON.")


def parse_structured_plan_output(raw_output: str) -> dict[str, Any]:
    payload = _extract_json(raw_output)

    if not isinstance(payload, dict):
        raise AIResponseValidationError("AI plan response is not a JSON object.")

    if "assistant_response" not in payload or not payload["assistant_response"].strip():
        raise AIResponseValidationError("assistant_response is missing or empty.")

    return payload


def parse_structured_board_output(raw_output: str) -> AIStructuredBoardOutput:
    payload = _extract_json(raw_output)

    try:
        structured = AIStructuredBoardOutput.model_validate(payload)
    except ValidationError as error:
        raise AIResponseValidationError("AI response does not match required schema.") from error

    if not structured.assistant_response.strip():
        raise AIResponseValidationError("assistant_response cannot be empty.")

    return structured
