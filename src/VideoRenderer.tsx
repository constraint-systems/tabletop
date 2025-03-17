import { useEffect, useRef, useState } from "react";
import { CameraSettingsType, CropBoxType } from "./types";
import CropOverlay from "./CropOverlay";

export function VideoRenderer({
  stream,
  videoSize,
  setVideoSize,
  settings,
  cropBox,
  setCropBox,
}: {
  stream: MediaStream | null;
  videoSize: { width: number; height: number };
  setVideoSize: (size: { width: number; height: number }) => void;
  settings: CameraSettingsType;
  cropBox: CropBoxType;
  setCropBox: (cropBox: CropBoxType) => void;
}) {
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({
    width: 0,
    height: 0,
  });
  const [canvasDisplayPosition, setCanvasDisplayPosition] = useState({
    x: 0,
    y: 0,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        setVideoSize({
          width: videoRef.current!.videoWidth,
          height: videoRef.current!.videoHeight,
        });
        if (canvasRef.current) {
          canvasRef.current.width = videoRef.current!.videoWidth;
          canvasRef.current.height = videoRef.current!.videoHeight;
        }
      };
    }
  }, [stream]);

  const flipHorizontalRef = useRef(settings.flipHorizontal);
  const flipVerticalRef = useRef(settings.flipVertical);
  useEffect(() => {
    flipHorizontalRef.current = settings.flipHorizontal;
    flipVerticalRef.current = settings.flipVertical;
  }, [settings]);

  const animationFrameRef = useRef<number>();
  useEffect(() => {
    const drawToCanvas = () => {
      if (videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.save();
          if (flipHorizontalRef.current) {
            ctx.translate(canvasRef.current.width, 0);
            ctx.scale(-1, 1);
          }
          if (flipVerticalRef.current) {
            ctx.translate(0, canvasRef.current.height);
            ctx.scale(1, -1);
          }
          ctx.drawImage(
            videoRef.current,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );
          ctx.restore();
        }
      }
      requestAnimationFrame(drawToCanvas);
    };
    requestAnimationFrame(drawToCanvas);
    return () => {
      cancelAnimationFrame(animationFrameRef.current!);
    };
  }, [stream]);

  useEffect(() => {
    const handleResize = () => {
      if (videoSize && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        // contain video within container
        const videoAspectRatio = videoSize.width / videoSize.height || 1;
        const containerAspectRatio = containerRect.width / containerRect.height;
        if (videoAspectRatio > containerAspectRatio) {
          setCanvasDisplaySize({
            width: containerRect.width,
            height: containerRect.width / videoAspectRatio,
          });
          setCanvasDisplayPosition({
            x: 0,
            y:
              (containerRect.height - containerRect.width / videoAspectRatio) /
              2,
          });
        } else {
          setCanvasDisplaySize({
            width: containerRect.height * videoAspectRatio,
            height: containerRect.height,
          });
          setCanvasDisplayPosition({
            x:
              (containerRect.width - containerRect.height * videoAspectRatio) /
              2,
            y: 0,
          });
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [videoSize]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <canvas
        ref={canvasRef}
        id="video-canvas"
        className="absolute top-0 left-0 w-full h-full"
        style={{
          left: canvasDisplayPosition.x,
          top: canvasDisplayPosition.y,
          width: canvasDisplaySize.width,
          height: canvasDisplaySize.height,
        }}
      />
      <CropOverlay
        canvasDisplayPosition={canvasDisplayPosition}
        canvasDisplaySize={canvasDisplaySize}
        videoSize={videoSize}
        cropBox={cropBox}
        setCropBox={setCropBox}
      />
    </div>
  );
}

export default VideoRenderer;
