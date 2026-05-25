"""
Video Call Router — handles call initiation, status management, and real-time WebRTC signaling via SSE.
"""

import asyncio
import json
from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import uuid4
from datetime import datetime, timezone

from database import get_db
from models.user import User
from models.patient import PatientProfile
from models.doctor import DoctorProfile
from models.guardian import GuardianProfile
from models.video_call import VideoCall
from models.consultation import Consultation
from schemas.video_call import CallInitiate, CallSignal, VideoCallResponse
from middleware.auth_middleware import get_current_user
from services.notification_service import create_notification

router = APIRouter(prefix="/api/calls", tags=["Video Calls"])

# In-memory registry of active signaling SSE streams.
# Key: call_id, Value: List of asyncio.Queue containing (sender_user_id, signal_data_dict)
active_streams: Dict[str, List[asyncio.Queue]] = {}


async def get_display_name(user_id: str, db: AsyncSession) -> str:
    """Helper to get a user's friendly display name based on their role profile."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        return "System User"

    if "patient" in user.role:
        res = await db.execute(select(PatientProfile.full_name).where(PatientProfile.user_id == user_id))
        return res.scalar_one_or_none() or user.username
    elif "doctor" in user.role:
        res = await db.execute(select(DoctorProfile.full_name).where(DoctorProfile.user_id == user_id))
        doc_name = res.scalar_one_or_none()
        return f"Dr. {doc_name}" if doc_name else f"Dr. {user.username}"
    elif "guardian" in user.role:
        res = await db.execute(select(GuardianProfile.full_name).where(GuardianProfile.user_id == user_id))
        return res.scalar_one_or_none() or user.username
    
    return user.username


@router.post("/initiate", response_model=VideoCallResponse)
async def initiate_call(
    req: CallInitiate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate a new video call (either scheduled or emergency).
    Registers the call session in the DB and notifies the callee.
    """
    caller_id = current_user["user_id"]

    # Verify callee exists
    callee_result = await db.execute(select(User).where(User.id == req.callee_id))
    callee = callee_result.scalar_one_or_none()
    if not callee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient user not found",
        )

    # Deactivate any previous hanging calls for this caller/callee pair
    existing = await db.execute(
        select(VideoCall).where(
            VideoCall.caller_id == caller_id,
            VideoCall.callee_id == req.callee_id,
            VideoCall.status.in_(["ringing", "in_progress"])
        )
    )
    for call in existing.scalars().all():
        call.status = "missed"
        call.ended_at = datetime.now(timezone.utc)

    # Create new call record
    call = VideoCall(
        id=str(uuid4()),
        caller_id=caller_id,
        callee_id=req.callee_id,
        session_id=req.session_id,
        call_type=req.call_type,
        status="ringing",
    )
    db.add(call)

    # Send a notification to the callee
    caller_name = await get_display_name(caller_id, db)
    try:
        await create_notification(
            user_id=req.callee_id,
            title="Incoming Emergency Call" if req.call_type == "emergency" else "Incoming Video Call",
            content=f"{caller_name} is calling you via video. Click to join.",
            notification_type="video_call_ringing",
            db=db,
        )
    except Exception as e:
        print(f"Failed to create call notification: {str(e)}")

    await db.commit()
    await db.refresh(call)

    resp = VideoCallResponse.model_validate(call)
    resp.caller_name = caller_name
    resp.callee_name = await get_display_name(req.callee_id, db)
    return resp


