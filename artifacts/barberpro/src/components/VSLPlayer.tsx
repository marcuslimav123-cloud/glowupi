import React, { useEffect, useRef, useState, useCallback } from "react";
import { Volume2 } from "lucide-react";
import { apiUrl } from "@/lib/utils";

const VSL_SESSION_KEY = "vsl_session_id";

function getVslSessionId(): string {
  try {
    let id = localStorage.getItem(VSL_SESSION_KEY);
    if (!id) {
      id = `vsl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VSL_SESSION_KEY, id);
    }
    return id;
  } catch {
    return `vsl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function sendVslProgress(sessionId: string, percent: number) {
  try {
    const url = apiUrl("/public/vsl-progress");
    const body = JSON.stringify({ sessionId, percent });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VSLPlayerProps {
  videoId?: string | null;
  videoUrl?: string | null;
  onProgress?: (percent: number) => void;
  allowFullControls?: boolean;
}

let ytApiLoaded = false;
let ytApiCallbacks: Array<() => void> = [];

function loadYTApi(cb: () => void) {
  if (ytApiLoaded && window.YT && window.YT.Player) {
    cb();
    return;
  }
  ytApiCallbacks.push(cb);
  if (document.getElementById("yt-iframe-api")) return;
  const script = document.createElement("script");
  script.id = "yt-iframe-api";
  script.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(script);
  window.onYouTubeIframeAPIReady = () => {
    ytApiLoaded = true;
    ytApiCallbacks.forEach(fn => fn());
    ytApiCallbacks = [];
  };
}

function UnmuteOverlay({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-black/60 border border-white/20 backdrop-blur-sm text-white text-center select-none">
        <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
          <Volume2 className="h-7 w-7 text-white" />
        </div>
        <span className="text-[15px] font-bold">Clique para ativar o som</span>
        <span className="text-[12px] text-white/60">O vídeo está reproduzindo sem som</span>
      </div>
    </div>
  );
}

function BlockingOverlays() {
  return (
    <>
      <div className="absolute top-0 left-0 right-0 h-14 z-10" style={{ pointerEvents: "all", background: "transparent" }} onMouseDown={e => e.preventDefault()} />
      <div className="absolute bottom-0 left-0 right-0 h-14 z-10" style={{ pointerEvents: "all", background: "transparent" }} onMouseDown={e => e.preventDefault()} />
      <div className="absolute top-0 left-0 bottom-0 w-14 z-10" style={{ pointerEvents: "all", background: "transparent" }} onMouseDown={e => e.preventDefault()} />
      <div className="absolute top-0 right-0 bottom-0 w-14 z-10" style={{ pointerEvents: "all", background: "transparent" }} onMouseDown={e => e.preventDefault()} />
    </>
  );
}

function NativeVideoPlayer({ videoUrl, onProgress, allowFullControls }: { videoUrl: string; onProgress?: (p: number) => void; allowFullControls: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxWatchedTimeRef = useRef<number>(0);
  const lastValidTimeRef = useRef<number>(0);
  const [muted, setMuted] = useState(!allowFullControls);
  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(!allowFullControls);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    maxWatchedTimeRef.current = 0;
    lastValidTimeRef.current = 0;
  }, [videoUrl]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const ct = v.currentTime;
    const dur = v.duration || 0;

    if (!allowFullControls) {
      if (ct > maxWatchedTimeRef.current) {
        maxWatchedTimeRef.current = ct;
      }
      lastValidTimeRef.current = ct;
      if (dur > 0 && onProgress) {
        onProgress(Math.min(100, Math.round((maxWatchedTimeRef.current / dur) * 100)));
      }
    } else {
      if (dur > 0 && onProgress) {
        onProgress(Math.min(100, Math.round((ct / dur) * 100)));
      }
    }
  }, [allowFullControls, onProgress]);

  const handleSeeking = useCallback(() => {
    const v = videoRef.current;
    if (!v || allowFullControls) return;
    const target = v.currentTime;
    const maxAllowed = maxWatchedTimeRef.current + 0.75;
    if (target > maxAllowed) {
      v.currentTime = maxWatchedTimeRef.current;
    }
  }, [allowFullControls]);

  const handleRateChange = useCallback(() => {
    const v = videoRef.current;
    if (!v || allowFullControls) return;
    if (v.playbackRate !== 1) v.playbackRate = 1;
  }, [allowFullControls]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!allowFullControls) e.preventDefault();
  }, [allowFullControls]);

  const handleUnmute = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = false;
      v.volume = 1;
      v.play().catch(() => {});
    }
    setMuted(false);
    setShowUnmuteOverlay(false);
  }, []);

  return (
    <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        muted={muted}
        playsInline
        controls={allowFullControls}
        controlsList={allowFullControls ? "nodownload" : "nodownload noplaybackrate"}
        disablePictureInPicture
        onContextMenu={handleContextMenu}
        onTimeUpdate={handleTimeUpdate}
        onSeeking={handleSeeking}
        onRateChange={handleRateChange}
        onLoadedMetadata={() => setReady(true)}
        onCanPlay={() => {
          const v = videoRef.current;
          if (v && v.paused) v.play().catch(() => {});
        }}
        className="w-full h-full"
        style={{ display: "block" }}
      />
      {!allowFullControls && <BlockingOverlays />}
      {showUnmuteOverlay && ready && <UnmuteOverlay onClick={handleUnmute} />}
    </div>
  );
}

