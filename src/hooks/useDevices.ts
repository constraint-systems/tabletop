import { useState, useRef, useEffect } from "react";
import { useAtom } from "jotai";
import { cameraSettingsAtom } from "../atoms";
import { defaultCameraSettings, idealResolution } from "../consts";

const preferredDeviceStorageName = "preferredDeviceLabel";

export function useDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [cameraSettings, setCameraSettings] = useAtom(cameraSettingsAtom);
  const currentSettings = {
    ...defaultCameraSettings,
    ...cameraSettings[devices[selectedDeviceIndex]?.label],
  };
  const [stream, setStream] = useState<MediaStream | null>(null);

  const selectedDeviceId = devices[selectedDeviceIndex]?.deviceId;
  const selectedDeviceLabel = devices[selectedDeviceIndex]?.label;

  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;
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
            width: { ideal: idealResolution.width },
          },
        });
        streamRef.current = stream;
        setStream(stream);
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

  useEffect(() => {
    const getCameras = async () => {
      try {
       // Trigger the browser to ask for permission to use the camera
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: idealResolution.width },
          },
        });
        const devices = await navigator.mediaDevices.enumerateDevices();
        let videoDevices = devices.filter(
          (device) => device.kind === "videoinput",
        );

        // use preferred device if it exists
        // can't count on device id or order being consistent
        const preferredDeviceLabel = localStorage.getItem(
          preferredDeviceStorageName,
        );
        setDevices(videoDevices);
        if (preferredDeviceLabel) {
          const preferredDeviceIndex = videoDevices.findIndex(
            (device) => device.label === preferredDeviceLabel,
          );
          if (preferredDeviceIndex !== -1) {
            setSelectedDeviceIndex(preferredDeviceIndex);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    getCameras();
  }, []);

  return {
    devices,
    selectedDeviceIndex,
    setSelectedDeviceIndex,
    selectedDeviceId,
    selectedDeviceLabel,
    stream,
    cameraSettings: currentSettings,
    setCameraSettings,
  };
}
