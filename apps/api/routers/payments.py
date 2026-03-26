import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.auth import get_current_active_user
from ..core.config import settings
from ..models.profile import Profile

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


def _get_stripe():
    """Return stripe module configured with secret key."""
    import stripe as stripe_lib
    stripe_lib.api_key = settings.stripe_secret_key
    return stripe_lib


@router.post("/checkout")
async def create_checkout_session(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    """
    Create a Stripe Checkout session for the subscription.
    Returns the checkout URL to redirect the user to Stripe.
    Reuses existing stripe_customer_id to avoid duplicate customers.
    """
    if current_user.is_paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already subscribed",
        )

    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe not configured",
        )

    if not settings.stripe_price_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe price not configured",
        )

    stripe = _get_stripe()

    # Reuse existing customer or create new one
    customer_id = current_user.stripe_customer_id
    if not customer_id:
        customer = await asyncio.to_thread(
            stripe.Customer.create,
            email=current_user.email,
            metadata={
                "user_id": str(current_user.id),
                "platform": "logia-business",
            },
        )
        customer_id = customer["id"]
        current_user.stripe_customer_id = customer_id
        await db.commit()

    session = await asyncio.to_thread(
        stripe.checkout.Session.create,
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": settings.stripe_price_id, "quantity": 1}],
        client_reference_id=str(current_user.id),
        metadata={
            "user_id": str(current_user.id),
            "platform": "logia-business",
        },
        success_url=f"{settings.frontend_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.frontend_url}/checkout/cancel",
    )

    return {"checkout_url": session["url"]}


@router.post("/portal")
async def create_billing_portal_session(
    current_user: Profile = Depends(get_current_active_user),
):
    """
    Create a Stripe Billing Portal session for managing the subscription.
    Returns the portal URL to redirect the user to the Stripe portal.
    """
    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe customer found for this account",
        )

    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe not configured",
        )

    stripe = _get_stripe()

    portal_session = await asyncio.to_thread(
        stripe.billing_portal.Session.create,
        customer=current_user.stripe_customer_id,
        return_url=f"{settings.frontend_url}/settings",
    )

    return {"portal_url": portal_session["url"]}


@router.get("/subscription/status")
async def get_subscription_status(
    current_user: Profile = Depends(get_current_active_user),
):
    """
    Return the current user's subscription status normalized for the frontend.
    """
    period_end_iso = None
    if current_user.current_period_end is not None:
        period_end_iso = current_user.current_period_end.isoformat()

    return {
        "is_paid": current_user.is_paid,
        "subscription_status": current_user.subscription_status,
        "current_period_end": period_end_iso,
        "cancel_at_period_end": current_user.cancel_at_period_end,
    }
