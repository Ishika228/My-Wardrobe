import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Camera,
  Sparkles,
  Check,
  RotateCcw,
  Sliders,
  Eye,
  User,
  ShieldCheck,
  ChevronRight,
  Activity,
  Maximize2,
  Scan,
  RefreshCw,
  Award
} from 'lucide-react';
import {
  analyzeBiometricsFromImage,
  drawBiometricScanOverlay
} from '../services/mediapipeService.js';

export default function PersonalizedAvatarModal({
  isOpen,
  onClose,
  currentProfile,
  onApplyProfile,
  onResetToDemo
}) {
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'camera'
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Manual fine-tuning overrides
  const [manualProfile, setManualProfile] = useState({
    skinColor: '#eac8b0',
    shoulderScale: 1.0,
    hipScale: 1.0,
    headScale: 1.0,
    torsoScale: 1.0
  });

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasOverlayRef = useRef(null);
  const hiddenImgRef = useRef(null);

  // Sync initial profile
  useEffect(() => {
    if (currentProfile) {
      setManualProfile({
        skinColor: currentProfile.skinColor || '#eac8b0',
        shoulderScale: currentProfile.shoulderScale || 1.0,
        hipScale: currentProfile.hipScale || 1.0,
        headScale: currentProfile.headScale?.[0] || 1.0,
        torsoScale: currentProfile.torsoScale?.[0] || 1.0
      });
    }
  }, [currentProfile]);

  // Handle image upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImageSrc(event.target.result);
      processImageForBiometrics(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Process image with MediaPipe
  const processImageForBiometrics = useCallback(async (imageSrc) => {
    setIsAnalyzing(true);
    setErrorMsg(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = async () => {
      try {
        const result = await analyzeBiometricsFromImage(img);
        if (result && result.success) {
          setAnalysisResult(result);
          setManualProfile({
            skinColor: result.avatarProfile.skinColor,
            shoulderScale: result.avatarProfile.shoulderScale,
            hipScale: result.avatarProfile.hipScale,
            headScale: result.avatarProfile.headScale[0],
            torsoScale: result.avatarProfile.torsoScale[0]
          });

          // Draw biometric HUD overlay
          if (canvasOverlayRef.current) {
            drawBiometricScanOverlay(
              canvasOverlayRef.current,
              img,
              result.landmarks,
              result.poseLandmarks
            );
          }
        }
      } catch (err) {
        console.error('Biometric processing failed:', err);
        setErrorMsg('Could not process facial landmarks. Please try a clearer portrait.');
      } finally {
        setIsAnalyzing(false);
      }
    };

    img.onerror = () => {
      setIsAnalyzing(false);
      setErrorMsg('Failed to load image for scanning.');
    };
  }, []);

  // Use pre-loaded fashion demo photo
  const handleUseDemoPhoto = () => {
    const demoPath = '/fashion_lady.png';
    setSelectedImageSrc(demoPath);
    processImageForBiometrics(demoPath);
  };

  // Webcam capture start/stop
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.warn('Webcam error:', err);
      setErrorMsg('Webcam access was denied or is unavailable on this device.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement('canvas');
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext('2d');
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/png');
    stopCamera();
    setSelectedImageSrc(dataUrl);
    processImageForBiometrics(dataUrl);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  // Apply to avatar
  const handleApply = () => {
    const finalProfile = {
      isPersonalized: true,
      skinColor: manualProfile.skinColor,
      skinUndertone: analysisResult?.complexion?.undertone || 'warm',
      melaninTone: analysisResult?.complexion?.melaninTone || 'Natural',
      headScale: [manualProfile.headScale, 1.0, manualProfile.headScale],
      torsoScale: [manualProfile.torsoScale, 1.0, 1.0],
      shoulderScale: manualProfile.shoulderScale,
      hipScale: manualProfile.hipScale,
      legScale: analysisResult?.avatarProfile?.legScale || 1.02,
      morphTargets: analysisResult?.avatarProfile?.morphTargets || {
        mouthSmileLeft: 0.15,
        mouthSmileRight: 0.15
      },
      sourcePhoto: selectedImageSrc
    };

    onApplyProfile(finalProfile);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-4xl bg-neutral-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Mode 2: Personalized Avatar Engine
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <ShieldCheck size={11} />
                  MediaPipe Free AI
                </span>
              </div>
              <p className="text-xs text-white/60">
                Detect 468 face landmarks & body proportions to reshape your 3D avatar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* LEFT: PHOTO SCANNER & PREVIEW */}
          <div className="flex flex-col gap-4">
            
            {/* Input Mode Selector */}
            <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
              <button
                onClick={() => {
                  stopCamera();
                  setActiveTab('upload');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'upload'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Upload size={14} />
                Upload Photo
              </button>
              <button
                onClick={() => {
                  setActiveTab('camera');
                  startCamera();
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'camera'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Camera size={14} />
                Take Selfie
              </button>
            </div>

            {/* Viewport Box */}
            <div className="relative aspect-[3/4] bg-black/60 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center group">
              {/* Webcam Feed */}
              {activeTab === 'camera' && isCameraActive && (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    className="w-full h-full object-cover mirror"
                  />
                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-4 px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
                  >
                    <Camera size={14} />
                    Capture Snapshot
                  </button>
                </div>
              )}

              {/* Upload View / Scan Overlay Canvas */}
              {activeTab === 'upload' && selectedImageSrc && (
                <div className="relative w-full h-full">
                  <canvas
                    ref={canvasOverlayRef}
                    className="w-full h-full object-contain"
                  />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium text-emerald-300 animate-pulse">
                        Scanning 468 Face Mesh Landmarks…
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State */}
              {activeTab === 'upload' && !selectedImageSrc && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-white/5 transition-colors w-full h-full"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  <p className="text-sm font-semibold text-white">Click to Upload Portrait</p>
                  <p className="text-xs text-white/50 mt-1 max-w-[200px]">
                    Front-facing photo with good lighting produces the best biometric alignment
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseDemoPhoto();
                    }}
                    className="mt-4 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white/80 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles size={12} className="text-amber-400" />
                    Or test with Demo Model Portrait
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Error Message */}
            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-lg">
                {errorMsg}
              </p>
            )}

            {/* Re-upload / change button */}
            {selectedImageSrc && activeTab === 'upload' && (
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white/80 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={12} />
                  Upload Different Photo
                </button>
                <button
                  onClick={handleUseDemoPhoto}
                  className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-amber-300/80 flex items-center gap-1.5 transition-colors"
                  title="Test Elena Demo Model Photo"
                >
                  <Sparkles size={12} />
                  Demo Photo
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: BIOMETRIC TELEMETRY & CONTROLS */}
          <div className="flex flex-col gap-4">
            
            {/* Telemetry Card */}
            <div className="p-4 bg-neutral-950/80 border border-white/10 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
                  <Activity size={13} className="text-emerald-400" />
                  Biometric Telemetry Readout
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">
                  {analysisResult ? 'SCAN VERIFIED' : 'AWAITING SCAN'}
                </span>
              </div>

              {analysisResult ? (
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-white/50 block">Face Shape</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {analysisResult.faceMetrics.faceShape}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-white/50 block">Skin Complexion</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                        style={{ backgroundColor: manualProfile.skinColor }}
                      />
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        {manualProfile.skinColor}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-white/50 block">Melanin & Undertone</span>
                    <span className="text-xs font-semibold text-white/90 mt-0.5 block">
                      {analysisResult.complexion.melaninTone} • {analysisResult.complexion.undertone}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-white/50 block">Facial Proportion Ratio</span>
                    <span className="text-xs font-mono text-purple-300 mt-0.5 block">
                      {analysisResult.faceMetrics.aspectRatio} (Jaw/Height)
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-white/50 block">Shoulder Width Scale</span>
                    <span className="text-xs font-mono text-emerald-400 mt-0.5 block">
                      {manualProfile.shoulderScale.toFixed(2)}x
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-white/50 block">Hip Curvature Scale</span>
                    <span className="text-xs font-mono text-pink-400 mt-0.5 block">
                      {manualProfile.hipScale.toFixed(2)}x
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-white/40 text-xs">
                  Upload a photo to see MediaPipe FaceMesh & Pose landmarks telemetry
                </div>
              )}
            </div>

            {/* Fine-Tuning Sliders */}
            <div className="p-4 bg-neutral-950/80 border border-white/10 rounded-xl flex flex-col gap-3">
              <span className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
                <Sliders size={13} className="text-purple-400" />
                Biometric Adjustment Sliders
              </span>

              {/* Skin Tone Color Picker */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-white/70">
                  <span>Custom Skin Tone</span>
                  <span className="font-mono text-white/90 uppercase">{manualProfile.skinColor}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={manualProfile.skinColor}
                    onChange={(e) =>
                      setManualProfile((prev) => ({ ...prev, skinColor: e.target.value }))
                    }
                    className="w-9 h-9 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                  />
                  {/* Preset natural human skin swatches */}
                  <div className="flex items-center gap-1.5">
                    {['#fbe3d5', '#f3cfb3', '#dfb598', '#c68b59', '#8d5524', '#593116'].map(
                      (hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() =>
                            setManualProfile((prev) => ({ ...prev, skinColor: hex }))
                          }
                          className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${
                            manualProfile.skinColor.toLowerCase() === hex.toLowerCase()
                              ? 'border-white scale-110 shadow-md ring-2 ring-purple-500'
                              : 'border-white/20'
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Shoulder Width */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-white/70">
                  <span>Shoulder Breadth</span>
                  <span className="font-mono text-white/90">
                    {manualProfile.shoulderScale.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.25"
                  step="0.01"
                  value={manualProfile.shoulderScale}
                  onChange={(e) =>
                    setManualProfile((prev) => ({
                      ...prev,
                      shoulderScale: parseFloat(e.target.value)
                    }))
                  }
                  className="w-full accent-purple-500 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                />
              </div>

              {/* Hip Width */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-white/70">
                  <span>Hip Curvature</span>
                  <span className="font-mono text-white/90">
                    {manualProfile.hipScale.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.30"
                  step="0.01"
                  value={manualProfile.hipScale}
                  onChange={(e) =>
                    setManualProfile((prev) => ({
                      ...prev,
                      hipScale: parseFloat(e.target.value)
                    }))
                  }
                  className="w-full accent-pink-500 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                />
              </div>

              {/* Head / Jaw Proportion */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-white/70">
                  <span>Head & Jaw Width</span>
                  <span className="font-mono text-white/90">
                    {manualProfile.headScale.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.90"
                  max="1.15"
                  step="0.01"
                  value={manualProfile.headScale}
                  onChange={(e) =>
                    setManualProfile((prev) => ({
                      ...prev,
                      headScale: parseFloat(e.target.value)
                    }))
                  }
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-auto flex gap-3 pt-2">
              <button
                onClick={() => {
                  onResetToDemo();
                  onClose();
                }}
                className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white/70 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw size={14} />
                Reset to Demo Model
              </button>

              <button
                onClick={handleApply}
                className="flex-1 py-3 px-5 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
              >
                <Check size={16} />
                Apply Biometrics to 3D Avatar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

