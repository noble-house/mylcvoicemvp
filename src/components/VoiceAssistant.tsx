import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import logo from "../assets/images/logo.png";

type AssistantState = "idle" | "listening" | "processing" | "speaking";

const VoiceAssistant: React.FC = () => {
  const [state, setState] = useState<AssistantState>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number>(0);

  // Helper to wait for voices to be loaded
  const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      let voices = speechSynthesis.getVoices();
      if (voices.length) {
        resolve(voices);
        return;
      }
      const interval = setInterval(() => {
        voices = speechSynthesis.getVoices();
        if (voices.length) {
          clearInterval(interval);
          resolve(voices);
        }
      }, 100);
    });
  };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onstart = () => {
        setState("listening");
        startAudioVisualization();
      };

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);

        if (event.results[current].isFinal) {
          setState("processing");
          processQuery(transcript);
        }
      };

      recognitionRef.current.onerror = () => {
        setState("idle");
        stopAudioVisualization();
      };

      recognitionRef.current.onend = () => {
        stopAudioVisualization();
      };
    }

    return () => {
      stopAudioVisualization();
    };
  }, []);

  const startAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current =
        audioContextRef.current.createMediaStreamSource(stream);

      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const updateAudioLevel = () => {
        if (analyserRef.current && state === "listening") {
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);

          const average =
            dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          setAudioLevel(average / 255);

          animationRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };

      updateAudioLevel();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopAudioVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const startListening = () => {
    if (recognitionRef.current && state === "idle") {
      setTranscript("");
      setResponse("");
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && state === "listening") {
      recognitionRef.current.stop();
      setState("idle");
    }
  };

  const processQuery = async (query: string) => {
    try {
      const res = await fetch(
        "https://mylcbotbackend-production.up.railway.app/ask",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        }
      );

      const data = await res.json();
      const answer = data.answer || "Sorry, I couldn't find an answer.";
      setResponse(answer);
      setState("speaking");

      // Clean HTML tags
      const cleanText = answer.replace(/<[^>]*>?/gm, "");

      // Wait for voices to load
      const voices = await loadVoices();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const preferredVoice = voices.find(
        (v) => v.name === "Google US English" && v.lang === "en-US"
      );
      if (preferredVoice) utterance.voice = preferredVoice;

      speechSynthesis.speak(utterance);
      utterance.onend = () => setState("idle");
    } catch (error) {
      console.error("Error querying backend:", error);
      setResponse("Error fetching response from server.");
      setState("idle");
    }
  };

  const getStateText = () => {
    switch (state) {
      case "listening":
        return "Listening...";
      case "processing":
        return "Processing...";
      case "speaking":
        return "Speaking...";
      default:
        return "Hi! How can I help you?";
    }
  };

  const WaveformBars = () => {
    const bars = Array.from({ length: 5 }, (_, i) => {
      const height =
        state === "listening"
          ? Math.max(20, audioLevel * 100 + Math.random() * 30)
          : 20;

      return (
        <div
          key={i}
          className="microphone rounded-full transition-all duration-150 ease-out"
          style={{
            width: "4px",
            height: `${height}px`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      );
    });

    return (
      <div className="flex items-center justify-center space-x-1 h-16">
        {bars}
      </div>
    );
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <MicOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Voice Recognition Not Supported
          </h2>
          <p className="text-gray-500">
            Your browser doesn't support voice recognition. Please try Chrome or
            Edge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="flex items-center justify-center mb-3">
            <img className="w-8 h-8 mr-2 lc-logo" alt="Bot Logo" src={logo} />
            <h1 className="text-2xl font-bold lc-texth1">
              MyLeisureCare Assistant
            </h1>
          </div>

          <h1 className="text-2xl font-light text-gray-800 mb-8">
            {getStateText()}
          </h1>

          {state === "listening" && (
            <div className="mb-8">
              <WaveformBars />
            </div>
          )}

          <div className="mb-8">
            <button
              onClick={state === "listening" ? stopListening : startListening}
              disabled={state === "processing" || state === "speaking"}
              className={` 
                w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-out
                ${
                  state === "listening"
                    ? "bg-red-500 hover:bg-red-600 shadow-lg scale-110"
                    : state === "processing" || state === "speaking"
                    ? "bg-gray-400 cursor-not-allowed"
                    : "microphone hover:microphone hover:scale-105 shadow-lg hover:shadow-xl"
                }
                ${state === "listening" ? "animate-pulse" : ""}
              `}
            >
              {state === "listening" ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : state === "speaking" ? (
                <Volume2 className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
          </div>

          {state === "listening" && (
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Recording</span>
            </div>
          )}

          {transcript && (
            <div className="mb-6 p-4 bg-gray-50 rounded-2xl">
              <p className="text-sm text-gray-600 mb-1">You said:</p>
              <p className="text-gray-800 font-medium">{transcript}</p>
            </div>
          )}

          {response && (
            <div className="mb-6 p-4 bg-blue-50 rounded-2xl">
              <p className="text-sm text-blue-600 mb-1">Assistant:</p>
              {/* <p className="text-blue-800 font-medium">{response}</p> */}
              <div
                className="text-blue-800 font-medium"
                dangerouslySetInnerHTML={{ __html: response }}
              ></div>
            </div>
          )}

          {state === "idle" && !transcript && !response && (
            <p className="text-gray-500 text-sm">
              Tap the microphone to start speaking
            </p>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-gray-600 text-sm">
            Try: "What services are available?" or "How do I book a guest
            suite?"
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
