'use client';

import { useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

/**
 * Hook to initialize and switch TensorFlow.js backends on the client.
 * 
 * @param backend 'webgl' (default) or 'wasm'
 */
export function useTfBackend(backend: 'webgl' | 'wasm' = 'webgl') {
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (backend === 'wasm') {
          const wasm = await import('@tensorflow/tfjs-backend-wasm');
          const { setWasmPaths } = wasm;

          // Make sure you copy wasm files to /public/tfjs-wasm
          setWasmPaths('/tfjs-wasm/');

          await tf.setBackend('wasm');
        } else {
          await import('@tensorflow/tfjs-backend-webgl');
          await tf.setBackend('webgl');
        }

        await tf.ready();

        if (mounted) {
          console.log('[TFJS] Backend ready →', tf.getBackend());
        }
      } catch (err) {
        console.error('[TFJS] Failed to initialize backend', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [backend]);
}
