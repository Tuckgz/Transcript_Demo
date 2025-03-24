import React, { useEffect, useState } from "react";

interface TranscriptionItem {
  url: string;
  filename: string;
}

const TranscriptionList: React.FC = () => {
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTranscriptions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/list_transcriptions");
      if (!response.ok) {
        throw new Error("Failed to fetch transcription list.");
      }
      const data = await response.json();
      setTranscriptions(data.transcriptions); // Only fetch once and update state
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error fetching transcription list:", error.message);
        setError("Failed to load transcriptions. Please try again later.");
      } else {
        console.error("An unknown error occurred:", error);
        setError("An unknown error occurred. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Only fetch data once on mount
  useEffect(() => {
    fetchTranscriptions();
  }, []); // Empty dependency array ensures this runs only once when the component is mounted

  return (
    <div>
      {isLoading ? (
        <p>Loading transcriptions...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : transcriptions.length === 0 ? (
        <p>No transcriptions available.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {transcriptions.map((transcription, idx) => (
            <li
              key={idx}
              style={{
                marginBottom: "8px",
                cursor: "pointer",
                padding: "4px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              onClick={() => window.open(transcription.url, "_blank")}
            >
              {transcription.filename}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TranscriptionList;
