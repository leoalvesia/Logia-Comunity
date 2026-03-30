"""
Modal deployment entry point for Logia Community API.

Deploy:  modal deploy apps/api/modal_app.py
Serve:   modal serve apps/api/modal_app.py   (local dev with hot reload)

Secrets: create once via `modal secret create logia-secrets KEY=value ...`
"""
import modal

app = modal.App("logia-community")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("apps/api/requirements.txt")
    .add_local_dir("apps/api", remote_path="/root/app", copy=True)
    .run_commands("echo '/root' > /usr/local/lib/python3.11/site-packages/logia.pth")
    .run_commands("python3 -c 'import app; print(\"BUILD OK:\", app.__file__)'")
)


# ── FastAPI ASGI app ──────────────────────────────────────────────────────────
@app.function(
    image=image,
    secrets=[modal.Secret.from_name("logia-secrets")],
    min_containers=1,
    timeout=60,
)
@modal.asgi_app()
def web():
    import sys, os
    print("RUNTIME sys.path:", sys.path[:4])
    print("RUNTIME /root exists:", os.path.exists('/root'))
    print("RUNTIME /root/app exists:", os.path.exists('/root/app'))
    if os.path.exists('/root/app'):
        print("RUNTIME /root/app contents:", os.listdir('/root/app')[:5])
    from app.main import app as fastapi_app
    return fastapi_app


# ── Scheduled task: event reminders (runs every hour) ────────────────────────
@app.function(
    image=image,
    secrets=[modal.Secret.from_name("logia-secrets")],
    schedule=modal.Period(hours=1),
)
def hourly_event_reminders():
    """Send 24h reminder emails for upcoming events. Triggered automatically by Modal."""
    from app.workers.tasks import run_event_reminders
    run_event_reminders()
