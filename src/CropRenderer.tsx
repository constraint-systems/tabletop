import { useEffect, useRef, useState } from "react";
import { CropBoxType } from "./types";

export function CropRenderer({ cropBox }: { cropBox: CropBoxType }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({
    width: 0,
    height: 0,
  });
  const [canvasDisplayPosition, setCanvasDisplayPosition] = useState({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const handleResize = () => {
      if (cropBox && containerRef.current) {
        const overlayWidth = cropBox.maxX - cropBox.minX;
        const overlayHeight = cropBox.maxY - cropBox.minY;
        const containerRect = containerRef.current.getBoundingClientRect();
        // contain video within container
        const videoAspectRatio = overlayWidth / overlayHeight;
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
  }, [cropBox]);

  const animationFrameRef = useRef<number>();
  useEffect(() => {
    const drawToCanvas = () => {
      const $videoCanvas = document.getElementById(
        "video-canvas",
      ) as HTMLCanvasElement;
      if ($videoCanvas && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d")!;
        ctx.drawImage(
          $videoCanvas,
          cropBox!.minX,
          cropBox!.minY,
          cropBox!.maxX - cropBox!.minX,
          cropBox!.maxY - cropBox!.minY,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height,
        );
      }
      requestAnimationFrame(drawToCanvas);
    };
    requestAnimationFrame(drawToCanvas);
    return () => {
      cancelAnimationFrame(animationFrameRef.current!);
    };
  }, []);

  return cropBox ? (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        className="absolute"
        id="crop-canvas"
        width={cropBox.maxX - cropBox.minX}
        height={cropBox.maxY - cropBox.minY}
        ref={canvasRef}
        style={{
          left: canvasDisplayPosition.x,
          top: canvasDisplayPosition.y,
          width: canvasDisplaySize.width,
          height: canvasDisplaySize.height,
        }}
      />
    </div>
  ) : null;
}
