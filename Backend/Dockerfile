FROM python:3.10-slim-bullseye

WORKDIR /app

RUN apt update && apt install -y ffmpeg git && \
    apt clean && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt && \
    rm -rf /root/.cache

COPY . .

EXPOSE 5000

CMD ["python", "whisper_worker.py"]
