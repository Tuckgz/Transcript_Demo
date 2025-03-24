import React, { useState, useEffect } from "react";
import FileUpload from "./FileUpload";
import VideoList from "./VideoList";
import TranscriptionList from "./TranscriptionList";
import VideoPlayer from "./VideoPlayer";

const Layout: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [currentFilename, setCurrentFilename] = useState<string>("");
  const [vttFile, setVttFile] = useState<string>("");
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

  const addStatusMessage = (msg: string) => {
    setStatusMessages((prev) => [...prev, msg]);
  };

  // Fetch the VTT file when the vttFile URL is set
  useEffect(() => {
    if (vttFile) {
      const fetchVttFile = async () => {
        try {
          const response = await fetch(vttFile, {
            method: "GET",
            headers: {
              Accept: "text/vtt",
            },
            mode: "cors",
          });
          if (!response.ok) {
            throw new Error("Failed to load VTT file.");
          }
          const vttContent = await response.text();
          console.log("VTT file content:", vttContent);
        } catch (error) {
          console.error("Error fetching VTT file:", error);
          addStatusMessage("Failed to fetch VTT file.");
        }
      };
      fetchVttFile();
    }
  }, [vttFile]);

  const handleUploadComplete = (url: string, filename: string) => {
    addStatusMessage("Video uploaded and ready.");
    setVideoUrl(url);
    setCurrentFilename(filename);

    let vttFilename = filename.replace(/\.(mp4|mov)$/, "_transcription.vtt");
    const guessedVtt = `http://localhost:5000/vtt_files/${vttFilename}`;
    setVttFile(guessedVtt);
  };

  const handleVideoSelect = (url: string, filename: string) => {
    setVideoUrl(url);
    setCurrentFilename(filename);

    let vttFilename = filename.replace(/\.(mp4|mov)$/, "_transcription.vtt");
    const guessedVtt = `http://localhost:5000/vtt_files/${vttFilename}`;
    setVttFile(guessedVtt);
  };

  const handleTranscribe = async (filename: string) => {
    setIsTranscribing(true);
    addStatusMessage(`Starting transcription for ${filename}...`);
    try {
      const response = await fetch("http://localhost:5000/transcribe_video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoFilename: filename }),
      });
      if (!response.ok) {
        throw new Error("Transcription request failed.");
      }
      const data = await response.json();
      if (data.vttPath) {
        addStatusMessage("Transcription complete.");
        if (filename === currentFilename) {
          setVttFile(data.vttPath);
        }
      } else {
        addStatusMessage("Transcription failed: No VTT file returned.");
      }
    } catch (error) {
      if (error instanceof Error) {
        addStatusMessage(`Transcription failed: ${error.message}`);
      } else {
        addStatusMessage("Transcription failed: An unknown error occurred.");
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        gap: "20px",
        padding: "20px",
        boxSizing: "border-box",
        overflow: "hidden", // Prevents accidental scrolling issues
      }}
    >
      {/* Left Column */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          border: "1px solid #ccc",
          padding: "20px",
          boxSizing: "border-box",
          minWidth: "300px",
          overflowY: "auto",
        }}
      >
        <FileUpload onUploadComplete={handleUploadComplete} addStatusMessage={addStatusMessage} />

        {/* Small Status Display */}
        <div
          style={{
            marginBottom: "10px",
            backgroundColor: "#000000",
            padding: "5px",
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          {statusMessages.length > 0 ? statusMessages.join(" | ") : "No status messages"}
        </div>

        {/* Video & Transcription List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
          <VideoList onVideoSelect={handleVideoSelect} onTranscribe={handleTranscribe} isTranscribing={isTranscribing} />
          <TranscriptionList />
        </div>
      </div>

      {/* Right Column - Video Player */}
      <div
        style={{
          flex: 2,
          display: "flex",
          flexDirection: "column",
          border: "1px solid #ccc",
          padding: "20px",
          boxSizing: "border-box",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "auto",
          maxHeight: "90vh", // Ensures it doesn't go off-screen
        }}
      >
        {videoUrl ? (
          <VideoPlayer key={videoUrl} videoUrl={videoUrl} vttFile={vttFile} />
        ) : (
          <div
            style={{
              width: "640px",
              height: "360px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#f0f0f0",
              borderRadius: "10px",
              fontSize: "18px",
              fontWeight: "bold",
              color: "#888",
            }}
          >
            No Video Selected
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