function YouTubePlayer({ videoId, onProgress, allowFullControls }: { videoId: string; onProgress?: (p: number) => void; allowFullControls: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const lastValidTimeRef = useRef<number>(0);
  const maxWatchedTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [muted, setMuted] = useState(!allowFullControls);
  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(!allowFullControls);
  const [playerReady, setPlayerReady] = useState(false);
  const playerId = useRef(`yt-player-${Math.random().toString(36).slice(2)}`);
  const sessionIdRef = useRef<string>("");
  const lastPingedBucketRef = useRef<number>(-1);

  const reportProgress = useCallback((percent: number) => {
    if (!allowFullControls) {
      const bucket = Math.floor(percent / 10);
      if (bucket > lastPingedBucketRef.current) {
        lastPingedBucketRef.current = bucket;
        if (!sessionIdRef.current) sessionIdRef.current = getVslSessionId();
        sendVslProgress(sessionIdRef.current, percent);
      }
    }
    if (onProgress) onProgress(percent);
  }, [allowFullControls, onProgress]);

  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== "function") return;
      try {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();

        if (!allowFullControls) {
          const last = lastValidTimeRef.current;
          const forwardJump = currentTime > last + 1.5;
          const backwardJump = currentTime < last - 1.0;

          if ((forwardJump || backwardJump) && !isSeekingRef.current) {
            isSeekingRef.current = true;
            player.seekTo(last, true);
            setTimeout(() => { isSeekingRef.current = false; }, 600);
            return;
          }

          if (!forwardJump && !backwardJump) {
            lastValidTimeRef.current = currentTime;
            if (currentTime > maxWatchedTimeRef.current) {
              maxWatchedTimeRef.current = currentTime;
            }
          }

          if (duration > 0) {
            reportProgress(Math.min(100, Math.round((maxWatchedTimeRef.current / duration) * 100)));
          }
        } else {
          if (duration > 0) {
            reportProgress(Math.min(100, Math.round((currentTime / duration) * 100)));
          }
        }
      } catch {}
    }, 500);
  }, [allowFullControls, reportProgress]);

  useEffect(() => {
    const divId = playerId.current;

    const initPlayer = () => {
      if (!containerRef.current) return;
      const div = document.createElement("div");
      div.id = divId;
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(div);

      lastValidTimeRef.current = 0;
      maxWatchedTimeRef.current = 0;
      isSeekingRef.current = false;

      playerRef.current = new window.YT.Player(divId, {
        videoId,
        playerVars: {
          autoplay: 1,
          mute: allowFullControls ? 0 : 1,
          controls: allowFullControls ? 1 : 0,
          disablekb: allowFullControls ? 0 : 1,
          fs: allowFullControls ? 1 : 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            setPlayerReady(true);
            event.target.playVideo();
            startProgressTracking();
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              startProgressTracking();
            }
          },
        },
      });
    };

    loadYTApi(initPlayer);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      try { playerRef.current?.destroy(); } catch {}
    };
  }, [videoId]);

  const handleUnmute = useCallback(() => {
    try {
      playerRef.current?.unMute();
      playerRef.current?.setVolume(100);
    } catch {}
    setMuted(false);
    setShowUnmuteOverlay(false);
  }, []);

  return (
    <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
      <div ref={containerRef} className="w-full h-full" />
      {!allowFullControls && <BlockingOverlays />}
      {showUnmuteOverlay && playerReady && <UnmuteOverlay onClick={handleUnmute} />}
    </div>
  );
}

export function VSLPlayer({ videoId, videoUrl, onProgress, allowFullControls = false }: VSLPlayerProps) {
  if (videoUrl) {
    return <NativeVideoPlayer videoUrl={videoUrl} onProgress={onProgress} allowFullControls={allowFullControls} />;
  }
  if (videoId) {
    return <YouTubePlayer videoId={videoId} onProgress={onProgress} allowFullControls={allowFullControls} />;
  }
  return null;
}
