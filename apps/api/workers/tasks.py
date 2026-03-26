"""
Background tasks for Logia Community.

Email tasks are called via FastAPI BackgroundTasks (fire-and-forget within the request lifecycle).
The hourly event reminder runs as a Modal scheduled function (see modal_app.py).
"""
from datetime import datetime, timedelta, timezone
import resend

from ..core.config import settings


# ── Internal helper ───────────────────────────────────────────────────────────

def _send_email(to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        return
    resend.api_key = settings.resend_api_key
    resend.Emails.send({
        "from": settings.resend_from,
        "to": [to],
        "subject": subject,
        "html": html,
    })


# ── Email tasks (called via FastAPI BackgroundTasks) ──────────────────────────

def send_welcome_email(user_email: str, full_name: str) -> None:
    _send_email(
        to=user_email,
        subject="Bem-vindo à Comunidade Logia Business!",
        html=f"""
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #FF6B2B;">Olá, {full_name}!</h1>
            <p>Bem-vindo à <strong>Comunidade Logia Business</strong>! 🎉</p>
            <p>Você acaba de ganhar <strong>50 pontos</strong> de boas-vindas.
               Participe dos fóruns, complete aulas e suba no ranking!</p>
            <a href="{settings.frontend_url}"
               style="background:#FF6B2B;color:#fff;padding:12px 24px;border-radius:8px;
                      text-decoration:none;display:inline-block;margin-top:16px;">
                Acessar a comunidade
            </a>
        </div>
        """,
    )


def send_comment_notification(
    post_author_email: str,
    post_author_name: str,
    commenter_name: str,
    post_title: str,
    post_id: str,
) -> None:
    meeting_link = ""
    _send_email(
        to=post_author_email,
        subject=f"{commenter_name} comentou na sua publicação",
        html=f"""
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Olá, {post_author_name}!</p>
            <p><strong>{commenter_name}</strong> comentou na sua publicação
               "{post_title or 'sem título'}".</p>
            <a href="{settings.frontend_url}/posts/{post_id}"
               style="background:#FF6B2B;color:#fff;padding:12px 24px;border-radius:8px;
                      text-decoration:none;display:inline-block;margin-top:16px;">
                Ver comentário
            </a>
        </div>
        """,
    )


# ── Scheduled task (called by Modal hourly, see modal_app.py) ─────────────────

def run_event_reminders() -> None:
    """
    Send 1-hour reminder emails for upcoming events.
    Targets events starting in 45–75 min so each hourly run sends exactly once per event.
    """
    if not settings.resend_api_key:
        return

    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import sessionmaker
    from ..models.event import Event
    from ..models.event_registration import EventRegistration
    from ..models.profile import Profile

    sync_db_url = settings.database_url.replace("+asyncpg", "+psycopg2")
    engine = create_engine(sync_db_url)
    Session = sessionmaker(bind=engine)

    now = datetime.now(timezone.utc)
    window_start = now + timedelta(minutes=45)
    window_end = now + timedelta(minutes=75)

    with Session() as session:
        events = session.execute(
            select(Event).where(
                Event.starts_at >= window_start,
                Event.starts_at <= window_end,
                Event.status == "scheduled",
            )
        ).scalars().all()

        for event in events:
            registrations = session.execute(
                select(EventRegistration).where(EventRegistration.event_id == event.id)
            ).scalars().all()

            for reg in registrations:
                user = session.get(Profile, reg.user_id)
                if user and user.email:
                    meeting_link = (
                        f'<p><a href="{event.meeting_url}">Acessar link do evento</a></p>'
                        if event.meeting_url else ""
                    )
                    _send_email(
                        to=user.email,
                        subject=f"Lembrete: {event.title} começa em breve!",
                        html=f"""
                        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #FF6B2B;">Seu evento começa em breve!</h2>
                            <h3>{event.title}</h3>
                            <p>Horário: {event.starts_at.strftime('%d/%m/%Y às %H:%M')} ({event.timezone})</p>
                            {meeting_link}
                        </div>
                        """,
                    )

    engine.dispose()
