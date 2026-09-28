import { useState, useRef, useEffect, useCallback } from 'react';
import { convertFloat32ToInt16, convertInt16ToFloat32 } from '@/hooks/audioUtils';
import { CiriVicuData, UploadedFileData } from './useCandidateData';

export type InterviewStatus = 'idle' | 'connecting' | 'active' | 'completed';

export function useInterviewSession(cvData: CiriVicuData | null, uploadedFile: UploadedFileData | null) {
  const [status, setStatus] = useState<InterviewStatus>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const activeCandidateIdRef = useRef<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlaybackTimeRef = useRef<number>(0);

  const endInterview = useCallback(() => {
    setStatus('completed');

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const startInterview = useCallback(async (overrideCandidateId?: string) => {
    if (socketRef.current || status === 'connecting') return;

    try {
      setStatus('connecting');

      const candidateIdToUse = overrideCandidateId || uploadedFile?.id || cvData?.id || null;
      activeCandidateIdRef.current = candidateIdToUse;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      nextPlaybackTimeRef.current = 0;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/interview-stream";
      const fullWsUrl = candidateIdToUse ? `${wsUrl}?candidate_id=${candidateIdToUse}` : wsUrl;

      const socket = new WebSocket(fullWsUrl);
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;

      socket.onopen = async () => {
        setStatus('active');

        const setupPayload: Record<string, unknown> = {
          event: 'setup_context',
          ciriVicuId: candidateIdToUse,
          ciriVicuTitle: cvData?.title || null,
          ciriVicuContent: cvData?.content || null,
        };

        if (uploadedFile) {
          setupPayload.realtimeInput = {
            mediaChunks: [
              {
                mimeType: uploadedFile.mimeType,
                data: uploadedFile.base64Data
              }
            ]
          };
        }

        socket.send(JSON.stringify(setupPayload));

        await audioContext.audioWorklet.addModule('/audio-processor.js');
        const source = audioContext.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

        workletNode.port.onmessage = (event) => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            const int16Data = convertFloat32ToInt16(event.data);
            socketRef.current.send(int16Data.buffer as ArrayBuffer);
          }
        };

        source.connect(workletNode);
      };

      socket.onmessage = async (event) => {
        try {
          const ctx = audioContextRef.current;
          if (!ctx) return;

          if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          if (typeof event.data === 'string') return;

          const arrayBuffer = event.data as ArrayBuffer;
          const float32Data = convertInt16ToFloat32(new Int16Array(arrayBuffer));

          const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
          audioBuffer.getChannelData(0).set(float32Data);

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);

          const startTime = Math.max(ctx.currentTime, nextPlaybackTimeRef.current);
          source.start(startTime);
          nextPlaybackTimeRef.current = startTime + audioBuffer.duration;
        } catch (err) {
          console.error("Błąd odtwarzania audio:", err);
        }
      };

      socket.onerror = (error) => console.error("Błąd WebSocket:", error);
      socket.onclose = () => endInterview();

    } catch (error) {
      console.error("Błąd sprzętu/sieci:", error);
      alert("Wymagany jest dostęp do mikrofonu.");
      setStatus('idle');
    }
  }, [status, cvData, uploadedFile, endInterview]);

  // Przycisk wywołuje tę funkcję w trakcie trwania WebSocketu
  const sendFileContext = useCallback(() => {
    const candidateId = activeCandidateIdRef.current || uploadedFile?.id || cvData?.id;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        event: "send_file_context",
        candidateId: candidateId
      }));
      alert("📄 Wygenerowano turę: Treść CV została wysłana do Agenta AI!");
    } else {
      alert("⚠️ Połączenie WebSocket nie jest aktywne.");
    }
  }, [uploadedFile, cvData]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'active' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && status === 'active') {
      endInterview();
    }
    return () => clearInterval(timer);
  }, [status, timeLeft, endInterview]);

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.close();
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { status, timeLeft, startInterview, endInterview, sendFileContext };
}