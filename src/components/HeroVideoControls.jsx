import { useRef, useState, useEffect } from "react";
import { FaVolumeMute, FaVolumeUp, FaPause, FaPlay } from "react-icons/fa";

export default function HeroVideoControls({
  src = "/images/drone video.mp4",
  poster = "/images/IMG_0796.JPG",
  children,
  className = "",
}) {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.muted = muted;
    if (paused) ref.current.pause(); else ref.current.play().catch(()=>{});
  }, [muted, paused]);

  return (
    <section className={`relative h-[90vh] flex items-center justify-center text-center text-white ${className}`}>
      <video
        ref={ref}
        className="absolute inset-0 w-full h-full object-cover"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/90" />

      {/* Controls */}
      <div className="absolute right-4 bottom-4 flex gap-2 z-10">
        <button
          onClick={() => setMuted(m => !m)}
          className="p-2 rounded-full bg-black/60 border border-white/20 hover:bg-black/70"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
        <button
          onClick={() => setPaused(p => !p)}
          className="p-2 rounded-full bg-black/60 border border-white/20 hover:bg-black/70"
          aria-label={paused ? "Play" : "Pause"}
        >
          {paused ? <FaPlay /> : <FaPause />}
        </button>
      </div>

      {/* Your hero content */}
      <div className="relative z-10 px-6">{children}</div>
    </section>
  );
}
