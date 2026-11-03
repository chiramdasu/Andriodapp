import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  FileImage,
  Sparkles,
  Zap,
  X,
  ArrowRight,
  ShieldCheck,
  PenLine,
  AlertTriangle,
  ScanText,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { SAMPLE_RECEIPTS } from '../utils/sampleReceipts';
import { ReceiptData } from '../types/receipt';
import { recognizeReceiptImage } from '../utils/ocr';
import { parseReceiptText, createBlankReceipt, ParsedReceiptDraft } from '../utils/receiptParser';

interface ReceiptUploaderProps {
  onParseStart: () => void;
  onParseSuccess: (receipt: ReceiptData, imageBase64: string) => void;
  onParseError: (err: string) => void;
  isProcessing: boolean;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  onParseStart,
  onParseSuccess,
  onParseError,
  isProcessing,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [ocrFailed, setOcrFailed] = useState(false);
  const [failedImage, setFailedImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const toReceiptData = (draft: ParsedReceiptDraft, imageBase64: string): ReceiptData => {
    const { ocrText, ...rest } = draft;
    return {
      ...rest,
      storeName: rest.storeName || 'Unknown Store',
      id: `rcpt-${Date.now()}`,
      createdAt: new Date().toISOString(),
      imageUrl: imageBase64 || undefined,
      rawNotes: rest.rawNotes,
      items: rest.items.map((it, idx) => ({ ...it, id: it.id || `item-${idx + 1}` })),
    };
  };

  // Fully on-device OCR pipeline: image -> Tesseract OCR -> receipt parser.
  // No server, no API key, works offline.
  const processReceiptImage = async (base64Data: string) => {
    onParseStart();
    setOcrFailed(false);
    setProgress(0);
    try {
      setProcessingStage('Loading on-device OCR engine…');
      const { text, confidence } = await recognizeReceiptImage(base64Data, (p) => {
        setProgress(Math.round(p.progress * 100));
        setProcessingStage(
          p.status === 'recognizing text'
            ? 'Reading receipt text (on-device OCR)…'
            : 'Loading on-device OCR engine…'
        );
      });

      setProcessingStage('Parsing store, date, items & warranty terms…');
      const draft = parseReceiptText(text, confidence);

      if (!draft.items.length && draft.totalAmount === 0 && draft.storeName === 'Unknown Store') {
        throw new Error(
          'OCR finished but no receipt details could be read. Try a clearer, well-lit photo — or enter the receipt manually.'
        );
      }

      onParseSuccess(toReceiptData(draft, base64Data), base64Data);
    } catch (err: any) {
      console.error('On-device OCR error:', err);
      setOcrFailed(true);
      setFailedImage(base64Data);
      onParseError(
        err.message ||
          'Could not extract receipt details on-device. You can review a blank receipt and type the details in manually.'
      );
    } finally {
      setProcessingStage('');
      setProgress(0);
    }
  };

  const handleManualEntry = (imageBase64 = '') => {
    setOcrFailed(false);
    onParseSuccess(toReceiptData(createBlankReceipt(), imageBase64), imageBase64);
  };

  const readFileAsDataUrl = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => processReceiptImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      readFileAsDataUrl(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      readFileAsDataUrl(e.dataTransfer.files[0]);
    }
  };

  // Sample receipts carry pre-parsed data (they are demo fixtures, not OCR).
  const handleSelectSample = (sample: typeof SAMPLE_RECEIPTS[0]) => {
    onParseSuccess(sample.parsedFallback, sample.svgImage);
  };

