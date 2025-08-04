import React, { useState, useEffect, useRef } from "react";

const VideoAssistant = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [aiReply, setAiReply] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log("Recognized:", transcript);
      setSpokenText(transcript);
      setListening(false);
      setIsLoading(true);
      await fetchAIReplyAndGenerateVideo(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setVideoUrl(null);
      setSpokenText("");
      setAiReply("");
      setListening(true);
      recognitionRef.current.start();
    }
  };

  const fetchAIReplyAndGenerateVideo = async (spoken: string) => {
    try {
      const res = await fetch(
        "https://mylcbotbackend-production.up.railway.app/ask",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: spoken }),
        }
      );

      const data = await res.json();
      console.log("Full /ask response:", data);

      const reply = data.answer || data.response || "Sorry, no answer found.";
      setAiReply(reply);

      await generateVideoFromReply(reply);
    } catch (err) {
      console.error("Error communicating with /ask endpoint:", err);
      setAiReply("Error contacting assistant.");
      setIsLoading(false);
    }
  };

  const generateVideoFromReply = async (text: string) => {
    try {
      const apiKey = btoa(
        "ZGl3ZXNoLnNheGVuYUB0aGlua25vYmxlaG91c2UuY29t:Yql73MsFdeXGYvACUBnb1"
      );

      const res = await fetch("https://api.d-id.com/talks", {
        method: "POST",
        headers: {
          Authorization: `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_url: "https://i.postimg.cc/Tw5WHKnn/amy.png",
          script: {
            type: "text",
            input: text,
            provider: {
              type: "microsoft",
              voice_id: "en-US-JennyNeural",
              voice_config: { style: "Cheerful" },
            },
          },
          config: { stitch: true },
        }),
      });

      const talkData = await res.json();
      const talkId = talkData.id;

      const pollForResult = async () => {
        const statusRes = await fetch(`https://api.d-id.com/talks/${talkId}`, {
          headers: { Authorization: `Basic ${apiKey}` },
        });
        const statusData = await statusRes.json();

        if (statusData.status === "done") {
          setVideoUrl(statusData.result_url);
          setIsLoading(false);
        } else {
          setTimeout(pollForResult, 2000);
        }
      };

      pollForResult();
    } catch (err) {
      console.error("Error generating video:", err);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "30px" }}>
      <p className="lc-texth1">🎬 Talk to MyLC Video Assistant</p>

      <button
        className="speak-btn"
        onClick={startListening}
        disabled={listening || isLoading}
      >
        {listening ? "Listening…" : "🎤 Speak"}
      </button>

      {spokenText && (
        <div style={{ marginTop: "20px" }}>
          <strong>You said:</strong> <em>{spokenText}</em>
        </div>
      )}

      {aiReply && (
        <div style={{ marginTop: "10px", padding: "20px 100px" }}>
          <strong>AI replied:</strong>{" "}
          <div dangerouslySetInnerHTML={{ __html: aiReply }}></div>
        </div>
      )}

      {isLoading && (
        <div style={{ marginTop: "20px" }}>
          <p>⏳ Generating video response...</p>
          <div
            className="spinner"
            style={{
              margin: "20px auto",
              width: "40px",
              height: "40px",
              border: "5px solid #ccc",
              borderTop: "5px solid #25646a",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          ></div>
        </div>
      )}

      {videoUrl && (
        <div
          style={{
            marginTop: "30px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <video src={videoUrl} controls autoPlay width="480" height="360" />
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default VideoAssistant;
