import React, { useState } from "react";

interface FileUploadProps {
  onUploadComplete: (videoUrl: string, filename: string) => void;
  addStatusMessage: (msg: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, addStatusMessage }) => {
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      addStatusMessage("No file selected.");
      return;
    }

    setIsLoading(true);
    addStatusMessage("Uploading video...");

    try {
      const formData = new FormData();
      formData.append("videoFile", file);

      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload video.");
      }

      const data = await response.json();
      if (data.videoFile) {
        addStatusMessage("Video uploaded and saved.");
        onUploadComplete(data.videoFile, data.filename);
      } else {
        addStatusMessage("Upload failed: No video file returned.");
      }
    } catch (error) {
      if (error instanceof Error) {
        addStatusMessage(`Upload failed: ${error.message}`);
      } else {
        addStatusMessage("Upload failed: An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      addStatusMessage("Please enter a valid URL.");
      return;
    }

    setIsLoading(true);
    addStatusMessage("Uploading video from URL...");

    try {
      const formData = new FormData();
      formData.append("videoUrl", url);

      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload video from URL.");
      }

      const data = await response.json();
      if (data.videoFile) {
        addStatusMessage("Video uploaded and saved.");
        onUploadComplete(data.videoFile, data.filename);
      } else {
        addStatusMessage("Upload failed: No video file returned.");
      }
    } catch (error) {
      if (error instanceof Error) {
        addStatusMessage(`Upload failed: ${error.message}`);
      } else {
        addStatusMessage("Upload failed: An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="video/mp4,video/mov"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      <br /><br />
      <input
        type="text"
        placeholder="Enter video URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isLoading}
      />
      <button onClick={handleUrlSubmit} disabled={isLoading || !url.trim()}>
        {isLoading ? "Uploading..." : "Load Video"}
      </button>
    </div>
  );
};

export default FileUpload;