FROM containers.mathworks.com/matlab-runtime:r2025b
ENV AGREE_TO_MATLAB_RUNTIME_LICENSE=yes

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv python3-pip tini ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

# Create venv and install deps inside it (avoids externally-managed-environment)
ENV VENV_PATH=/opt/venv
RUN python3 -m venv ${VENV_PATH}
ENV PATH="${VENV_PATH}/bin:${PATH}"

COPY requirements.txt /srv/requirements.txt
RUN pip install --no-cache-dir -r /srv/requirements.txt

COPY main.py /srv/main.py
COPY build /opt/mymagic/
ENV APP_BIN_DIR=/opt/mymagic

EXPOSE 8000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

