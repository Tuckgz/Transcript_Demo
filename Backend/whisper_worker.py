import os
import time
import subprocess
from flask import Flask, request, jsonify, send_file, abort, Response
from flask_cors import CORS, cross_origin
import whisper  # Ensure whisper is imported

app = Flask(__name__)

# Enable CORS for all routes, allowing only http://localhost:5173 for requests.
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

# Define folders for uploads and VTT files.
UPLOAD_FOLDER = "uploaded_videos"
VTT_FOLDER = "vtt_files"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Ensure absolute paths for folders.
UPLOAD_PATH = os.path.join(BASE_DIR, UPLOAD_FOLDER)
VTT_PATH = os.path.join(BASE_DIR, VTT_FOLDER)
os.makedirs(UPLOAD_PATH, exist_ok=True)
os.makedirs(VTT_PATH, exist_ok=True)

def current_timestamp():
    return time.strftime("%Y%m%d_%H%M%S")

def add_status(message):
    print(message)

@app.route("/upload", methods=["POST", "OPTIONS"])
@cross_origin(origins="http://localhost:5173")
def upload():
    if request.method == "OPTIONS":
        # Flask-CORS will handle OPTIONS requests automatically.
        return jsonify({})

    video_file = request.files.get("videoFile")
    video_url = request.form.get("videoUrl")

    if not video_file and not video_url:
        return jsonify({"error": "No file or URL provided"}), 400

    timestamp = current_timestamp()
    file_path = ""

    if video_file:
        filename = f"{timestamp}_{video_file.filename}"
        file_path = os.path.join(UPLOAD_PATH, filename)
        video_file.save(file_path)
        add_status(f"Saved uploaded file as {filename}")
    elif video_url:
        if "youtube.com" in video_url or "youtu.be" in video_url:
            filename = f"{timestamp}_youtube_video.mp4"
            file_path = os.path.join(UPLOAD_PATH, filename)
            cmd = [
                "yt-dlp",
                "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
                "-o", file_path,
                video_url
            ]
            add_status("Downloading YouTube video...")
            try:
                subprocess.run(cmd, check=True, capture_output=True)
                add_status(f"Downloaded video as {filename}")
            except subprocess.CalledProcessError as e:
                add_status(f"Error downloading YouTube video: {e.output.decode('utf-8') if e.output else str(e)}")
                return jsonify({"error": "Failed to download YouTube video"}), 500
        else:
            filename = f"{timestamp}_downloaded_video.mp4"
            file_path = os.path.join(UPLOAD_PATH, filename)
            add_status(f"Downloading video from URL: {video_url}")
            os.system(f"wget -O {file_path} {video_url}")
            add_status(f"Downloaded video as {filename}")

    if not os.path.exists(file_path):
        return jsonify({"error": "Video file not saved properly."}), 500

    return jsonify({
        "videoFile": f"http://localhost:5000/uploaded_videos/{filename}",
        "filename": filename
    })

@app.route("/transcribe_video", methods=["POST", "OPTIONS"])
@cross_origin(origins="http://localhost:5173")
def transcribe_video():
    if request.method == "OPTIONS":
        return jsonify({})

    data = request.get_json()
    video_filename = data.get("videoFilename")
    if not video_filename:
        return jsonify({"error": "No video filename provided"}), 400
    file_path = os.path.join(UPLOAD_PATH, video_filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "Video file not found"}), 404

    add_status(f"Starting transcription for {video_filename} using Whisper...")
    model = whisper.load_model("base")
    result = model.transcribe(file_path)
    add_status("Transcription completed. Generating VTT file...")

    base_name = os.path.splitext(video_filename)[0]
    vtt_filename = f"{base_name}_transcription.vtt"
    vtt_file_path = os.path.join(VTT_PATH, vtt_filename)

    # Generate WebVTT content
    vtt_content = generate_vtt(result["segments"])
    with open(vtt_file_path, "w", encoding="utf-8") as f:
        f.write(vtt_content)

    add_status(f"VTT saved as {vtt_filename}")

    return jsonify({
        "vttPath": f"http://localhost:5000/vtt_files/{vtt_filename}",
        "videoFile": f"http://localhost:5000/uploaded_videos/{video_filename}"
    })

def generate_vtt(segments):
    vtt_text = "WEBVTT\n\n"
    for segment in segments:
        start = format_time(segment["start"])
        end = format_time(segment["end"])
        text = segment["text"].strip()
        vtt_text += f"{start} --> {end}\n{text}\n\n"
    return vtt_text

def format_time(seconds):
    millis = int((seconds % 1) * 1000)
    hh, mm, ss = int(seconds // 3600), int((seconds % 3600) // 60), int(seconds % 60)
    return f"{hh:02}:{mm:02}:{ss:02}.{millis:03}"

@app.route("/vtt_files/<filename>", methods=["GET", "OPTIONS"])
@cross_origin()  # Allow any origin if needed; you can restrict it if necessary.
def serve_vtt(filename):
    if request.method == "OPTIONS":
        return jsonify({})

    file_path = os.path.join(VTT_PATH, filename)
    if not os.path.exists(file_path):
        abort(404)

    with open(file_path, "r", encoding="utf-8") as f:
        vtt_content = f.read()

    # Flask-CORS will handle the CORS headers.
    return Response(vtt_content, mimetype="text/vtt")

@app.route("/uploaded_videos/<filename>", methods=["GET", "OPTIONS"])
@cross_origin()
def serve_video(filename):
    if request.method == "OPTIONS":
        return jsonify({})

    file_path = os.path.join(UPLOAD_PATH, filename)
    if not os.path.exists(file_path):
        abort(404)

    # Flask-CORS will handle the CORS headers.
    return send_file(file_path, mimetype="video/mp4")

@app.route("/list_videos", methods=["GET"])
@cross_origin(origins="http://localhost:5173")
def list_videos():
    files = os.listdir(UPLOAD_PATH)
    videos = [f for f in files if f.endswith(".mp4")]
    video_urls = [
        {"url": f"http://localhost:5000/uploaded_videos/{v}", "filename": v} for v in videos
    ]
    return jsonify({"videos": video_urls})

@app.route("/list_transcriptions", methods=["GET"])
@cross_origin(origins="http://localhost:5173")
def list_transcriptions():
    files = os.listdir(VTT_PATH)
    transcriptions = [
        {"url": f"http://localhost:5000/vtt_files/{f}", "filename": f} for f in files if f.endswith(".vtt")
    ]
    return jsonify({"transcriptions": transcriptions})

if __name__ == "__main__":
    app.run(port=5000, debug=True)
