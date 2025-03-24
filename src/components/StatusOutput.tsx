// src/components/StatusOutput.tsx
import React from "react";

interface StatusOutputProps {
  messages: string[];
}

const StatusOutput: React.FC<StatusOutputProps> = ({ messages }) => {
  return (
    <div>
      {messages.length === 0 ? (
        <p>No status updates yet...</p>
      ) : (
        messages.map((msg, idx) => <p key={idx}>{msg}</p>)
      )}
    </div>
  );
};

export default StatusOutput;
