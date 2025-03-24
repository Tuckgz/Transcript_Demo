import React from "react";

interface VideoPlayerProps {
  videoUrl: string | null;
  vttFile: string | null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, vttFile }) => {
  console.log("Video URL:", videoUrl);
  console.log("VTT File:", vttFile);

  if (!videoUrl) {
    return <div>Please load a video.</div>;
  }

  return (
    <div>
      <video controls crossOrigin="anonymous" style={{ width: "100%" }}>
        <source src={videoUrl} type="video/mp4" />
        {vttFile ? (
          <track 
            src={vttFile} 
            kind="subtitles" 
            srcLang="en" 
            label="English" 
            default 
          />
        ) : (
          <p>No subtitles available for this video.</p>
        )}
      </video>
    </div>
  );
};

export default VideoPlayer;
