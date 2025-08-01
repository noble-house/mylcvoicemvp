import React, { useState } from 'react';
import VoiceAssistant from './components/VoiceAssistant';
import VideoAssistant from './components/VideoAssistant'; // You’ll create this next

function App() {
  const [tab, setTab] = useState<'voice' | 'video'>('voice');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Tabs */}
      <div className="flex justify-center space-x-4 py-6">
        <button
          onClick={() => setTab('voice')}
          className={`px-4 py-2 rounded-full font-semibold transition ${
            tab === 'voice'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-blue-600 border border-blue-600'
          }`}
        >
          Voice Assistant
        </button>
        <button
          onClick={() => setTab('video')}
          className={`px-4 py-2 rounded-full font-semibold transition ${
            tab === 'video'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-blue-600 border border-blue-600'
          }`}
        >
          Video Assistant
        </button>
      </div>

      {/* Assistant Modules */}
      {tab === 'voice' ? <VoiceAssistant /> : <VideoAssistant />}
    </div>
  );
}

export default App;
