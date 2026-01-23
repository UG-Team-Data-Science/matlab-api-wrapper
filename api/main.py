from __future__ import annotations

import json
import os
import time
import uuid
import subprocess
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="mymagic (file-queue worker) API", version="0.1.0")

# Where jobs are exchanged between API and MATLAB worker
JOB_DIR = Path(os.environ.get("JOB_DIR", "/tmp/mymagic_jobs"))

# Compiled worker launcher + MCRROOT
RUN_SH = os.environ.get("RUN_WORKER_SH", "/opt/mymagic/run_mymagic_worker.sh")
MCRROOT = os.environ.get("MCRROOT", "/opt/matlabruntime/R2025b")  # adjust if needed

# Start one worker per API container (simple and effective)
WORKER_PROC: Optional[subprocess.Popen] = None


class Req(BaseModel):
    x: int = Field(..., ge=1, le=50)


class Resp(BaseModel):
    x: int
    y: list[list[int]]


@app.get("/health")
def health():
    return {"ok": True, "job_dir": str(JOB_DIR)}


def start_worker_if_needed() -> None:
    global WORKER_PROC

    JOB_DIR.mkdir(parents=True, exist_ok=True)
    (JOB_DIR / "__quit__").unlink(missing_ok=True)

    if WORKER_PROC is not None and WORKER_PROC.poll() is None:
        return

    if not os.path.exists(RUN_SH):
        raise RuntimeError(f"Worker launcher not found: {RUN_SH}")
    if not os.path.isdir(MCRROOT):
        raise RuntimeError(f"MCRROOT not found/dir: {MCRROOT}")

    # Start the compiled MATLAB worker
    WORKER_PROC = subprocess.Popen(
        [RUN_SH, MCRROOT, str(JOB_DIR)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )


@app.on_event("startup")
def _startup():
    start_worker_if_needed()


@app.on_event("shutdown")
def _shutdown():
    # Ask worker to quit
    try:
        (JOB_DIR / "__quit__").write_text("1", encoding="utf-8")
    except Exception:
        pass


@app.post("/mymagic", response_model=Resp)
def mymagic(req: Req):
    start_worker_if_needed()

    job_id = uuid.uuid4().hex
    in_path = JOB_DIR / f"{job_id}.in.json"
    out_path = JOB_DIR / f"{job_id}.out.json"

    # Write job input
    in_path.write_text(json.dumps({"x": req.x}), encoding="utf-8")

    # Wait for output (poll)
    timeout_s = 10.0
    poll_s = 0.02
    deadline = time.time() + timeout_s

    while time.time() < deadline:
        if out_path.exists():
            try:
                data = json.loads(out_path.read_text(encoding="utf-8"))
            finally:
                # cleanup
                try:
                    out_path.unlink(missing_ok=True)
                except Exception:
                    pass

            if not data.get("ok", False):
                raise HTTPException(status_code=500, detail=data)
            
            if isinstance(data["y"], (int, float)): # in case of x == 1, matlab quirk
                data["y"] = [[data["y"]]]
            return Resp(x=req.x, y=data["y"])

        time.sleep(poll_s)

    # Timeout cleanup
    try:
        in_path.unlink(missing_ok=True)
    except Exception:
        pass

    raise HTTPException(status_code=504, detail="Timed out waiting for MATLAB worker output")
