// =============================================================================
// useQRScanner
// Shared camera + jsQR decode loop for the QR scanner modal and the
// Scan-to-Pack overlay. Owns the getUserMedia lifecycle so both consumers get
// the same guarantees:
//   - a stream resolved after the scanner closed is stopped, not leaked
//     (closing the modal while the permission prompt is open used to leave
//     the camera running until page reload)
//   - decoding is throttled — jsQR over a full 640x480 frame at display
//     refresh rate pins a phone CPU for no scan-rate benefit
//   - the onCode callback is re-read every invocation, so it always sees
//     current props/state instead of the closures from the render where the
//     camera started
// =============================================================================

import { useRef, useState, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { error as logError } from '../lib/logger.js';

const DECODE_INTERVAL_MS = 100; // ~10 decode attempts/sec

/**
 * @param {Object} options
 * @param {(code: string) => void} options.onCode - Called once per newly seen QR payload.
 * @param {number} [options.rescanAfterMs=2000] - How long before the same payload
 *   fires onCode again (lets a user re-scan after a "not found" or keep bulk-scanning).
 */
export function useQRScanner({ onCode, rescanAfterMs = 2000 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const sessionRef = useRef(0);
  const lastDecodeAtRef = useRef(0);
  const lastCodeRef = useRef(null);
  const rescanTimeoutRef = useRef(null);

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  const stopScanning = useCallback(() => {
    sessionRef.current += 1; // invalidates any in-flight startScanning
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (rescanTimeoutRef.current) clearTimeout(rescanTimeoutRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const scanFrame = useCallback(() => {
    animationRef.current = requestAnimationFrame(scanFrame);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const now = performance.now();
    if (now - lastDecodeAtRef.current < DECODE_INTERVAL_MS) return;
    lastDecodeAtRef.current = now;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (qr && qr.data && qr.data !== lastCodeRef.current) {
      lastCodeRef.current = qr.data;
      if (rescanTimeoutRef.current) clearTimeout(rescanTimeoutRef.current);
      rescanTimeoutRef.current = setTimeout(() => {
        lastCodeRef.current = null;
      }, rescanAfterMs);
      onCodeRef.current(qr.data);
    }
  }, [rescanAfterMs]);

  const startScanning = useCallback(async () => {
    const session = ++sessionRef.current;
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      // The scanner may have been closed (or stopped) while the permission
      // prompt was open — stop the tracks instead of leaking a live camera.
      if (sessionRef.current !== session || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (sessionRef.current !== session) return; // stopped during play(); tracks already stopped
      lastCodeRef.current = null;
      setScanning(true);
      scanFrame();
    } catch (err) {
      if (sessionRef.current !== session) return;
      logError('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera access and try again.'
          : 'Could not access camera. Use manual entry below.',
      );
    }
  }, [scanFrame]);

  // Stop the camera on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return { videoRef, canvasRef, scanning, cameraError, startScanning, stopScanning };
}
