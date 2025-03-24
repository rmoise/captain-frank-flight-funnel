"use client";

import React, { useState } from "react";
import { clearAllStorage, fixPhaseTransition } from "@/utilities/debugHelpers";

const DebugPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClearStorage = () => {
    if (
      confirm(
        "Are you sure you want to clear all storage? This will reset your progress."
      )
    ) {
      try {
        clearAllStorage();
        setMessage("Storage cleared successfully! Redirecting...");
      } catch (error) {
        console.error("Error clearing storage:", error);
        setMessage("Error clearing storage. See console for details.");
      }
    }
  };

  const handleFixPhaseTransition = () => {
    if (
      confirm(
        "Are you sure you want to fix phase transition? This may reset some data."
      )
    ) {
      try {
        fixPhaseTransition();
        setMessage("Phase transition fixed! Redirecting...");
      } catch (error) {
        console.error("Error fixing phase transition:", error);
        setMessage("Error fixing phase transition. See console for details.");
      }
    }
  };

  if (!expanded) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "10px",
          right: "10px",
          zIndex: 9999,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "5px 10px",
          borderRadius: "5px",
          fontSize: "12px",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(true)}
      >
        Debug
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        zIndex: 9999,
        background: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "15px",
        borderRadius: "8px",
        width: "250px",
        boxShadow: "0 0 10px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <h4 style={{ margin: 0 }}>Debug Panel</h4>
        <button
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "16px",
          }}
          onClick={() => setExpanded(false)}
        >
          ×
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: "8px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "4px",
            marginBottom: "10px",
            fontSize: "12px",
          }}
        >
          {message}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          style={{
            padding: "8px 12px",
            background: "#d9534f",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={handleClearStorage}
        >
          Clear All Storage
        </button>

        <button
          style={{
            padding: "8px 12px",
            background: "#f0ad4e",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={handleFixPhaseTransition}
        >
          Fix Phase Transition
        </button>
      </div>

      <div
        style={{
          marginTop: "10px",
          fontSize: "10px",
          color: "rgba(255,255,255,0.6)",
          textAlign: "center",
        }}
      >
        Use these tools only if you encounter issues
      </div>
    </div>
  );
};

export default DebugPanel;
