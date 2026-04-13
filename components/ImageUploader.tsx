"use client";

import { useCallback, useState } from "react";

export interface UploadedImage {
  file: File;
  base64: string;
  mediaType: string;
  preview: string;
}

interface Props {
  onImagesChange: (images: UploadedImage[]) => void;
}

export default function ImageUploader({ onImagesChange }: Props) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const newImages: UploadedImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const base64 = await fileToBase64(file);
        newImages.push({
          file,
          base64,
          mediaType: "image/jpeg",
          preview: URL.createObjectURL(file),
        });
      }
      const updated = [...images, ...newImages];
      setImages(updated);
      onImagesChange(updated);
    },
    [images, onImagesChange]
  );

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    onImagesChange(updated);
  };

  const clearAll = () => {
    setImages([]);
    onImagesChange([]);
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          processFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = "image/*";
          input.onchange = () => input.files && processFiles(input.files);
          input.click();
        }}
      >
        <div className="text-4xl mb-2">📷</div>
        <p className="text-gray-600">拖拽图片到此处，或点击上传</p>
        <p className="text-sm text-gray-400 mt-1">
          支持 JPG、PNG 等格式，可多选
        </p>
      </div>

      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              已选择 {images.length} 张图片
            </span>
            <button
              onClick={clearAll}
              className="text-sm text-red-500 hover:text-red-700"
            >
              清空全部
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={img.preview}
                  alt={img.file.name}
                  className="w-full h-24 object-cover rounded-lg border"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  x
                </button>
                <p className="text-xs text-gray-400 truncate mt-1">
                  {img.file.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getExifOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const view = new DataView(e.target!.result as ArrayBuffer);
      // Not a JPEG
      if (view.getUint16(0, false) !== 0xffd8) { resolve(1); return; }
      let offset = 2;
      while (offset < view.byteLength - 2) {
        const marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xffe1) {
          // APP1 (EXIF)
          const length = view.getUint16(offset, false);
          if (view.getUint32(offset + 2, false) !== 0x45786966) { resolve(1); return; } // "Exif"
          const little = view.getUint16(offset + 8, false) === 0x4949;
          const tags = view.getUint16(offset + 16, little);
          for (let i = 0; i < tags; i++) {
            const tagOffset = offset + 18 + i * 12;
            if (tagOffset + 12 > offset + length) break;
            if (view.getUint16(tagOffset, little) === 0x0112) {
              resolve(view.getUint16(tagOffset + 8, little));
              return;
            }
          }
          resolve(1); return;
        } else if ((marker & 0xff00) === 0xff00) {
          offset += view.getUint16(offset, false);
        } else {
          break;
        }
      }
      resolve(1);
    };
    reader.onerror = () => resolve(1);
    reader.readAsArrayBuffer(file.slice(0, 65536));
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    getExifOrientation(file).then((orientation) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1024;
        let w = img.width;
        let h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) {
            h = Math.round((h * MAX) / w);
            w = MAX;
          } else {
            w = Math.round((w * MAX) / h);
            h = MAX;
          }
        }

        // For orientation 5-8, swap canvas dimensions
        const swap = orientation >= 5 && orientation <= 8;
        const canvas = document.createElement("canvas");
        canvas.width = swap ? h : w;
        canvas.height = swap ? w : h;
        const ctx = canvas.getContext("2d")!;

        // Apply rotation/flip based on EXIF orientation
        switch (orientation) {
          case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
          case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
          case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
          case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
          case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
          case 7: ctx.transform(0, -1, -1, 0, h, w); break;
          case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataUrl.split(",")[1]);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  });
}
