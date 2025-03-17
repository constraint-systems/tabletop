import { CameraSettingsType } from "./types";
import { atomWithStorage } from "jotai/utils";

export const cameraSettingsAtom = atomWithStorage<
  Record<string, CameraSettingsType>
>("camera-settings", {});
