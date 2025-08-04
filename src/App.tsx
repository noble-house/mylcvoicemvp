import React, { useState } from "react";
import VoiceAssistant from "./components/VoiceAssistant";
import VideoAssistant from "./components/VideoAssistant"; // You’ll create this next

function App() {
  const [tab, setTab] = useState<"voice" | "video">("voice");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Tabs */}
      <div className="flex justify-center space-x-4 py-6">
        <button
          onClick={() => setTab("voice")}
          className={`px-4 py-2 rounded-full font-semibold transition ${
            tab === "voice"
              ? "bg-[#25646a] text-white"
              : "bg-white text-[#25646a] border border-[#25646a]"
          }`}
        >
          Voice Assistant
        </button>
        <button
          onClick={() => setTab("video")}
          className={`px-4 py-2 rounded-full font-semibold transition ${
            tab === "video"
              ? "bg-[#25646a] text-white"
              : "bg-white text-[#25646a] border border-[#25646a]"
          }`}
        >
          Video Assistant
        </button>
      </div>

      {/* Assistant Modules */}
      {tab === "voice" ? <VoiceAssistant /> : <VideoAssistant />}
    </div>
  );
}

export default App;
