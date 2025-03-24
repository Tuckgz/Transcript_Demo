import React, { useState } from "react";

interface TranscriptionProps {
  videoFile: File | string | null;
  onTranscriptionComplete: (vttPath: string, videoUrl: string) => void;
  addStatusMessage: (msg: string) => void;
}

const Transcription: React.FC<TranscriptionProps> = ({
  videoFile,
  onTranscriptionComplete,
  addStatusMessage,
}) => {
  const [loading, setLoading] = useState(false);

  const handleTranscription = async () => {
    if (!videoFile) {
      addStatusMessage("No video file provided.");
      return;
    }

    setLoading(true);
    addStatusMessage("Starting transcription...");

    const formData = new FormData();
    if (typeof videoFile === "string") {
      formData.append("videoUrl", videoFile);
    } else {
      formData.append("videoFile", videoFile);
    }

    try {
      const response = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to transcribe video.");
      }

      addStatusMessage("Processing video on backend...");

      const data = await response.json();
      if (data.vttPath && data.videoFile) {  // Updated to check for vttPath
        addStatusMessage("Transcription complete.");
        onTranscriptionComplete(data.vttPath, data.videoFile);  // Use vttPath here
      } else {
        addStatusMessage("Transcription failed: No VTT file returned.");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error during transcription:", error.message);
        addStatusMessage(`Error during transcription: ${error.message}`);
      } else {
        console.error("An unknown error occurred:", error);
        addStatusMessage("An unknown error occurred during transcription.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleTranscription}
        disabled={loading || !videoFile}
        style={{
          padding: "8px 16px",
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Transcribing..." : "Generate Subtitles"}
      </button>
    </div>
  );
};

export default Transcription;
