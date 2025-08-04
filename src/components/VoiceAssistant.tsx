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

  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

  const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      let voices = speechSynthesis.getVoices();
      if (voices.length) return resolve(voices);
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

    if (SpeechRecognition && !isMobile) {
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
    } else {
      setIsSupported(!!window.MediaRecorder);
    }

    return () => stopAudioVisualization();
  }, []);

  const startMobileRecording = async () => {
    try {
      if (!window.MediaRecorder)
        return alert("Your mobile browser doesn't support audio recording.");

      setState("listening");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = async () => {
        setState("processing");
        const audioBlob = new Blob(chunks, { type: mimeType });
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");

        try {
          const response = await fetch(
            "https://mylcbotbackend-production.up.railway.app/transcribe",
            {
              method: "POST",
              body: formData,
            }
          );

          const data = await response.json();
          setTranscript(data.transcript || "");
          processQuery(data.transcript || "");
        } catch {
          alert("Transcription failed. Please try again.");
          setState("idle");
        }
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000);
    } catch {
      alert("Microphone access denied.");
      setState("idle");
    }
  };

  const startListening = () => {
    setTranscript("");
    setResponse("");
    if (isMobile) startMobileRecording();
    else if (recognitionRef.current && state === "idle")
      recognitionRef.current.start();
  };

  const stopListening = () => {
    if (!isMobile && recognitionRef.current && state === "listening") {
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

      const cleanText = answer.replace(/<[^>]*>?/gm, "");
      const voices = await loadVoices();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const preferredVoice = voices.find(
        (v) => v.name === "Google US English" && v.lang === "en-US"
      );
      if (preferredVoice) utterance.voice = preferredVoice;

      speechSynthesis.speak(utterance);
      utterance.onend = () => {
        setState("idle");
      };
    } catch {
      setResponse("Error fetching response.");
      setState("idle");
    }
  };

  const startAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current =
        audioContextRef.current.createMediaStreamSource(stream);

      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const update = () => {
        if (analyserRef.current && state === "listening") {
          const dataArray = new Uint8Array(
            analyserRef.current.frequencyBinCount
          );
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(avg / 255);
          animationRef.current = requestAnimationFrame(update);
        }
      };

      update();
    } catch {}
  };

  const stopAudioVisualization = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    setAudioLevel(0);
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
          className="bg-[#25646a] rounded-full transition-all"
          style={{ width: 4, height }}
        />
      );
    });
    return <div className="flex space-x-1 justify-center h-16">{bars}</div>;
  };

  return (
    <div className="from-blue-50 mt-5 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <img className="w-8 h-8 mr-2 lc-logo" alt="Bot Logo" src={logo} />
            <h1 className="text-2xl font-bold lc-texth1">
              MyLeisureCare Assistant
            </h1>
          </div>
          <h1 className="text-2xl font-light mb-4 text-gray-800">
            {getStateText()}
          </h1>

          {state === "listening" && <WaveformBars />}

          <div className="my-6">
            <button
              onClick={state === "listening" ? stopListening : startListening}
              disabled={state === "processing" || state === "speaking"}
              className={`w-20 h-20 rounded-full flex items-center justify-center
                ${
                  state === "listening"
                    ? "bg-red-500"
                    : state === "idle"
                    ? "microphone"
                    : "bg-gray-400"
                }
                transition-all duration-300 shadow-lg`}
            >
              {state === "listening" ? (
                <MicOff className="text-white w-8 h-8" />
              ) : state === "speaking" ? (
                <Volume2 className="text-white w-8 h-8" />
              ) : (
                <Mic className="text-white w-8 h-8" />
              )}
            </button>
          </div>

          {transcript && (
            <p className="text-gray-700 mb-2">
              🗣️ You said: <strong>{transcript}</strong>
            </p>
          )}
          {response && (
            <p className="text-blue-700 ">
              🤖 Assistant:{" "}
              <strong
                className="ai-response"
                dangerouslySetInnerHTML={{ __html: response }}
              ></strong>
            </p>
          )}
          {!transcript && !response && (
            <p className="text-gray-500 text-sm">Tap mic to start speaking</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
