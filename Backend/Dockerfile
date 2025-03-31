FROM python:3.10-slim-buster

WORKDIR /app

# Install system dependencies
RUN apt update && apt install -y git wget xz-utils && \
    wget https://www.johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz && \
    tar -xvf ffmpeg-release-amd64-static.tar.xz && \
    cp ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/ && \
    cp ffmpeg-*-amd64-static/ffprobe /usr/local/bin/ && \
    rm -rf ffmpeg-*-amd64-static* && \
    apt clean && rm -rf /var/lib/apt/lists/*

# Copy only requirements first for better caching
COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install -r requirements.txt && \
    pip install git+https://github.com/openai/whisper.git && \
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    rm -rf /root/.cache

# Copy app code
COPY . .

EXPOSE 5000

CMD ["python", "whisper_worker.py"]
