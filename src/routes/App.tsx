import { useEffect, useState, useRef } from "react";
import { FlipHorizontal2, FlipVertical2 } from "lucide-react";
import { useAtom } from "jotai";
import { cameraSettingsAtom } from "../atoms";
import { defaultCameraSettings } from "../consts";

function Index() {
  return <WebcamCanvas />;
}

export default Index;

function WebcamCanvas() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCropped, setShowCropped] = useState(false);
  const [videoPosition, setVideoPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [cameraSettings, setCameraSettings] = useAtom(cameraSettingsAtom);
  const { flipHorizontal, flipVertical } = selectedDeviceId
    ? cameraSettings[selectedDeviceId]
    : defaultCameraSettings;
  const [videoSize, setVideoSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [cropBox, setCropBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Get available video devices (webcams)
  useEffect(() => {
    const getCameras = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        const _devices = await navigator.mediaDevices.enumerateDevices();
        let videoDevices = _devices.filter(
          (device) => device.kind === "videoinput",
        );
        setDevices(videoDevices);
        // Auto-select the first available camera
        setSelectedDeviceId(videoDevices[0].deviceId);
        if (videoDevices.length > 0) {
          setCameraSettings((prev) => {
            if (prev[videoDevices[0].deviceId]) {
              return prev;
            } else {
              return {
                ...prev,
                [videoDevices[0].deviceId]: {
                  ...defaultCameraSettings,
                  deviceId: videoDevices[0].deviceId,
                },
              };
            }
          });
        }
      } catch (error) {
        console.error("Error fetching camera devices:", error);
      }
    };

    getCameras();
  }, []);

  // Start video stream when a camera is selected
  useEffect(() => {
    const startStream = async (deviceId: string) => {
      if (!deviceId) return;

      // Stop previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            canvasRef.current!.width = videoRef.current!.videoWidth;
            canvasRef.current!.height = videoRef.current!.videoHeight;
            setVideoSize({
              width: videoRef.current!.videoWidth,
              height: videoRef.current!.videoHeight,
            });
          };
          videoRef.current.play();
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    };

    if (selectedDeviceId) {
      startStream(selectedDeviceId);
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId]);

  const flipHorizontalRef = useRef(flipHorizontal);
  const flipVerticalRef = useRef(flipVertical);
  flipHorizontalRef.current = flipHorizontal;
  flipVerticalRef.current = flipVertical;

  // Draw video frame to canvas
  const animationFrameRef = useRef<number | null>(null);
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
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (containerRef.current && canvasRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        const aspectRatio =
          canvasRef.current!.width / canvasRef.current!.height;
        const containerAspectRatio = width / height;
        let adjustedWidth = width;
        let adjustedHeight = height;
        if (containerAspectRatio > aspectRatio) {
          adjustedWidth = height * aspectRatio;
        } else {
          adjustedHeight = width / aspectRatio;
        }
        const offsetLeft = (width - adjustedWidth) / 2;
        const offsetTop = (height - adjustedHeight) / 2;
        setVideoPosition({
          x: offsetLeft,
          y: offsetTop,
          width: adjustedWidth,
          height: adjustedHeight,
        });
      });
      resizeObserver.observe(containerRef.current);
    }
  }, [canvasRef.current, containerRef.current]);

  function getBoxFromPoints(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
  ) {
    return {
      x: Math.min(p1.x, p2.x),
      y: Math.min(p1.y, p2.y),
      width: Math.max(Math.abs(p1.x - p2.x), 8),
      height: Math.max(Math.abs(p1.y - p2.y), 8),
    };
  }

  const downPosition1Ref = useRef<{ x: number; y: number } | null>(null);
  const downPosition2Ref = useRef<{ x: number; y: number } | null>(null);

  function limitPoint({ x, y }: { x: number; y: number }) {
    return {
      x: Math.max(0, Math.min(x, videoPosition.width)),
      y: Math.max(0, Math.min(y, videoPosition.height)),
    };
  }

  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropAnimationFrameRef = useRef<number | null>(null);
  useEffect(() => {
    function drawCropped() {
      if (cropCanvasRef.current && canvasRef.current) {
        const ctx = cropCanvasRef.current.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            canvasRef.current,
            cropBox!.x * canvasRef.current.width,
            cropBox!.y * canvasRef.current.height,
            cropBox!.width * canvasRef.current.width,
            cropBox!.height * canvasRef.current.height,
            0,
            0,
            cropCanvasRef.current.width,
            cropCanvasRef.current.height,
          );
        }
        requestAnimationFrame(drawCropped);
      }
    }
    if (showCropped) {
      requestAnimationFrame(drawCropped);
    } else {
      cancelAnimationFrame(cropAnimationFrameRef.current!);
    }
  }, [cropBox, showCropped]);

  return (
    <div className="flex flex-col w-full h-[100dvh] grow items-center">
      <div className="w-full">
        <div className="flex">
          <div className="grow">
            {devices.length > 0 ? (
              devices.length > 1 ? (
                <select
                  value={selectedDeviceId || ""}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="px-3 py-2 bg-neutral-800"
                >
                  {devices.map((device) => (
                    <option
                      value={device.deviceId}
                      key={device.deviceId}
                      className="px-3 py-2 bg-neutral-800"
                    >
                      {device.label || `Camera $ {device.deviceId}`}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2">
                  {devices[0].label || `Camera ${devices[0].deviceId}`}
                </div>
              )
            ) : null}
          </div>
          <button
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 flex justify-center items-center"
            onClick={() => {
              if (selectedDeviceId) {
                setCameraSettings((prev) => ({
                  ...prev,
                  [selectedDeviceId]: {
                    ...prev[selectedDeviceId],
                    flipHorizontal: !prev[selectedDeviceId].flipHorizontal,
                  },
                }));
              }
            }}
          >
            <FlipHorizontal2 size={14} />
          </button>
          <button
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 flex justify-center items-center"
            onClick={() => {
              if (selectedDeviceId) {
                setCameraSettings((prev) => ({
                  ...prev,
                  [selectedDeviceId]: {
                    ...prev[selectedDeviceId],
                    flipVertical: !prev[selectedDeviceId].flipVertical,
                  },
                }));
              }
            }}
          >
            <FlipVertical2 size={14} />
          </button>
        </div>
      </div>
      <div ref={containerRef} className="relative grow w-full overflow-hidden">
        <video ref={videoRef} className="hidden" />
        <canvas
          className="absolute"
          ref={cropCanvasRef}
          width={cropBox ? Math.round(cropBox.width * videoSize!.width) : 640}
          height={
            cropBox ? Math.round(cropBox.height * videoSize!.height) : 480
          }
          style={{
            display: showCropped ? "block" : "none",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
        <canvas
          className="absolute cursor-crosshair"
          ref={canvasRef}
          width={640}
          height={480}
          style={{
            display: showCropped ? "none" : "block",
            left: videoPosition.x,
            top: videoPosition.y,
            width: videoPosition.width,
            height: videoPosition.height,
          }}
          onPointerDown={(e) => {
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
            downPosition1Ref.current = limitPoint({
              x: e.nativeEvent.offsetX,
              y: e.nativeEvent.offsetY,
            });
            const box = getBoxFromPoints(
              downPosition1Ref.current,
              limitPoint({
                x: e.nativeEvent.offsetX,
                y: e.nativeEvent.offsetY,
              }),
            );
            setCropBox(box);
          }}
          onPointerMove={(e) => {
            if (downPosition1Ref.current) {
              downPosition2Ref.current = limitPoint({
                x: e.nativeEvent.offsetX,
                y: e.nativeEvent.offsetY,
              });
              const box = getBoxFromPoints(
                downPosition1Ref.current,
                downPosition2Ref.current,
              );
              setCropBox({
                x: box.x / videoPosition.width,
                y: box.y / videoPosition.height,
                width: box.width / videoPosition.width,
                height: box.height / videoPosition.height,
              });
            }
          }}
          onPointerUp={(e) => {
            (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
            downPosition1Ref.current = null;
            downPosition2Ref.current = null;
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            display: showCropped ? "none" : "block",
            left: videoPosition.x,
            top: videoPosition.y,
            width: videoPosition.width,
            height: videoPosition.height,
          }}
        >
          {cropBox ? (
            <div
              className="absolute border-[3px] border-blue-500"
              style={{
                left: Math.round(cropBox.x * videoPosition.width) - 1,
                top: Math.round(cropBox.y * videoPosition.height) - 1,
                width: Math.round(cropBox.width * videoPosition.width) - 2,
                height: Math.round(cropBox.height * videoPosition.height) - 2,
              }}
            ></div>
          ) : null}
        </div>
      </div>
      <div className="flex w-full justify-between">
        <div className="flex">
          {videoSize ? (
            <div className="px-3 py-2">
              {videoSize.width} x {videoSize.height}
            </div>
          ) : null}
        </div>
        <div className="flex">
          {cropBox ? (
            <div className="px-3 py-2">
              {Math.round(cropBox.width * videoSize!.width)} x{" "}
              {Math.round(cropBox.height * videoSize!.height)}
            </div>
          ) : null}

          {cropBox ? (
            <>
              <button
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700"
                onClick={() => setCropBox(null)}
              >
                Clear
              </button>
              <button
                className={`px-3 py-2 ${showCropped ? "bg-blue-600 hover:bg-blue-500" : "bg-neutral-800 hover:bg-neutral-700"}`}
                onClick={() => setShowCropped((prev) => !prev)}
              >
                Crop
              </button>
            </>
          ) : null}
          <button
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700"
            onClick={() => {
              if (canvasRef.current) {
                if (showCropped) {
                  const a = document.createElement("a");
                  a.href = cropCanvasRef.current!.toDataURL("image/png");
                  a.download = "tabletop-" + Date.now() + ".png";
                  a.click();
                } else {
                  const a = document.createElement("a");
                  a.href = canvasRef.current.toDataURL("image/png");
                  a.download = "tabletop-" + Date.now() + ".png";
                  a.click();
                }
              }
            }}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
