import { useState, useRef, useEffect } from "react";
import { useAtom } from "jotai";
import { cameraSettingsAtom } from "../atoms";
import { defaultCameraSettings } from "../consts";

const preferredDeviceStorageName = "preferredDevice";

export function useDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [cameraSettings, setCameraSettings] = useAtom(cameraSettingsAtom);
  const currentSettings = {
    ...defaultCameraSettings,
    ...cameraSettings[devices[selectedDeviceIndex]?.deviceId],
  };
  const [stream, setStream] = useState<MediaStream | null>(null);

  const selectedDeviceId = devices[selectedDeviceIndex]?.deviceId;

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
            width: { ideal: 1920 },
            height: { ideal: 1080 },
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
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        const devices = await navigator.mediaDevices.enumerateDevices();
        let videoDevices = devices.filter(
          (device) => device.kind === "videoinput",
        );

        // use preferred device if it exists
        // can't count on device id or order being consistent
        const preferredDeviceId = localStorage.getItem(
          preferredDeviceStorageName,
        );
        setDevices(videoDevices);
        if (preferredDeviceId) {
          const preferredDeviceIndex = videoDevices.findIndex(
            (device) => device.deviceId === preferredDeviceId,
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
    stream,
    cameraSettings: currentSettings,
    setCameraSettings,
  };
}
