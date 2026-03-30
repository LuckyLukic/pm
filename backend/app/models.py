from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CardPayload(BaseModel):
    id: str
    title: str
    details: str
    tagIds: list[int] = Field(default_factory=list)


class ColumnPayload(BaseModel):
    id: str
    title: str
    cardIds: list[str]


class BoardPayload(BaseModel):
    columns: list[ColumnPayload]
    cards: dict[str, CardPayload]


class BoardEnvelope(BaseModel):
    board: BoardPayload


class AIHealthRequest(BaseModel):
    prompt: str = "2+2"


class AIHealthResponse(BaseModel):
    status: str
    model: str
    prompt: str
    response: str


class ChatMessagePayload(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AIChatRequest(BaseModel):
    prompt: str = Field(max_length=5000)
    chat_history: list[ChatMessagePayload] = Field(default_factory=list, max_length=50)


class AIStructuredBoardOutput(BaseModel):
    assistant_response: str
    board: BoardPayload | None = None


class AIChatResponse(BaseModel):
    assistant_response: str
    board: BoardPayload
    board_updated: bool
    used_fallback: bool
    model: str


class AIConnectivityError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AIResponseValidationError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class BoardValidationError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class AuthRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100, pattern=r'^[a-zA-Z0-9_-]+$')
    password: str = Field(min_length=6, max_length=200)


class AuthResponse(BaseModel):
    username: str
    message: str


class ProjectPayload(BaseModel):
    id: int
    name: str


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class ProjectRenameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class TagPayload(BaseModel):
    id: int
    name: str
    color: str


class TagCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(min_length=4, max_length=7, pattern=r'^#[0-9a-fA-F]{3,6}$')


class TagUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, min_length=4, max_length=7, pattern=r'^#[0-9a-fA-F]{3,6}$')


class AIPlanRequest(BaseModel):
    description: str = Field(min_length=1, max_length=10000)
    chat_history: list[ChatMessagePayload] = Field(default_factory=list, max_length=50)
