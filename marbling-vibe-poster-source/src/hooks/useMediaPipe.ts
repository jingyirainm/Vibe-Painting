
import { useEffect, useRef } from 'react';
import { FaceLandmarker, FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export const useMediaPipe = (videoElement: HTMLVideoElement | null, onResults: (faceResults: any, handResults: any) => void, onLoaded?: () => void) => {
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });

        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        if (active) {
          if (onLoaded) onLoaded();
          startDetection();
        }
      } catch (err) {
        console.error("MediaPipe initialization failed:", err);
      }
    };

    const startDetection = () => {
      if (!videoElement || !faceLandmarkerRef.current || !handLandmarkerRef.current) return;

      const detect = () => {
        if (videoElement.readyState >= 2 && active) {
          const now = performance.now();
          const faceResults = faceLandmarkerRef.current?.detectForVideo(videoElement, now);
          const handResults = handLandmarkerRef.current?.detectForVideo(videoElement, now);
          
          // Only trigger if we have data to avoid unnecessary renders
          if ((faceResults && faceResults.faceLandmarks?.length > 0) || 
              (handResults && handResults.landmarks?.length > 0)) {
            onResults(faceResults, handResults);
          }
        }
        requestRef.current = requestAnimationFrame(detect);
      };
      detect();
    };

    init();

    return () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [videoElement]);

  return { faceLandmarker: faceLandmarkerRef.current, handLandmarker: handLandmarkerRef.current };
};
