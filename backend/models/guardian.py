"""
GuardianProfile model — extended profile for guardians (family, ASHA, NGO, Anganwadi).
association_id is the unique identifier (ASHA worker ID, NGO volunteer ID, etc.).
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from database import Base


class GuardianProfile(Base):
    """
    Guardian profile for family members, ASHA workers, NGO volunteers, Anganwadi workers.
    The association_id is their organizational/system identifier.
    """
    __tablename__ = "guardian_profiles"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    guardian_type = Column(String(20), nullable=False)  # family/asha/ngo/anganwadi
    # Unique identifier: ASHA worker ID, NGO volunteer ID, family relation link
    association_id = Column(String(100), unique=True, nullable=True, index=True)
    # Region
    region_village = Column(String(100), nullable=True)
    region_block = Column(String(100), nullable=True)
    region_district = Column(String(100), nullable=True)
    region_state = Column(String(100), nullable=True)
    organization = Column(String(255), nullable=True)
    contact_number = Column(String(15), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

