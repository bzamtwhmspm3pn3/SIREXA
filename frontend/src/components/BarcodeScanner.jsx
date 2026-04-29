// src/components/BarcodeScanner.jsx
import React, { useEffect, useRef } from 'react';
import Quagga from 'quagga';

const BarcodeScanner = ({ onDetected }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    if (scannerRef.current) {
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: 480,
            height: 320,
            facingMode: "environment"
          }
        },
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "code_93_reader",
            "upc_reader",
            "upc_e_reader",
            "codabar_reader",
            "qr_reader"
          ]
        }
      }, (err) => {
        if (err) {
          console.error(err);
          return;
        }
        Quagga.start();
      });

      Quagga.onDetected((data) => {
        if (data.codeResult && data.codeResult.code) {
          onDetected(data.codeResult.code);
          Quagga.stop();
        }
      });
    }

    return () => {
      Quagga.stop();
    };
  }, [onDetected]);

  return (
    <div className="relative">
      <div ref={scannerRef} className="w-full h-64 bg-black rounded-lg overflow-hidden" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-32 border-2 border-blue-500 rounded-lg" />
      </div>
    </div>
  );
};

export default BarcodeScanner;