import { cameraSettingsType } from "./types";
import { atomWithStorage } from "jotai/utils";

export const cameraSettingsAtom = atomWithStorage<
  Record<string, cameraSettingsType>
>("camera-settings", {});
