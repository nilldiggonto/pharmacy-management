from datetime import UTC, datetime

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import get_current_token_payload, get_current_user
from app.core.redis import is_token_revoked, revoke_token
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, LogoutRequest, RefreshRequest, TokenResponse
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    access_token, _, expires_in = create_access_token(str(user.id), user.role.value)
    refresh_token, _, _ = create_refresh_token(str(user.id), user.role.value)

    await record_audit(
        db,
        action="auth.login",
        entity_type="user",
        entity_id=user.id,
        user_id=user.id,
    )
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    payload: RefreshRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    try:
        token_data = decode_token(payload.refresh_token)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from exc

    if token_data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    jti = token_data.get("jti")
    if jti and await is_token_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    user_id = int(token_data["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not active")

    if jti:
        exp = int(token_data.get("exp", 0))
        ttl = max(0, exp - int(datetime.now(UTC).timestamp()))
        await revoke_token(jti, ttl)

    access_token, _, expires_in = create_access_token(str(user.id), user.role.value)
    new_refresh_token, _, _ = create_refresh_token(str(user.id), user.role.value)
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
async def logout(
    payload: LogoutRequest | None = None,
    token_data: dict = Depends(get_current_token_payload),
) -> dict[str, str]:
    now_ts = int(datetime.now(UTC).timestamp())
    jti = token_data.get("jti")
    if jti:
        ttl = max(0, int(token_data.get("exp", 0)) - now_ts)
        await revoke_token(jti, ttl)

    if payload and payload.refresh_token:
        try:
            refresh_data = decode_token(payload.refresh_token)
            r_jti = refresh_data.get("jti")
            if r_jti:
                r_ttl = max(0, int(refresh_data.get("exp", 0)) - now_ts)
                await revoke_token(r_jti, r_ttl)
        except jwt.PyJWTError:
            pass

    return {"status": "logged_out"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user