  // Camera: Capacitor Camera plugin on Android/iOS, getUserMedia on web.
  const startCamera = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await CapCamera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          promptLabelHeader: 'Scan Receipt',
          promptLabelPhoto: 'From Gallery',
          promptLabelPicture: 'Take Photo',
        });
        if (photo.dataUrl) {
          processReceiptImage(photo.dataUrl);
        }
      } catch (err) {
        // User cancelled or permission denied — stay quiet on cancel.
        console.warn('Native camera cancelled/failed:', err);
      }
      return;
    }

    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please check permissions or upload an image file.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureCameraPhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        stopCamera();
        processReceiptImage(dataUrl);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100/80 text-blue-800 border border-blue-200">
          <ScanText className="w-3.5 h-3.5 text-blue-600" />
          <span>On-Device OCR — 100% Offline, No API Key</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Scan Receipt &amp; Auto-Extract Warranties
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Upload any store receipt image. OCR runs entirely on this device and extracts the
          store, date, total amount, item breakdown, and warranty expiration dates.
        </p>
      </div>

      {/* Camera Modal (web getUserMedia path) */}
      {cameraActive && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl overflow-hidden max-w-md w-full border border-slate-700 shadow-2xl space-y-4 p-4 text-center">
            <div className="flex justify-between items-center text-white">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" /> Snap Receipt Photo
              </h3>
              <button
                onClick={stopCamera}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-8 border-2 border-dashed border-blue-400/60 rounded-lg pointer-events-none flex items-center justify-center">
                <span className="text-xs text-blue-200 bg-slate-900/60 px-2 py-1 rounded-md backdrop-blur-xs">
                  Align receipt within frame
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={stopCamera}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-medium text-xs hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={captureCameraPhoto}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" /> Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Upload Area */}
      <div className="max-w-3xl mx-auto">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all bg-white shadow-sm ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
              : 'border-slate-300 hover:border-slate-400'
          } ${isProcessing ? 'pointer-events-none opacity-90' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {isProcessing ? (
            <div className="py-8 space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping opacity-30" />
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-indigo-600 border-l-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                  <ScanText className="w-8 h-8 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Processing Receipt with On-Device OCR
                </h3>
                <p className="text-sm font-medium text-blue-600 animate-pulse">
                  {processingStage || 'Analyzing document...'}
                </p>
                <div className="w-64 max-w-full mx-auto h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {progress}% — Extracting store, purchase date, line items, and warranty
                  expiration dates. Everything happens on this device.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs">
                <Upload className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Drag &amp; drop your receipt image here
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Supports JPEG, PNG, WEBP, and camera photos. Flat, well-lit, straight-on
                  photos produce the best OCR accuracy.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
                >
                  <FileImage className="w-4 h-4" />
                  Browse Receipt File
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Use Camera
                </button>

                <button
                  type="button"
                  onClick={() => handleManualEntry()}
                  className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
                >
                  <PenLine className="w-4 h-4" />
                  Enter Manually
                </button>
              </div>
            </div>
          )}
        </div>

        {/* OCR failure fallback */}
        {ocrFailed && !isProcessing && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-2 flex-1">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">OCR couldn't read that receipt</p>
                <p className="text-xs text-amber-700">
                  Try a sharper, well-lit, straight-on photo — or enter the details manually
                  and keep the photo attached for reference.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleManualEntry(failedImage)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <PenLine className="w-3.5 h-3.5" /> Enter Manually Instead
            </button>
          </div>
        )}
      </div>

      {/* Pre-loaded Sample Receipts */}
      <div className="max-w-4xl mx-auto pt-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Try Sample Receipts
            </h2>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Demo fixtures with pre-parsed data — no receipt photo handy? Start here
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_RECEIPTS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => !isProcessing && handleSelectSample(sample)}
              className="group bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-500/80 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                    {sample.storeName}
                  </span>
                  <span className="text-xs font-semibold text-slate-900">
                    {sample.estimatedTotal}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">
                  {sample.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {sample.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-blue-600 group-hover:text-blue-700">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Auto-detect Warranty
                </span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Offline reassurance strip */}
      <div className="max-w-3xl mx-auto flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <Sparkles className="w-3.5 h-3.5" />
        <span>
          OCR engine (Tesseract) is bundled with the app — receipts never leave your device.
        </span>
      </div>
    </div>
  );
};