@router.get("/incoming", response_model=list[VideoCallResponse])
async def get_incoming_calls(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check for active ringing incoming calls for the current user.
    """
    result = await db.execute(
        select(VideoCall)
        .where(VideoCall.callee_id == current_user["user_id"], VideoCall.status == "ringing")
        .order_by(VideoCall.created_at.desc())
    )
    calls = result.scalars().all()

    response_list = []
    for call in calls:
        resp = VideoCallResponse.model_validate(call)
        resp.caller_name = await get_display_name(call.caller_id, db)
        resp.callee_name = await get_display_name(call.callee_id, db)
        response_list.append(resp)

    return response_list


@router.get("/status/{call_id}", response_model=VideoCallResponse)
async def get_call_status(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the current status of a specific call.
    """
    result = await db.execute(select(VideoCall).where(VideoCall.id == call_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found",
        )

    resp = VideoCallResponse.model_validate(call)
    resp.caller_name = await get_display_name(call.caller_id, db)
    resp.callee_name = await get_display_name(call.callee_id, db)
    return resp


@router.put("/{call_id}/accept", response_model=VideoCallResponse)
async def accept_call(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Accept an incoming call. Status changes to in_progress.
    """
    result = await db.execute(
        select(VideoCall).where(
            VideoCall.id == call_id,
            VideoCall.callee_id == current_user["user_id"]
        )
    )
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found or not callee",
        )

    call.status = "in_progress"
    call.started_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(call)

    # Distribute acceptance signal through SSE registry
    if call_id in active_streams:
        for q in active_streams[call_id]:
            await q.put((current_user["user_id"], {"type": "accept", "payload": {}}))

    resp = VideoCallResponse.model_validate(call)
    resp.caller_name = await get_display_name(call.caller_id, db)
    resp.callee_name = await get_display_name(call.callee_id, db)
    return resp


@router.put("/{call_id}/reject", response_model=VideoCallResponse)
async def reject_call(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reject an incoming call. Status changes to rejected.
    """
    result = await db.execute(
        select(VideoCall).where(
            VideoCall.id == call_id,
            VideoCall.callee_id == current_user["user_id"]
        )
    )
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found or not callee",
        )

    call.status = "rejected"
    call.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(call)

    # Distribute rejection signal
    if call_id in active_streams:
        for q in active_streams[call_id]:
            await q.put((current_user["user_id"], {"type": "reject", "payload": {}}))

    resp = VideoCallResponse.model_validate(call)
    resp.caller_name = await get_display_name(call.caller_id, db)
    resp.callee_name = await get_display_name(call.callee_id, db)
    return resp


@router.put("/{call_id}/end", response_model=VideoCallResponse)
async def end_call(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    End an active call session. Status changes to ended.
    """
    result = await db.execute(
        select(VideoCall).where(
            VideoCall.id == call_id,
            (VideoCall.caller_id == current_user["user_id"]) | (VideoCall.callee_id == current_user["user_id"])
        )
    )
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found or you are not a party",
        )

    call.status = "ended"
    call.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(call)

    # Distribute hangup signal
    if call_id in active_streams:
        for q in active_streams[call_id]:
            await q.put((current_user["user_id"], {"type": "hangup", "payload": {}}))

    resp = VideoCallResponse.model_validate(call)
    resp.caller_name = await get_display_name(call.caller_id, db)
    resp.callee_name = await get_display_name(call.callee_id, db)
    return resp


@router.post("/{call_id}/signal")
async def send_signal(
    call_id: str,
    signal: CallSignal,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send WebRTC SDP/ICE signaling data.
    Propagates the signal in real-time to the other peer via active SSE queue.
    """
    # Verify user is part of the call
    result = await db.execute(
        select(VideoCall).where(
            VideoCall.id == call_id,
            (VideoCall.caller_id == current_user["user_id"]) | (VideoCall.callee_id == current_user["user_id"])
        )
    )
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this call session",
        )

    # Save signals to DB list for fallback/audit
    sig_payload = {"type": signal.type, "payload": signal.payload, "timestamp": datetime.now(timezone.utc).isoformat()}
    signals_list = list(call.signals or [])
    signals_list.append(sig_payload)
    call.signals = signals_list
    await db.commit()

    # Route signal dynamically through pub-sub queues
    if call_id in active_streams:
        for q in active_streams[call_id]:
            await q.put((current_user["user_id"], sig_payload))

    return {"status": "success", "message": "Signal sent"}


@router.get("/{call_id}/signal/stream")
async def signal_stream(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Server-Sent Events (SSE) stream endpoint.
    Subscribes the peer to receive WebRTC signals in real-time.
    """
    # Verify user is authorized
    result = await db.execute(
        select(VideoCall).where(
            VideoCall.id == call_id,
            (VideoCall.caller_id == current_user["user_id"]) | (VideoCall.callee_id == current_user["user_id"])
        )
    )
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this call session",
        )

    # Create client queue for real-time signaling
    client_queue = asyncio.Queue()

    if call_id not in active_streams:
        active_streams[call_id] = []
    active_streams[call_id].append(client_queue)

    async def event_generator():
        try:
            # Yield initial connect event
            yield f"event: connect\ndata: {json.dumps({'message': 'Connected to signaling stream'})}\n\n"
            
            while True:
                # Retrieve signal from client queue
                sender_id, signal_data = await client_queue.get()
                
                # Filter out our own signals
                if sender_id != current_user["user_id"]:
                    yield f"event: signal\ndata: {json.dumps(signal_data)}\n\n"
                    
        except asyncio.CancelledError:
            pass
        finally:
            # Clean up client queue on disconnect
            if call_id in active_streams:
                if client_queue in active_streams[call_id]:
                    active_streams[call_id].remove(client_queue)
                if not active_streams[call_id]:
                    del active_streams[call_id]

    return StreamingResponse(event_generator(), media_type="text/event-stream")
