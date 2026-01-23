from __future__ import annotations

import glob
import json
import os
import subprocess
import tempfile
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="mymagic (MATLAB Runtime) API", version="0.1.0")

APP_BIN_DIR = os.environ.get("APP_BIN_DIR", "/opt/mymagic")  # where we copy compiled artifacts


# Input of the model
class Req(BaseModel):
    x: int = Field(..., ge=1, le=50)

# Output of the model
# (also repeats input, but that's not per se needed)
class Resp(BaseModel):
    x: int
    y: List[List[int]]


def find_mcr_root() -> str:
    """
    MATLAB Compiler run scripts usually need: run_app.sh <MCRROOT> [args...]
    Runtime container locations can vary; find it by probing common paths.
    """
    candidates = []
    candidates += glob.glob("/opt/matlabruntime/**", recursive=False)
    candidates += glob.glob("/usr/local/MATLAB/**/MATLAB_Runtime/**", recursive=True)
    candidates += glob.glob("/usr/local/MATLAB/MATLAB_Runtime/**", recursive=True)

    # Keep only dirs that look like an MCR root (contain 'runtime' or 'bin')
    for c in candidates:
        if os.path.isdir(c) and (os.path.isdir(os.path.join(c, "bin")) or os.path.isdir(os.path.join(c, "runtime"))):
            return c

    # Last resort: let user set it explicitly
    env = os.environ.get("MCRROOT")
    if env and os.path.isdir(env):
        return env

    raise RuntimeError("Could not locate MATLAB Runtime root in container. Set MCRROOT env var.")


@app.post("/mymagic", response_model=Resp)
def mymagic(req: Req):
    run_sh = os.path.join(APP_BIN_DIR, "run_mymagic_cli.sh")
    exe = os.path.join(APP_BIN_DIR, "mymagic_cli")

    if not os.path.exists(run_sh) or not os.path.exists(exe):
        raise HTTPException(
            status_code=500,
            detail=f"Compiled app not found in {APP_BIN_DIR}. Expected run_mymagic_cli.sh and mymagic_cli.",
        )

    try:
        mcrroot = find_mcr_root()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    with tempfile.TemporaryDirectory() as td:
        out_json = os.path.join(td, "out.json")

        # run_mymagic_cli.sh <mcrroot> <input_json> <out_json>
        cmd = [run_sh, mcrroot, json.dumps({"x": req.x}), out_json]

        try:
            proc = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=60,
                check=False,
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Compiled MATLAB app timed out")

        if proc.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail={"message": "Compiled MATLAB app failed", "returncode": proc.returncode, "stdout": proc.stdout[-4000:]},
            )

        if not os.path.exists(out_json):
            raise HTTPException(
                status_code=500,
                detail={"message": "No output JSON produced", "stdout": proc.stdout[-4000:]},
            )

        with open(out_json, "r", encoding="utf-8") as f:
            y = json.load(f)

        return Resp(x=req.x, y=y)
