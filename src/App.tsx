import { useDevices } from "./hooks/useDevices";
import VideoRenderer from "./VideoRenderer";
import { FlipHorizontal2, FlipVertical2 } from "lucide-react";
import { CropRenderer } from "./CropRenderer";
import { useState, useEffect } from "react";

function App() {
  const {
    devices,
    selectedDeviceIndex,
    setSelectedDeviceIndex,
    stream,
    selectedDeviceLabel,
    cameraSettings,
    setCameraSettings,
  } = useDevices();

  const { videoSize, showCrop, cropBox } = cameraSettings;
  const [showDimensionsModal, setShowDimensionsModal] = useState(false);
  const [dimensionsForm, setDimensionsForm] = useState({
    minX: 0,
    minY: 0,
    width: 0,
    height: 0,
  });

  function setVideoSize({ width, height }: { width: number; height: number }) {
    setCameraSettings((prev) => ({
      ...prev,
      [selectedDeviceLabel]: {
        ...prev[selectedDeviceLabel],
        videoSize: { width, height },
      },
    }));
  }
  function setCropBox(
    cropBox: { minX: number; minY: number; maxX: number; maxY: number } | null,
  ) {
    setCameraSettings((prev) => ({
      ...prev,
      [selectedDeviceLabel]: {
        ...prev[selectedDeviceLabel],
        cropBox,
      },
    }));
  }
  function setShowCrop(showCrop: boolean) {
    setCameraSettings((prev) => ({
      ...prev,
      [selectedDeviceLabel]: {
        ...prev[selectedDeviceLabel],
        showCrop,
      },
    }));
  }
  
  // Handle keyboard shortcuts for moving and resizing the crop box
  useEffect(() => {
    if (!cropBox) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showDimensionsModal) return; // Don't handle keyboard shortcuts when modal is open
      
      // Determine the pixel change amount (1 or 8 pixels)
      const pixelChange = e.shiftKey ? 8 : 1;
      
      if (e.ctrlKey) {
        // CTRL + arrows: resize the crop box
        if (e.key === "ArrowUp") {
          // Decrease height from bottom
          const newMaxY = Math.max(cropBox.minY + 16, cropBox.maxY - pixelChange);
          setCropBox({
            ...cropBox,
            maxY: newMaxY
          });
          e.preventDefault();
        } else if (e.key === "ArrowDown") {
          // Increase height from bottom
          const newMaxY = Math.min(videoSize.height, cropBox.maxY + pixelChange);
          setCropBox({
            ...cropBox,
            maxY: newMaxY
          });
          e.preventDefault();
        } else if (e.key === "ArrowLeft") {
          // Decrease width from right
          const newMaxX = Math.max(cropBox.minX + 16, cropBox.maxX - pixelChange);
          setCropBox({
            ...cropBox,
            maxX: newMaxX
          });
          e.preventDefault();
        } else if (e.key === "ArrowRight") {
          // Increase width from right
          const newMaxX = Math.min(videoSize.width, cropBox.maxX + pixelChange);
          setCropBox({
            ...cropBox,
            maxX: newMaxX
          });
          e.preventDefault();
        }
      } else {
        // Arrow keys only: move the crop box
        const width = cropBox.maxX - cropBox.minX;
        const height = cropBox.maxY - cropBox.minY;
        
        if (e.key === "ArrowUp") {
          // Move up
          const newMinY = Math.max(0, cropBox.minY - pixelChange);
          setCropBox({
            ...cropBox,
            minY: newMinY,
            maxY: newMinY + height
          });
          e.preventDefault();
        } else if (e.key === "ArrowDown") {
          // Move down
          const newMinY = Math.min(videoSize.height - height, cropBox.minY + pixelChange);
          setCropBox({
            ...cropBox,
            minY: newMinY,
            maxY: newMinY + height
          });
          e.preventDefault();
        } else if (e.key === "ArrowLeft") {
          // Move left
          const newMinX = Math.max(0, cropBox.minX - pixelChange);
          setCropBox({
            ...cropBox,
            minX: newMinX,
            maxX: newMinX + width
          });
          e.preventDefault();
        } else if (e.key === "ArrowRight") {
          // Move right
          const newMinX = Math.min(videoSize.width - width, cropBox.minX + pixelChange);
          setCropBox({
            ...cropBox,
            minX: newMinX,
            maxX: newMinX + width
          });
          e.preventDefault();
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cropBox, videoSize, showDimensionsModal]);

  return (
    <div className="flex select-none flex-col w-full h-[100dvh] overflow-hidden grow items-center">
      <div className="w-full">
        <div className="flex">
          <div className="grow">
            {devices.length > 0 ? (
              devices.length > 1 ? (
                <select
                  value={selectedDeviceIndex || ""}
                  onChange={(e) =>
                    setSelectedDeviceIndex(Number(e.target.value))
                  }
                  className="px-3 py-2 bg-neutral-800 focus:outline-none"
                >
                  {devices.map((device, index) => (
                    <option
                      value={index}
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
          <div className="flex">
            <button
              className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 flex justify-center items-center"
              onClick={() => {
                if (selectedDeviceLabel) {
                  setCameraSettings((prev) => ({
                    ...prev,
                    [selectedDeviceLabel]: {
                      ...prev[selectedDeviceLabel],
                      flipHorizontal: !cameraSettings.flipHorizontal,
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
                if (selectedDeviceLabel) {
                  setCameraSettings((prev) => ({
                    ...prev,
                    [selectedDeviceLabel]: {
                      ...prev[selectedDeviceLabel],
                      flipVertical: !cameraSettings.flipVertical,
                    },
                  }));
                }
              }}
            >
              <FlipVertical2 size={14} />
            </button>
          </div>
        </div>
      </div>
      <div className="grow w-full relative">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            opacity: showCrop ? 0 : 1,
            pointerEvents: showCrop ? "none" : "auto",
          }}
        >
          <VideoRenderer
            stream={stream}
            videoSize={videoSize}
            setVideoSize={setVideoSize}
            settings={cameraSettings}
            cropBox={cropBox}
            setCropBox={setCropBox}
          />
        </div>
        {showCrop ? <CropRenderer cropBox={cropBox} /> : null}
      </div>
      <div className="flex justify-between w-full">
        {videoSize.width > 0 ? (
          <div className="px-3 py-2">
            {videoSize.width}x{videoSize.height}
          </div>
        ) : null}
        <div className="flex">
          {cropBox ? (
            <button
              className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700"
              onClick={() => {
                setCropBox(null);
                setShowCrop(false);
              }}
            >
              &times;
            </button>
          ) : null}
          {cropBox ? (
            <div
              className="px-3 py-2 cursor-pointer hover:bg-neutral-900"
              onClick={() => {
                setDimensionsForm({
                  minX: cropBox.minX,
                  minY: cropBox.minY,
                  width: cropBox.maxX - cropBox.minX,
                  height: cropBox.maxY - cropBox.minY,
                });
                setShowDimensionsModal(true);
              }}
            >
              {cropBox.minX},{cropBox.minY}
              {` `}
              {cropBox.maxX - cropBox.minX}x{cropBox.maxY - cropBox.minY}
            </div>
          ) : null}
          {cropBox ? (
            <button
              className={`px-3 py-2 ${showCrop ? "bg-blue-700 hover:bg-blue-600" : "bg-neutral-800 hover:bg-neutral-700"}`}
              onClick={() => setShowCrop(!showCrop)}
            >
              Crop
            </button>
          ) : null}
        </div>
        <button
          className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700"
          onClick={() => {
            const $canvas = (
              showCrop
                ? document.getElementById("crop-canvas")
                : document.getElementById("video-canvas")
            ) as HTMLCanvasElement;
            if ($canvas) {
              const a = document.createElement("a");
              a.href = $canvas.toDataURL("image/jpg");
              const timestamp = new Date().toISOString();
              a.download = `tabletop-${timestamp}.jpg`;
              a.click();
            }
          }}
        >
          Download
        </button>
      </div>

      {showDimensionsModal && cropBox && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowDimensionsModal(false)}
        >
          <div className="bg-neutral-900 p-4 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();

                const minX = Math.max(
                  0,
                  Math.min(
                    dimensionsForm.minX,
                    videoSize.width - dimensionsForm.width,
                  ),
                );
                const minY = Math.max(
                  0,
                  Math.min(
                    dimensionsForm.minY,
                    videoSize.height - dimensionsForm.height,
                  ),
                );
                const width = Math.max(
                  16,
                  Math.min(dimensionsForm.width, videoSize.width - minX),
                );
                const height = Math.max(
                  16,
                  Math.min(dimensionsForm.height, videoSize.height - minY),
                );

                setCropBox({
                  minX,
                  minY,
                  maxX: minX + width,
                  maxY: minY + height,
                });

                setShowDimensionsModal(false);
              }}
            >
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block mb-2">X Position</label>
                  <input
                    type="number"
                    value={dimensionsForm.minX}
                    onChange={(e) =>
                      setDimensionsForm({
                        ...dimensionsForm,
                        minX: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 bg-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block mb-2">Y Position</label>
                  <input
                    type="number"
                    value={dimensionsForm.minY}
                    onChange={(e) =>
                      setDimensionsForm({
                        ...dimensionsForm,
                        minY: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 bg-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block mb-2">Width</label>
                  <input
                    type="number"
                    value={dimensionsForm.width}
                    onChange={(e) =>
                      setDimensionsForm({
                        ...dimensionsForm,
                        width: parseInt(e.target.value) || 16,
                      })
                    }
                    min="16"
                    className="w-full p-2 bg-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block mb-2">Height</label>
                  <input
                    type="number"
                    value={dimensionsForm.height}
                    onChange={(e) =>
                      setDimensionsForm({
                        ...dimensionsForm,
                        height: parseInt(e.target.value) || 16,
                      })
                    }
                    min="16"
                    className="w-full p-2 bg-neutral-800 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDimensionsModal(false)}
                  className="px-4 py-2 hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
