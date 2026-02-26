import os
import json
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

load_dotenv()

app = FastAPI(title="Solana Error Translator")

# ---------------------------------------------------------------------------
# CORS — allow the Next.js dev server to call this API
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Load the error dictionary once at startup (avoids repeated disk reads)
# ---------------------------------------------------------------------------

_ERRORS_PATH = Path(__file__).parent.parent / "errors.json"

with open(_ERRORS_PATH, "r", encoding="utf-8") as _f:
    ERROR_DB: dict = json.load(_f)

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    signature: str

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Matches lines like:
#   Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA failed: custom program error: 0x1
_ERROR_PATTERN = re.compile(
    r"Program (\S+) failed: custom program error: (0x[0-9a-fA-F]+)",
    re.IGNORECASE,
)


def _lookup_error(program_id: str, error_code: str) -> dict | None:
    """Return the error dict from ERROR_DB, or None if not found."""
    program_entry = ERROR_DB.get(program_id)
    if not program_entry:
        return None
    return program_entry.get("errors", {}).get(error_code.lower())


def _program_name(program_id: str) -> str:
    entry = ERROR_DB.get(program_id)
    return entry["name"] if entry else program_id

# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@app.post("/api/analyze")
async def analyze_transaction(body: AnalyzeRequest):
    """
    Accept a Solana transaction signature, fetch the transaction from the
    configured RPC node, and return a human-readable explanation of any error.
    """

    # 1. Read RPC URL from environment
    rpc_url = os.getenv("SOLANA_RPC_URL")
    if not rpc_url:
        raise HTTPException(
            status_code=500,
            detail="SOLANA_RPC_URL is not set. Please create a .env file from .env.example.",
        )

    # 2. Fetch transaction from the Solana network
    try:
        from solana.rpc.api import Client
        from solders.signature import Signature  # installed as a dep of solana-py

        client = Client(rpc_url)
        sig = Signature.from_string(body.signature.strip())
        resp = client.get_transaction(
            sig,
            encoding="jsonParsed",
            max_supported_transaction_version=0,
        )
    except ValueError as exc:
        # from_string raises ValueError for malformed signatures
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transaction signature: {exc}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to reach the Solana RPC node: {exc}",
        )

    # 3. Handle "transaction not found" (invalid sig, not yet confirmed, pruned)
    if resp.value is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Transaction not found. The signature may be invalid, "
                "the transaction may not have been confirmed yet, or it "
                "may have been pruned from the RPC node's history."
            ),
        )

    meta = resp.value.transaction.meta

    # 4. Transaction was successful
    if meta.err is None:
        return {
            "status": "success",
            "message": "This transaction completed successfully — no errors were found.",
        }

    # 5. Transaction failed — search logs for a custom program error
    logs: list[str] = meta.log_messages or []

    program_id: str | None = None
    error_code: str | None = None
    matched_log: str | None = None

    for line in logs:
        m = _ERROR_PATTERN.search(line)
        if m:
            program_id = m.group(1)
            error_code = m.group(2).lower()
            matched_log = line
            break

    # 6. No structured error code found in logs
    if program_id is None:
        return {
            "status": "error_unparsed",
            "message": (
                "The transaction failed, but no custom program error code was "
                "found in the transaction logs. The error may be a system-level "
                "failure (e.g., insufficient SOL for fees, account not found)."
            ),
            "raw_logs": logs,
        }

    # 7. Look up the error in our local database
    error_info = _lookup_error(program_id, error_code)

    if error_info:
        return {
            "status": "error_found",
            "program_id": program_id,
            "program_name": _program_name(program_id),
            "error_code": error_code,
            "name": error_info["name"],
            "message": error_info["message"],
        }

    # 8. Error code exists but is not in our database yet
    return {
        "status": "error_unknown",
        "program_id": program_id,
        "program_name": _program_name(program_id),
        "error_code": error_code,
        "message": (
            f"The transaction failed with error code {error_code} "
            f"from program {program_id}, but this code is not yet in our database."
        ),
        "raw_log": matched_log,
    }
