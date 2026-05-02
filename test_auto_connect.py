#!/usr/bin/env python3
"""
Standalone PhantomBuster trigger script for Auto Connect diagnostics.

What this script does:
1) Launches Phantom ID 8397011094106210 with dashboard-saved config (no args).
2) Launches the same Phantom again with message-related args to test behavior/logging.
3) Polls container status until finished or timeout.
4) Fetches and stores full container output logs.
5) Writes everything to console + log file.

Important:
- This script helps you verify that both "connect" and "message/note" attempts were triggered.
- For Auto Connect style phantoms, message text is usually a connection note (sent with invite),
  not a post-connection inbox message.
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib import request, error


API_BASE = "https://api.phantombuster.com/api/v2"
PHANTOM_ID = "8397011094106210"
DEFAULT_TIMEOUT_MINUTES = 30
POLL_INTERVAL_SECONDS = 10
LOG_DIR = Path("logs")


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


class Logger:
    def __init__(self, file_path: Path) -> None:
        self.file_path = file_path
        self.file_path.parent.mkdir(parents=True, exist_ok=True)

    def write(self, message: str) -> None:
        line = f"[{now_utc()}] {message}"
        print(line)
        with self.file_path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


def load_env_file_if_present() -> None:
    """Minimal .env loader to avoid external dependencies."""
    candidates = [
        Path(".env"),
        Path("backend/.env"),
    ]
    env_path = next((p for p in candidates if p.exists()), None)
    if not env_path:
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def pb_request(
    logger: Logger,
    endpoint: str,
    api_key: str,
    method: str = "GET",
    body: Optional[Dict[str, Any]] = None,
) -> Tuple[int, Dict[str, Any]]:
    url = f"{API_BASE}{endpoint}"
    data = None
    headers = {
        "X-Phantombuster-Key": api_key,
        "Content-Type": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=60) as resp:
            payload = resp.read().decode("utf-8", errors="replace")
            parsed = json.loads(payload) if payload else {}
            return resp.status, parsed
    except error.HTTPError as e:
        payload = e.read().decode("utf-8", errors="replace") if e.fp else ""
        try:
            parsed = json.loads(payload) if payload else {}
        except Exception:
            parsed = {"raw": payload}
        logger.write(f"HTTPError {e.code} on {endpoint}: {json.dumps(parsed, ensure_ascii=True)}")
        return e.code, parsed
    except Exception as e:
        logger.write(f"Request error on {endpoint}: {e}")
        return 0, {"error": str(e)}


def launch_phantom(
    logger: Logger, api_key: str, label: str, launch_args: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    body: Dict[str, Any] = {"id": PHANTOM_ID}
    if launch_args is not None:
        body["arguments"] = launch_args

    logger.write(f"[{label}] Launch payload: {json.dumps(body, ensure_ascii=True)}")
    status, data = pb_request(logger, "/agents/launch", api_key, method="POST", body=body)
    if status < 200 or status >= 300:
        logger.write(f"[{label}] Launch failed (status {status}).")
        return None

    container_id = str(data.get("containerId") or "").strip()
    if not container_id:
        logger.write(f"[{label}] Launch response missing containerId: {json.dumps(data, ensure_ascii=True)}")
        return None

    logger.write(f"[{label}] Launch success. containerId={container_id}")
    return container_id


def wait_for_container(
    logger: Logger, api_key: str, container_id: str, label: str, timeout_minutes: int = DEFAULT_TIMEOUT_MINUTES
) -> Optional[Dict[str, Any]]:
    deadline = time.time() + timeout_minutes * 60
    while time.time() < deadline:
        status, data = pb_request(logger, f"/containers/fetch?id={container_id}", api_key)
        if status >= 400:
            logger.write(f"[{label}] Could not fetch container status yet. Retrying...")
            time.sleep(POLL_INTERVAL_SECONDS)
            continue

        container_status = str(data.get("status", "unknown"))
        exit_code = data.get("exitCode")
        logger.write(f"[{label}] status={container_status}, exitCode={exit_code}")

        is_finished = (
            container_status in {"finished", "success", "error"}
            or exit_code is not None
        )
        if is_finished:
            return data

        time.sleep(POLL_INTERVAL_SECONDS)

    logger.write(f"[{label}] Timeout waiting for container after {timeout_minutes} minutes.")
    return None


def fetch_container_output(logger: Logger, api_key: str, container_id: str, label: str) -> str:
    status, data = pb_request(logger, f"/containers/fetch-output?id={container_id}", api_key)
    if status < 200 or status >= 300:
        logger.write(f"[{label}] Failed to fetch container output (status={status}).")
        return ""
    output = data.get("output")
    if isinstance(output, str):
        return output
    return ""


def analyze_message_behavior(log_text: str) -> str:
    text = log_text.lower()
    if "premium" in text or "sales navigator" in text:
        return "Message capability likely blocked by account tier (premium/sales navigator required)."
    if "invitation" in text or "connection request" in text or "note" in text:
        return "This run appears to use connection requests with note (not post-connection inbox message)."
    if "message sent" in text or "sent message" in text:
        return "Post-connection/direct message behavior detected."
    if "invalid argument" in text:
        return "Message-related args may not be accepted by this phantom configuration."
    return "Could not determine message mode from output. Check full logs."


def fetch_agent_schema_keys(logger: Logger, api_key: str) -> List[str]:
    status, data = pb_request(logger, f"/agents/fetch?id={PHANTOM_ID}", api_key)
    if status < 200 or status >= 300:
        logger.write("Could not fetch agent schema from /agents/fetch.")
        return []

    raw_arg_def = data.get("argument")
    parsed_arg_def: Dict[str, Any] = {}

    if isinstance(raw_arg_def, dict):
        parsed_arg_def = raw_arg_def
    elif isinstance(raw_arg_def, str):
        try:
            maybe_obj = json.loads(raw_arg_def)
            if isinstance(maybe_obj, dict):
                parsed_arg_def = maybe_obj
        except Exception:
            parsed_arg_def = {}

    schema_keys = sorted(parsed_arg_def.keys())
    if schema_keys:
        logger.write(f"Accepted/saved argument keys from agent config: {schema_keys}")
    else:
        logger.write("No explicit argument keys found in agent config payload.")
    return schema_keys


def build_message_args_from_schema(schema_keys: List[str], custom_message: str) -> Dict[str, Any]:
    """
    Build the safest possible message payload using ONLY keys seen in this agent's schema/config.
    """
    args: Dict[str, Any] = {}
    key_candidates = [
        "message",
        "messageText",
        "yourMessage",
        "invitationMessage",
        "note",
        "customMessage",
    ]
    for key in key_candidates:
        if key in schema_keys:
            args[key] = custom_message
    return args


def run_test(logger: Logger, api_key: str) -> None:
    custom_message = (
        "Hi! This is an automation connectivity test. "
        "If this reaches you, it confirms connect+note trigger is working."
    )
    logger.write(f"Starting Auto Connect diagnostic for Phantom ID {PHANTOM_ID}")
    schema_keys = fetch_agent_schema_keys(logger, api_key)

    # 1) Launch using dashboard defaults (no args). This uses profile(s) set inside Phantom dashboard.
    label1 = "RUN-1 dashboard defaults"
    container_1 = launch_phantom(logger, api_key, label1, launch_args=None)
    if container_1:
        data_1 = wait_for_container(logger, api_key, container_1, label1)
        out_1 = fetch_container_output(logger, api_key, container_1, label1)
        logger.write(f"[{label1}] container summary: {json.dumps(data_1 or {}, ensure_ascii=True)}")
        logger.write(f"[{label1}] output preview (last 1200 chars): {out_1[-1200:] if out_1 else '(empty)'}")
        logger.write(f"[{label1}] behavior analysis: {analyze_message_behavior(out_1)}")
    else:
        logger.write(f"[{label1}] skipped status/output fetch because launch failed.")

    # 2) Launch with schema-safe message fields only.
    # Profile URLs are intentionally omitted so dashboard-configured profile input is used.
    label2 = "RUN-2 schema-safe message fields"
    launch_args_2 = build_message_args_from_schema(schema_keys, custom_message)
    if not launch_args_2:
        logger.write(
            f"[{label2}] No message-compatible keys found in this phantom schema/config. "
            "Skipping API message arg test. Configure note/message directly in Phantom dashboard for this agent."
        )
    else:
        logger.write(f"[{label2}] Using message keys: {sorted(launch_args_2.keys())}")
        container_2 = launch_phantom(logger, api_key, label2, launch_args=launch_args_2)
        if container_2:
            data_2 = wait_for_container(logger, api_key, container_2, label2)
            out_2 = fetch_container_output(logger, api_key, container_2, label2)
            logger.write(f"[{label2}] container summary: {json.dumps(data_2 or {}, ensure_ascii=True)}")
            logger.write(f"[{label2}] output preview (last 1200 chars): {out_2[-1200:] if out_2 else '(empty)'}")
            logger.write(f"[{label2}] behavior analysis: {analyze_message_behavior(out_2)}")
        else:
            logger.write(f"[{label2}] skipped status/output fetch because launch failed.")

    logger.write("Done. Check this log for all outcomes, including failed/unsupported features.")


def main() -> int:
    load_env_file_if_present()
    api_key = (
        os.getenv("PHANTOMBUSTER_API_KEY")
        or os.getenv("PHANTOMBUSTER_API_KEY")
        or ""
    ).strip()
    if not api_key:
        print("ERROR: PHANTOMBUSTER_API_KEY not found in environment or .env")
        return 1

    log_name = datetime.now().strftime("test_auto_connect_%Y%m%d_%H%M%S.log")
    logger = Logger(LOG_DIR / log_name)
    logger.write("Logger initialized.")
    logger.write(f"Using Phantom ID: {PHANTOM_ID}")
    logger.write("This script will attempt two launches and capture complete diagnostics.")
    run_test(logger, api_key)
    logger.write(f"Log file saved at: {logger.file_path.resolve()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
