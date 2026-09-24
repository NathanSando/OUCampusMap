"""Request/response models. Field names match packages/shared-types/src/api.ts."""

from typing import Literal

from pydantic import BaseModel, Field

ReportCategory = Literal["elevator_outage", "construction", "event", "hazard", "closure", "other"]
PlaceType = Literal["building", "dining", "printer", "accessibility", "report"]


class LatLng(BaseModel):
    lat: float
    lng: float


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatMessage] = Field(default_factory=list)
    userLocation: LatLng | None = None


class ReferencedPlace(BaseModel):
    type: PlaceType
    id: str
    name: str
    lat: float
    lng: float


class ChatResponse(BaseModel):
    reply: str
    referencedPlaces: list[ReferencedPlace]


class ClassifyRequest(BaseModel):
    title: str
    description: str | None = None
    userCategory: ReportCategory


class ClassifyResponse(BaseModel):
    suggestedCategory: ReportCategory
    isSpam: bool
    confidence: float = Field(ge=0, le=1)
    reason: str


class Record(BaseModel):
    """One retrieved row, normalised across tables for prompt assembly and place matching."""

    type: PlaceType
    id: str
    name: str
    lat: float | None = None
    lng: float | None = None
    details: dict = Field(default_factory=dict)
