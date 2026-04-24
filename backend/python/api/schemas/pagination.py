from pydantic import BaseModel
from typing import List, Any, Optional, Generic, TypeVar
from math import ceil

T = TypeVar('T')

class PaginatedResponse(BaseModel):
    data: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool

def paginate(items: List[Any], total: int, page: int, page_size: int) -> dict:
    total_pages = ceil(total / page_size) if page_size > 0 else 0
    return {
        "data": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1
    }
