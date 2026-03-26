import asyncio
import uuid as _uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..core.config import settings
from ..models.profile import Profile

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


# ── Stripe helpers ────────────────────────────────────────────────────────────

async def _resolve_profile(obj: dict, db: AsyncSession) -> Profile | None:
    """
    Resolve a Profile from a Stripe event object.
    Primary: metadata.user_id
    Fallback: stripe_customer_id match
    """
    metadata = obj.get("metadata") or {}
    user_id_str = metadata.get("user_id")

    if user_id_str:
        try:
            uid = _uuid.UUID(user_id_str)
        except (ValueError, AttributeError):
            uid = None
        if uid:
            result = await db.execute(select(Profile).where(Profile.id == uid))
            profile = result.scalar_one_or_none()
            if profile:
                return profile

    # Fallback: match by stripe_customer_id
    customer_id = obj.get("customer")
    if customer_id:
        result = await db.execute(
            select(Profile).where(Profile.stripe_customer_id == customer_id)
        )
        return result.scalar_one_or_none()

    return None


def _period_end_from_ts(ts: int | None) -> datetime | None:
    """Convert a Unix timestamp to a timezone-aware datetime."""
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc)


# ── Stripe webhook ────────────────────────────────────────────────────────────

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle all Stripe payment events.

    Idempotency: each handler checks stripe_event_id_last == event["id"] before
    making any mutations — duplicate deliveries are safely ignored.

    Fulfillment is ONLY done here, never in the success redirect.
    """
    import stripe as stripe_lib

    body = await request.body()

    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=500, detail="Stripe webhook secret not configured")

    try:
        event = await asyncio.to_thread(
            stripe_lib.Webhook.construct_event,
            body,
            stripe_signature,
            settings.stripe_webhook_secret,
        )
    except stripe_lib.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    event_type: str = event["type"]
    event_id: str = event["id"]
    obj = event["data"]["object"]

    # ── checkout.session.completed ────────────────────────────────────────────
    if event_type == "checkout.session.completed":
        profile = await _resolve_profile(obj, db)
        if profile:
            if profile.stripe_event_id_last == event_id:
                return {"received": True}
            profile.is_paid = True
            profile.subscription_status = "active"
            profile.stripe_customer_id = obj.get("customer") or profile.stripe_customer_id
            sub_id = obj.get("subscription")
            if sub_id:
                profile.stripe_subscription_id = sub_id
            profile.stripe_event_id_last = event_id
            await db.commit()

    # ── customer.subscription.created ─────────────────────────────────────────
    elif event_type == "customer.subscription.created":
        profile = await _resolve_profile(obj, db)
        if profile:
            if profile.stripe_event_id_last == event_id:
                return {"received": True}
            profile.stripe_subscription_id = obj.get("id")
            raw_status = obj.get("status", "active")
            profile.subscription_status = raw_status
            profile.current_period_end = _period_end_from_ts(
                obj.get("current_period_end")
            )
            profile.cancel_at_period_end = bool(obj.get("cancel_at_period_end", False))
            profile.is_paid = raw_status in ("active", "trialing", "past_due")
            profile.stripe_event_id_last = event_id
            await db.commit()

    # ── customer.subscription.updated ─────────────────────────────────────────
    elif event_type == "customer.subscription.updated":
        profile = await _resolve_profile(obj, db)
        if profile:
            if profile.stripe_event_id_last == event_id:
                return {"received": True}
            raw_status = obj.get("status", "active")
            profile.subscription_status = raw_status
            profile.current_period_end = _period_end_from_ts(
                obj.get("current_period_end")
            )
            profile.cancel_at_period_end = bool(obj.get("cancel_at_period_end", False))
            # Grace period: keep is_paid=True for past_due
            profile.is_paid = raw_status in ("active", "trialing", "past_due")
            if obj.get("id"):
                profile.stripe_subscription_id = obj["id"]
            profile.stripe_event_id_last = event_id
            await db.commit()

    # ── customer.subscription.deleted ─────────────────────────────────────────
    elif event_type == "customer.subscription.deleted":
        profile = await _resolve_profile(obj, db)
        if profile:
            if profile.stripe_event_id_last == event_id:
                return {"received": True}
            profile.is_paid = False
            profile.subscription_status = "canceled"
            profile.cancel_at_period_end = False
            profile.stripe_event_id_last = event_id
            await db.commit()

    # ── invoice.payment_succeeded ─────────────────────────────────────────────
    elif event_type == "invoice.payment_succeeded":
        profile = await _resolve_profile(obj, db)
        if profile:
            if profile.stripe_event_id_last == event_id:
                return {"received": True}
            # Update period end from invoice lines if available
            lines = obj.get("lines", {}).get("data", [])
            period_end_ts = None
            if lines:
                period_end_ts = lines[0].get("period", {}).get("end")
            if period_end_ts:
                profile.current_period_end = _period_end_from_ts(period_end_ts)
            # Ensure active status on successful payment
            if profile.subscription_status == "past_due":
                profile.subscription_status = "active"
                profile.is_paid = True
            profile.stripe_event_id_last = event_id
            await db.commit()

    # ── invoice.payment_failed ─────────────────────────────────────────────────
    elif event_type == "invoice.payment_failed":
        profile = await _resolve_profile(obj, db)
        if profile:
            if profile.stripe_event_id_last == event_id:
                return {"received": True}
            # Grace period: mark past_due but keep is_paid=True
            profile.subscription_status = "past_due"
            # is_paid stays True during grace period — revoked only on subscription.deleted
            profile.stripe_event_id_last = event_id
            await db.commit()

    # ── charge.dispute.created ────────────────────────────────────────────────
    elif event_type == "charge.dispute.created":
        # Fraud protection: revoke access immediately on dispute
        profile = await _resolve_profile(obj, db)
        if profile:
            if profile.stripe_event_id_last == event_id:
                return {"received": True}
            profile.is_paid = False
            profile.subscription_status = "canceled"
            profile.stripe_event_id_last = event_id
            await db.commit()

    return {"received": True}
