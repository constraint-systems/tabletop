export type CropBoxType = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null;

export type CameraSettingsType = {
  deviceId: string;
  flipHorizontal: boolean;
  flipVertical: boolean;
  videoSize: { width: number; height: number };
  cropBox: CropBoxType;
  showCrop: boolean;
};


