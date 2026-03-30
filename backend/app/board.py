from __future__ import annotations

from typing import Any

from app.models import BoardValidationError

DEFAULT_BOARD: dict[str, Any] = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
        {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
        {"id": "col-progress", "title": "In Progress", "cardIds": ["card-4", "card-5"]},
        {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
        {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
    ],
    "cards": {
        "card-1": {
            "id": "card-1",
            "title": "Align roadmap themes",
            "details": "Draft quarterly themes with impact statements and metrics.",
        },
        "card-2": {
            "id": "card-2",
            "title": "Gather customer signals",
            "details": "Review support tags, sales notes, and churn feedback.",
        },
        "card-3": {
            "id": "card-3",
            "title": "Prototype analytics view",
            "details": "Sketch initial dashboard layout and key drill-downs.",
        },
        "card-4": {
            "id": "card-4",
            "title": "Refine status language",
            "details": "Standardize column labels and tone across the board.",
        },
        "card-5": {
            "id": "card-5",
            "title": "Design card layout",
            "details": "Add hierarchy and spacing for scanning dense lists.",
        },
        "card-6": {
            "id": "card-6",
            "title": "QA micro-interactions",
            "details": "Verify hover, focus, and loading states.",
        },
        "card-7": {
            "id": "card-7",
            "title": "Ship marketing page",
            "details": "Final copy approved and asset pack delivered.",
        },
        "card-8": {
            "id": "card-8",
            "title": "Close onboarding sprint",
            "details": "Document release notes and share internally.",
        },
    },
}


def validate_board_integrity(board: dict[str, Any]) -> None:
    cards = board.get("cards", {})
    columns = board.get("columns", [])

    mismatched_ids = [
        card_key for card_key, card_payload in cards.items() if card_payload.get("id") != card_key
    ]
    if mismatched_ids:
        raise BoardValidationError(
            f"Card key/id mismatch for: {', '.join(sorted(mismatched_ids))}."
        )

    seen_card_ids: set[str] = set()
    duplicate_card_ids: set[str] = set()

    for column in columns:
        column_id = column.get("id", "unknown")
        for card_id in column.get("cardIds", []):
            if card_id not in cards:
                raise BoardValidationError(
                    f"Column '{column_id}' references missing card '{card_id}'."
                )
            if card_id in seen_card_ids:
                duplicate_card_ids.add(card_id)
            seen_card_ids.add(card_id)

    if duplicate_card_ids:
        raise BoardValidationError(
            "Cards may appear in only one column. Duplicates: "
            + ", ".join(sorted(duplicate_card_ids))
            + "."
        )

    unassigned_cards = sorted(card_id for card_id in cards if card_id not in seen_card_ids)
    if unassigned_cards:
        raise BoardValidationError(
            "Cards must appear in a column. Unassigned: " + ", ".join(unassigned_cards) + "."
        )
