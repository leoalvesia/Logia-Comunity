from fastapi import Depends, HTTPException, status
from .auth import get_current_active_user


async def require_paid(current_user=Depends(get_current_active_user)):
    """FastAPI dependency that enforces active subscription."""
    if not current_user.is_paid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta área requer uma assinatura ativa. Faça o upgrade para continuar.",
        )
    return current_user
