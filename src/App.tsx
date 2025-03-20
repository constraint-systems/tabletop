import { useDevices } from "./hooks/useDevices";
import VideoRenderer from "./VideoRenderer";
import { FlipHorizontal2, FlipVertical2 } from "lucide-react";
import { CropRenderer } from "./CropRenderer";

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

  return (
    <div className="flex flex-col w-full h-[100dvh] overflow-hidden grow items-center">
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
            <div className="px-3 py-2">
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
    </div>
  );
}

export default App;
