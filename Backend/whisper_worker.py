import os
import time
import subprocess
import requests  # Added for API calls
from flask import Flask, request, jsonify, send_file, abort, Response
from flask_cors import CORS, cross_origin
import whisper  # Ensure whisper is imported
import yt_dlp as youtube_dl # Add the import

# --- API Key Requirement for OpenAI Whisper API ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

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
    filename = ""

    if video_file:
        filename = f"{timestamp}_{video_file.filename}"
        file_path = os.path.join(UPLOAD_PATH, filename)
        video_file.save(file_path)
        add_status(f"Saved uploaded file as {filename}")
    elif video_url:
        if "youtube.com" in video_url or "youtu.be" in video_url:
            filename = f"{timestamp}_youtube_video.mp4"
            file_path = os.path.join(UPLOAD_PATH, filename)
            ydl_opts = {
                'format': 'bestvideo[ext=mp4]+bestaudio/best[ext=m4a]/mp4',
                'outtmpl': file_path,
                'merge_output_format': 'mp4',
            }
            add_status("Downloading YouTube video...")
            try:
                with youtube_dl.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([video_url])
                add_status(f"Downloaded video as {filename}")
            except Exception as e:
                add_status(f"Error downloading YouTube video: {str(e)}")
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

    add_status(f"Starting transcription for {video_filename} using local Whisper...")
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

    return Response(vtt_content, mimetype="text/vtt")

@app.route("/uploaded_videos/<filename>", methods=["GET", "OPTIONS"])
@cross_origin()
def serve_video(filename):
    if request.method == "OPTIONS":
        return jsonify({})

    file_path = os.path.join(UPLOAD_PATH, filename)
    if not os.path.exists(file_path):
        abort(404)

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

# -------------------------------
# Alternative API Call Transcription using Whisper API
# -------------------------------
# The following function demonstrates how to use the OpenAI Whisper API
# to transcribe an audio file. It includes conversion of the MP4 to MP3 before sending.
# Uncomment this block if you prefer using the API instead of the local Whisper model.
#
@app.route("/transcribe_video_api", methods=["POST", "OPTIONS"])
@cross_origin(origins="http://localhost:5173")
def transcribe_video_api():
    if request.method == "OPTIONS":
        return jsonify({})

    data = request.get_json()
    video_filename = data.get("videoFilename")
    if not video_filename:
        return jsonify({"error": "No video filename provided"}), 400
    file_path = os.path.join(UPLOAD_PATH, video_filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "Video file not found"}), 404

    add_status(f"Starting transcription for {video_filename} using OpenAI Whisper API...")

    # Convert MP4 to MP3 before sending to the API.
    try:
        audio_file_path = convert_mp4_to_mp3(file_path)
    except Exception as e:
        return jsonify({"error": "Conversion to MP3 failed", "details": str(e)}), 500

    url = "https://api.openai.com/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}"
    }

    files_payload = {
        "file": open(audio_file_path, "rb"),
        "model": (None, "whisper-1"),
        "response_format": (None, "verbose_json"),
        "timestamp_granularities": (None, "segment")
    }

    try:
        response = requests.post(url, headers=headers, files=files_payload)
        files_payload["file"].close()

        # Delete temporary mp3 file after transcription
        try:
            os.remove(audio_file_path)
            add_status(f"Deleted temporary MP3 file: {audio_file_path}")
        except Exception as del_err:
            add_status(f"Warning: could not delete temporary file: {del_err}")

        if response.status_code == 200:
            result = response.json()
            add_status("API transcription completed. Generating VTT file...")

            if "segments" not in result:
                add_status("Error: No 'segments' found in API response.")
                return jsonify({"error": "API transcription failed."}), 500

            segments = result["segments"]
            base_name = os.path.splitext(video_filename)[0]
            vtt_filename = f"{base_name}_transcription.vtt"
            vtt_file_path = os.path.join(VTT_PATH, vtt_filename)

            # Generate VTT content using the same helper function
            vtt_content = generate_vtt(segments)
            with open(vtt_file_path, "w", encoding="utf-8") as f:
                f.write(vtt_content)

            add_status(f"VTT saved as {vtt_filename}")
            return jsonify({
                "vttPath": f"http://localhost:5000/vtt_files/{vtt_filename}",
                "videoFile": f"http://localhost:5000/uploaded_videos/{video_filename}"
            })
        else:
            add_status(f"Error: {response.status_code} - {response.text}")
            return jsonify({"error": "API transcription failed."}), 500
    except Exception as e:
        add_status(f"Error during API transcription: {e}")
        return jsonify({"error": "Exception occurred during API transcription."}), 500

def convert_mp4_to_mp3(mp4_path):
    """
    Converts an MP4 file to an MP3 file using FFmpeg.
    The output file will have the same base name with .mp3 extension.
    """
    mp3_path = os.path.splitext(mp4_path)[0] + ".mp3"
    ffmpeg_cmd = [
        "ffmpeg",
        "-i", mp4_path,
        "-vn",  # no video
        "-acodec", "libmp3lame",
        "-ab", "192k",
        "-y",   # overwrite if exists
        mp3_path
    ]
    add_status(f"Converting {mp4_path} to MP3...")
    try:
        subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
        add_status(f"Conversion complete. MP3 saved as {mp3_path}")
    except subprocess.CalledProcessError as e:
        add_status(f"Error during conversion: {e.output.decode('utf-8') if e.output else str(e)}")
        raise
    return mp3_path
#
# End of API transcription alternative

if __name__ == "__main__":
    app.run(port=5000, debug=True)