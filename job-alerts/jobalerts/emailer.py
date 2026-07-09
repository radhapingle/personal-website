"""Compose and send the job-alert digest over SMTP."""

from __future__ import annotations

import html
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from . import config

_GROUP_LABELS = {
    "data": "Data",
    "product": "Product",
    "design_ux": "Design / UX",
    "psych_cogsci": "Psych / CogSci",
    "research": "Research",
    "ml_ai": "ML / AI",
}


def _tags_html(groups: list[str]) -> str:
    chips = []
    for g in groups:
        label = _GROUP_LABELS.get(g, g)
        chips.append(
            f'<span style="display:inline-block;background:#eef2ff;color:#3730a3;'
            f'font-size:11px;padding:2px 8px;border-radius:999px;margin:0 4px 4px 0;">{html.escape(label)}</span>'
        )
    return "".join(chips)


def build_html(jobs: list[dict]) -> str:
    date_str = datetime.now(timezone.utc).astimezone().strftime("%A, %b %-d, %Y")
    rows = []
    for j in jobs:
        title = html.escape(j.get("title", "Untitled role"))
        company = html.escape(j.get("company", "Unknown company"))
        locs = html.escape(", ".join(j.get("locations", [])) or "Location N/A")
        url = html.escape(j.get("url", "#"))
        tags = _tags_html(j.get("matched", []))
        rows.append(
            f"""
            <tr>
              <td style="padding:16px 0;border-bottom:1px solid #eee;">
                <div style="font-size:16px;font-weight:600;color:#111;">
                  <a href="{url}" style="color:#4338ca;text-decoration:none;">{title}</a>
                </div>
                <div style="font-size:14px;color:#444;margin-top:2px;">{company}</div>
                <div style="font-size:13px;color:#777;margin-top:2px;">{locs}</div>
                <div style="margin-top:8px;">{tags}</div>
              </td>
            </tr>"""
        )

    body = "".join(rows)
    return f"""\
<!DOCTYPE html>
<html>
<body style="margin:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;padding:28px;">
      <h1 style="font-size:20px;margin:0 0 4px;color:#111;">New Summer 2027 postings</h1>
      <p style="font-size:13px;color:#777;margin:0 0 20px;">{date_str} &middot; {len(jobs)} new match{'es' if len(jobs) != 1 else ''}</p>
      <table style="width:100%;border-collapse:collapse;">{body}</table>
      <p style="font-size:12px;color:#aaa;margin-top:24px;line-height:1.5;">
        Matched against your interests: data analysis, product, design/UX, psychology,
        cognitive science, ML, and research. Reply-worthy but not perfect &mdash; tune the
        keyword filters in <code>job-alerts/jobalerts/config.py</code>.
      </p>
    </div>
  </div>
</body>
</html>"""


def build_text(jobs: list[dict]) -> str:
    lines = [f"New Summer 2027 postings ({len(jobs)} match{'es' if len(jobs) != 1 else ''}):", ""]
    for j in jobs:
        lines.append(f"- {j.get('title')} @ {j.get('company')}")
        lines.append(f"  {', '.join(j.get('locations', [])) or 'Location N/A'}")
        lines.append(f"  {j.get('url')}")
        lines.append("")
    return "\n".join(lines)


def send(jobs: list[dict], subject: str | None = None) -> None:
    smtp = config.SMTP
    if not smtp["user"] or not smtp["password"]:
        raise RuntimeError(
            "SMTP_USER and SMTP_PASSWORD must be set to send email. "
            "See job-alerts/README.md for setup."
        )

    subject = subject or f"{len(jobs)} new Summer 2027 posting{'s' if len(jobs) != 1 else ''}"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f'{smtp["from_name"]} <{smtp["user"]}>'
    msg["To"] = config.RECIPIENT
    msg.attach(MIMEText(build_text(jobs), "plain"))
    msg.attach(MIMEText(build_html(jobs), "html"))

    if smtp["use_tls"]:
        context = config.make_ssl_context()
        with smtplib.SMTP(smtp["host"], smtp["port"], timeout=30) as server:
            server.starttls(context=context)
            server.login(smtp["user"], smtp["password"])
            server.send_message(msg)
    else:
        context = config.make_ssl_context()
        with smtplib.SMTP_SSL(smtp["host"], smtp["port"], context=context, timeout=30) as server:
            server.login(smtp["user"], smtp["password"])
            server.send_message(msg)

    print(f"[email] sent '{subject}' to {config.RECIPIENT}")
