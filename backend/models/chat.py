"""
ChatMessage model — stores chatbot conversation history.
"""

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class ChatMessage(Base):
    """
    Model representing a single chatbot message between a patient and Saathi.
    """
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(String(5000), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
