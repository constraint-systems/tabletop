import { useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { cropBoxAtom, videoSizeAtom } from "./atoms";
import { CropBoxType } from "./types";

function CropOverlay({
  canvasDisplayPosition,
  canvasDisplaySize,
  videoSize,
  cropBox,
  setCropBox,
}: {
  canvasDisplayPosition: { x: number; y: number };
  canvasDisplaySize: { width: number; height: number };
  videoSize: { width: number; height: number };
  cropBox: CropBoxType;
  setCropBox: (cropBox: CropBoxType) => void;
}) {
  const detectorRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    start: { x: number; y: number };
    current: { x: number; y: number };
    min: { x: number; y: number };
    max: { x: number; y: number };
  }>({
    isDragging: false,
    start: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
    min: { x: 0, y: 0 },
    max: { x: 0, y: 0 },
  });

  useEffect(() => {
    function constrainX(x: number) {
      return Math.min(Math.max(x, 0), canvasDisplaySize.width);
    }
    function constrainY(y: number) {
      return Math.min(Math.max(y, 0), canvasDisplaySize.height);
    }
    if (detectorRef.current) {
      const detector = detectorRef.current;
      const top = detector.getBoundingClientRect().top;
      const drag = dragRef.current;
      const handlePointerDown = (event: PointerEvent) => {
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        if (event.button !== 0) return;
        drag.isDragging = true;
        const x = event.clientX;
        const y = event.clientY - top;
        drag.start = { x, y };
        drag.current = { x, y };
        drag.min = { x, y };
        drag.max = { x, y };
      };
      const handlePointerMove = (event: PointerEvent) => {
        if (drag.isDragging) {
          const x = event.clientX;
          const y = event.clientY - top;
          drag.current = { x, y };
          drag.min = {
            x: Math.min(drag.start.x, drag.current.x),
            y: Math.min(drag.start.y, drag.current.y),
          };
          drag.max = {
            x: Math.max(drag.start.x, drag.current.x),
            y: Math.max(drag.start.y, drag.current.y),
          };
          const constrainedMinX = constrainX(
            drag.min.x - canvasDisplayPosition.x,
          );
          const constrainedMinY = constrainY(
            drag.min.y - canvasDisplayPosition.y,
          );
          const constrainedMaxX = constrainX(
            drag.max.x - canvasDisplayPosition.x,
          );
          const constrainedMaxY = constrainY(
            drag.max.y - canvasDisplayPosition.y,
          );
          const minXPercent = constrainedMinX / canvasDisplaySize.width;
          const maxXPercent = constrainedMaxX / canvasDisplaySize.width;
          const minYPercent = constrainedMinY / canvasDisplaySize.height;
          const maxYPercent = constrainedMaxY / canvasDisplaySize.height;
          setCropBox({
            minX: Math.round(minXPercent * videoSize.width),
            minY: Math.round(minYPercent * videoSize.height),
            maxX: Math.round(maxXPercent * videoSize.width),
            maxY: Math.round(maxYPercent * videoSize.height),
          });
        }
      };
      const handlePointerUp = (event: PointerEvent) => {
        (event.target as HTMLElement).releasePointerCapture(event.pointerId);
        drag.isDragging = false;
      };
      detector.addEventListener("pointerdown", handlePointerDown);
      detector.addEventListener("pointermove", handlePointerMove);
      detector.addEventListener("pointerup", handlePointerUp);
      return () => {
        detector.removeEventListener("pointerdown", handlePointerDown);
        detector.removeEventListener("pointermove", handlePointerMove);
        detector.removeEventListener("pointerup", handlePointerUp);
      };
    }
  }, [canvasDisplayPosition, canvasDisplaySize, videoSize]);

  const borderWidth = 2;

  return (
    <>
      <div
        ref={detectorRef}
        className="absolute cursor-crosshair top-0 left-0 w-full h-full"
      ></div>
      <div
        className="absolute top-0 pointer-events-none left-0 w-full h-full"
        style={{
          left: canvasDisplayPosition.x,
          top: canvasDisplayPosition.y,
          width: canvasDisplaySize.width,
          height: canvasDisplaySize.height,
          pointerEvents: "none",
        }}
      >
        {cropBox ? (
          <div
            className="absolute border-[2px] border-blue-500 top-0 pointer-events-none left-0 w-full h-full"
            style={{
              left:
                (cropBox.minX / videoSize.width) * canvasDisplaySize.width -
                borderWidth / 2,
              top:
                (cropBox.minY / videoSize.height) * canvasDisplaySize.height -
                borderWidth / 2,
              width:
                ((cropBox.maxX - cropBox.minX) / videoSize.width) *
                canvasDisplaySize.width +
                borderWidth,
              height:
                ((cropBox.maxY - cropBox.minY) / videoSize.height) *
                canvasDisplaySize.height +
                borderWidth,
              pointerEvents: "none",
            }}
          ></div>
        ) : null}
      </div>
    </>
  );
}

export default CropOverlay;
