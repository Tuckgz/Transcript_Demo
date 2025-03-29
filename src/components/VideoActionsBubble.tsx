import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";

export interface VideoItem {
  url: string;
  filename: string;
}

interface VideoActionsBubbleProps {
  x: number;
  y: number;
  video: VideoItem;
  onPlay: () => void;
  onTranscribe: () => void;
  onAPITranscribe?: () => void; // New prop for API transcription
  onClose: () => void;
  isTranscribing: boolean;
  isAPITranscribing?: boolean; // Optional prop to disable API transcribe button
}

const VideoActionsBubble: React.FC<VideoActionsBubbleProps> = ({
  x,
  y,
  video,
  onPlay,
  onTranscribe,
  onAPITranscribe,
  onClose,
  isTranscribing,
  isAPITranscribing,
}) => {
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      ref={bubbleRef}
      style={{
        position: "absolute",
        top: y,
        left: x,
        backgroundColor: "white",
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "8px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.2)",
        zIndex: 1000,
        whiteSpace: "nowrap",
      }}
    >
      <button
        onClick={onPlay}
        style={{
          background: "#28a745",
          color: "#fff",
          border: "none",
          padding: "4px 8px",
          borderRadius: "4px",
          cursor: "pointer",
          marginRight: "4px",
        }}
      >
        Play Video
      </button>
      <button
        onClick={onTranscribe}
        disabled={isTranscribing}
        style={{
          background: "#007bff",
          color: "#fff",
          border: "none",
          padding: "4px 8px",
          borderRadius: "4px",
          cursor: "pointer",
          marginRight: "4px",
        }}
      >
        {isTranscribing ? "Transcribing..." : "Local Transcribe"}
      </button>
      {onAPITranscribe && (
        <button
          onClick={onAPITranscribe}
          disabled={isAPITranscribing}
          style={{
            background: "#6c757d",
            color: "#fff",
            border: "none",
            padding: "4px 8px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {isAPITranscribing ? "API Transcribing..." : "API Transcribe"}
        </button>
      )}
    </div>,
    document.body
  );
};

export default VideoActionsBubble;