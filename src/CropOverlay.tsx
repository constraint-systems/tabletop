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
  const MIN_CROP_SIZE = 16;
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
  const movingRef = useRef<{
    isMoving: boolean;
    start: { x: number; y: number };
    startingCropBox: CropBoxType;
  }>({
    isMoving: false,
    start: { x: 0, y: 0 },
    startingCropBox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  });
  
  const resizingRef = useRef<{
    isResizing: boolean;
    corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'top' | 'right' | 'bottom' | 'left' | null;
    start: { x: number; y: number };
    startingCropBox: CropBoxType;
  }>({
    isResizing: false,
    corner: null,
    start: { x: 0, y: 0 },
    startingCropBox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
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
        event.preventDefault();
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        if (event.button !== 0) return;

        const x = event.clientX;
        const y = event.clientY - top;
        drag.start = { x, y };
        drag.current = { x, y };
        drag.isDragging = true;
        drag.min = { x, y };
        drag.max = { x, y };
      };
      const handlePointerMove = (event: PointerEvent) => {
        if (drag.isDragging) {
          // Creating/resizing crop box logic
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
        className="absolute touch-none cursor-crosshair top-0 left-0 w-full h-full"
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
            className="absolute pointer-events-auto border-[2px] border-blue-500 top-0 left-0 w-full h-full cursor-move"
            onPointerDown={(e) => {
              if (resizingRef.current.isResizing) return;
              e.preventDefault();
              e.stopPropagation();
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              if (e.button !== 0) return;
              movingRef.current.isMoving = true;
              movingRef.current.start = {
                x: e.clientX,
                y: e.clientY,
              };
              movingRef.current.startingCropBox = { ...cropBox };
            }}
            onPointerMove={(e) => {
              if (resizingRef.current.isResizing) {
                e.preventDefault();
                e.stopPropagation();
                const x = e.clientX;
                const y = e.clientY;
                const dx = x - resizingRef.current.start.x;
                const dy = y - resizingRef.current.start.y;
                const scaledDx = (dx / canvasDisplaySize.width) * videoSize.width;
                const scaledDy = (dy / canvasDisplaySize.height) * videoSize.height;
                
                let newCropBox = { ...resizingRef.current.startingCropBox! };
                
                switch (resizingRef.current.corner) {
                  case 'topLeft':
                    newCropBox.minX = Math.min(
                      Math.max(resizingRef.current.startingCropBox!.minX + scaledDx, 0),
                      resizingRef.current.startingCropBox!.maxX - MIN_CROP_SIZE
                    );
                    newCropBox.minY = Math.min(
                      Math.max(resizingRef.current.startingCropBox!.minY + scaledDy, 0),
                      resizingRef.current.startingCropBox!.maxY - MIN_CROP_SIZE
                    );
                    break;
                  case 'topRight':
                    newCropBox.maxX = Math.min(
                      Math.max(resizingRef.current.startingCropBox!.maxX + scaledDx, resizingRef.current.startingCropBox!.minX + MIN_CROP_SIZE),
                      videoSize.width
                    );
                    newCropBox.minY = Math.min(
                      Math.max(resizingRef.current.startingCropBox!.minY + scaledDy, 0),
                      resizingRef.current.startingCropBox!.maxY - MIN_CROP_SIZE
                    );
                    break;
                  case 'bottomLeft':
                    newCropBox.minX = Math.min(
                      Math.max(resizingRef.current.startingCropBox!.minX + scaledDx, 0),
                      resizingRef.current.startingCropBox!.maxX - MIN_CROP_SIZE
                    );
                    newCropBox.maxY = Math.min(
                      Math.max(resizingRef.current.startingCropBox!.maxY + scaledDy, resizingRef.current.startingCropBox!.minY + MIN_CROP_SIZE),
                      videoSize.height
                    );
                    break;
                  case 'bottomRight':
                    newCropBox.maxX = Math.min(
                      Math.max(resizingRef.current.startingCropBox!.maxX + scaledDx, resizingRef.current.startingCropBox!.minX + MIN_CROP_SIZE),
                      videoSize.width
                    );
                    newCropBox.maxY = Math.min(
                      Math.max(resizingRef.current.startingCropBox!.maxY + scaledDy, resizingRef.current.startingCropBox!.minY + MIN_CROP_SIZE),
                      videoSize.height
                    );
                    break;
                  case 'top':
                    newCropBox.minY = Math.min(
                      Math.max(resizingRef.current.startingCropBox!.minY + scaledDy, 0),
                      resizingRef.current.startingCropBox!.maxY - MIN_CROP_SIZE
                    );
                    break;
                  case 'right':
                    newCropBox.maxX = Math.min(
                      Math.max(resizingRef.current.startingCropBox!.maxX + scaledDx, resizingRef.current.startingCropBox!.minX + MIN_CROP_SIZE),
                      videoSize.width
                    );
                    break;
                  case 'bottom':
                    newCropBox.maxY = Math.min(
                      Math.max(resizingRef.current.startingCropBox!.maxY + scaledDy, resizingRef.current.startingCropBox!.minY + MIN_CROP_SIZE),
                      videoSize.height
                    );
                    break;
                  case 'left':
                    newCropBox.minX = Math.min(
                      Math.max(resizingRef.current.startingCropBox!.minX + scaledDx, 0),
                      resizingRef.current.startingCropBox!.maxX - MIN_CROP_SIZE
                    );
                    break;
                }
                
                setCropBox({
                  minX: Math.round(newCropBox.minX),
                  minY: Math.round(newCropBox.minY),
                  maxX: Math.round(newCropBox.maxX),
                  maxY: Math.round(newCropBox.maxY),
                });
              } else if (movingRef.current.isMoving) {
                e.preventDefault();
                e.stopPropagation();
                const x = e.clientX;
                const y = e.clientY;
                const dx = x - movingRef.current.start.x;
                const dy = y - movingRef.current.start.y;
                const scaledDx =
                  (dx / canvasDisplaySize.width) * videoSize.width;
                const scaledDy =
                  (dy / canvasDisplaySize.height) * videoSize.height;
                let targetMinX =
                  movingRef.current.startingCropBox!.minX + scaledDx;
                let targetMinY =
                  movingRef.current.startingCropBox!.minY + scaledDy;
                let targetMaxX =
                  movingRef.current.startingCropBox!.maxX + scaledDx;
                let targetMaxY =
                  movingRef.current.startingCropBox!.maxY + scaledDy;
                const startingWidth =
                  movingRef.current.startingCropBox!.maxX -
                  movingRef.current.startingCropBox!.minX;
                const startingHeight =
                  movingRef.current.startingCropBox!.maxY -
                  movingRef.current.startingCropBox!.minY;
                // Constrain the crop box to the video size
                if (targetMinX < 0) {
                  targetMinX = 0;
                  targetMaxX = startingWidth;
                }
                if (targetMinY < 0) {
                  targetMinY = 0;
                  targetMaxY = startingHeight;
                }
                if (targetMaxX > videoSize.width) {
                  targetMaxX = videoSize.width;
                  targetMinX = targetMaxX - startingWidth;
                }
                if (targetMaxY > videoSize.height) {
                  targetMaxY = videoSize.height;
                  targetMinY = targetMaxY - startingHeight;
                }
                const newCropBox: CropBoxType = {
                  minX: Math.round(targetMinX),
                  minY: Math.round(targetMinY),
                  maxX: Math.round(targetMaxX),
                  maxY: Math.round(targetMaxY),
                };
                setCropBox(newCropBox);
              }
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              (e.target as HTMLElement).releasePointerCapture(e.pointerId);
              movingRef.current.isMoving = false;
              resizingRef.current.isResizing = false;
              resizingRef.current.corner = null;
            }}
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
            }}
          >
            {/* Top Left Corner */}
            <div 
              className="absolute w-3 h-3 -top-1.5 -left-1.5 cursor-nwse-resize"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                if (e.button !== 0) return;
                resizingRef.current.isResizing = true;
                resizingRef.current.corner = 'topLeft';
                resizingRef.current.start = {
                  x: e.clientX,
                  y: e.clientY,
                };
                resizingRef.current.startingCropBox = { ...cropBox };
              }}
            />
            
            {/* Top Right Corner */}
            <div 
              className="absolute w-3 h-3 -top-1.5 -right-1.5 cursor-nesw-resize"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                if (e.button !== 0) return;
                resizingRef.current.isResizing = true;
                resizingRef.current.corner = 'topRight';
                resizingRef.current.start = {
                  x: e.clientX,
                  y: e.clientY,
                };
                resizingRef.current.startingCropBox = { ...cropBox };
              }}
            />
            
            {/* Bottom Left Corner */}
            <div 
              className="absolute w-3 h-3 -bottom-1.5 -left-1.5 cursor-nesw-resize"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                if (e.button !== 0) return;
                resizingRef.current.isResizing = true;
                resizingRef.current.corner = 'bottomLeft';
                resizingRef.current.start = {
                  x: e.clientX,
                  y: e.clientY,
                };
                resizingRef.current.startingCropBox = { ...cropBox };
              }}
            />
            
            {/* Bottom Right Corner */}
            <div 
              className="absolute w-3 h-3 -bottom-1.5 -right-1.5 cursor-nwse-resize"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                if (e.button !== 0) return;
                resizingRef.current.isResizing = true;
                resizingRef.current.corner = 'bottomRight';
                resizingRef.current.start = {
                  x: e.clientX,
                  y: e.clientY,
                };
                resizingRef.current.startingCropBox = { ...cropBox };
              }}
            />
            
            {/* Top Edge */}
            <div 
              className="absolute h-3 left-0 -top-1.5 right-0 cursor-ns-resize"
              style={{ left: '6px', right: '6px' }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                if (e.button !== 0) return;
                resizingRef.current.isResizing = true;
                resizingRef.current.corner = 'top';
                resizingRef.current.start = {
                  x: e.clientX,
                  y: e.clientY,
                };
                resizingRef.current.startingCropBox = { ...cropBox };
              }}
            />
            
            {/* Right Edge */}
            <div 
              className="absolute w-3 top-0 -right-1.5 bottom-0 cursor-ew-resize"
              style={{ top: '6px', bottom: '6px' }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                if (e.button !== 0) return;
                resizingRef.current.isResizing = true;
                resizingRef.current.corner = 'right';
                resizingRef.current.start = {
                  x: e.clientX,
                  y: e.clientY,
                };
                resizingRef.current.startingCropBox = { ...cropBox };
              }}
            />
            
            {/* Bottom Edge */}
            <div 
              className="absolute h-3 left-0 -bottom-1.5 right-0 cursor-ns-resize"
              style={{ left: '6px', right: '6px' }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                if (e.button !== 0) return;
                resizingRef.current.isResizing = true;
                resizingRef.current.corner = 'bottom';
                resizingRef.current.start = {
                  x: e.clientX,
                  y: e.clientY,
                };
                resizingRef.current.startingCropBox = { ...cropBox };
              }}
            />
            
            {/* Left Edge */}
            <div 
              className="absolute w-3 top-0 -left-1.5 bottom-0 cursor-ew-resize"
              style={{ top: '6px', bottom: '6px' }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                if (e.button !== 0) return;
                resizingRef.current.isResizing = true;
                resizingRef.current.corner = 'left';
                resizingRef.current.start = {
                  x: e.clientX,
                  y: e.clientY,
                };
                resizingRef.current.startingCropBox = { ...cropBox };
              }}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

export default CropOverlay;
