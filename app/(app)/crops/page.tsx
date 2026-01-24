"use client";

import { CropSelector } from "@/components/crop-selector";
import { useAppStore } from "@/lib/store/app-store";

export default function CropsPage() {
  const { selectedCrop, setCrop } = useAppStore();

  return (
    <div className="space-y-6">
      <CropSelector selectedCrop={selectedCrop} onCropSelect={setCrop} />
    </div>
  );
}
