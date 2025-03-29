import React, { useEffect, useState } from "react";
import VideoActionsBubble, { VideoItem } from "./VideoActionsBubble";

interface VideoListProps {
  onVideoSelect: (videoUrl: string, filename: string) => void;
  onTranscribe: (filename: string) => void;
  onAPITranscribe: (filename: string) => void; // New prop for API transcribe
  isTranscribing: boolean;
  isAPITranscribing: boolean; // New prop for API transcribing state
}

const VideoList: React.FC<VideoListProps> = ({
  onVideoSelect,
  onTranscribe,
  onAPITranscribe,
  isTranscribing,
  isAPITranscribing,
}) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for the active bubble rendered via portal
  const [activeBubble, setActiveBubble] = useState<{
    video: VideoItem;
    x: number;
    y: number;
  } | null>(null);

  const fetchVideos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/list_videos");
      if (!response.ok) {
        throw new Error("Failed to fetch video list.");
      }
      const data = await response.json();
      setVideos(data.videos);
    } catch (err) {
      if (err instanceof Error) {
        console.error("Error fetching video list:", err.message);
        setError("Failed to load videos. Please try again later.");
      } else {
        console.error("An unknown error occurred:", err);
        setError("An unknown error occurred. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleItemClick = (video: VideoItem, event: React.MouseEvent<HTMLLIElement>) => {
    event.stopPropagation();
    // Use viewport coordinates so the bubble renders relative to the entire window
    const x = event.clientX;
    const y = event.clientY;
    setActiveBubble({ video, x, y });
  };

  const handlePlayClick = () => {
    if (activeBubble) {
      onVideoSelect(activeBubble.video.url, activeBubble.video.filename);
      setActiveBubble(null);
    }
  };

  const handleTranscribeClick = () => {
    if (activeBubble) {
      if (window.confirm(`Generate local transcription for ${activeBubble.video.filename}?`)) {
        onTranscribe(activeBubble.video.filename);
      }
      setActiveBubble(null);
    }
  };

  const handleAPITranscribeClick = () => {
    if (activeBubble) {
      if (window.confirm(`Generate API transcription for ${activeBubble.video.filename}?`)) {
        onAPITranscribe(activeBubble.video.filename);
      }
      setActiveBubble(null);
    }
  };

  return (
    <div>
      {isLoading ? (
        <p>Loading videos...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : videos.length === 0 ? (
        <p>No videos loaded yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {videos.map((video, idx) => (
            <li
              key={idx}
              style={{
                marginBottom: "8px",
                cursor: "pointer",
                padding: "4px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              onClick={(e) => handleItemClick(video, e)}
            >
              {video.filename}
            </li>
          ))}
        </ul>
      )}
      {activeBubble && (
        <VideoActionsBubble
          x={activeBubble.x}
          y={activeBubble.y}
          video={activeBubble.video}
          onPlay={handlePlayClick}
          onTranscribe={handleTranscribeClick}
          onAPITranscribe={handleAPITranscribeClick} // Pass the new handler
          onClose={() => setActiveBubble(null)}
          isTranscribing={isTranscribing}
          isAPITranscribing={isAPITranscribing} // Pass the new state
        />
      )}
    </div>
  );
};

export default VideoList;