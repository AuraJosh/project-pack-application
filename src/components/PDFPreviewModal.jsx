import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Use Vite's ?url import to get the path to the worker in node_modules
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker locally
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import { 
  X, ChevronLeft, ChevronRight, Copy, Check, 
  Loader2, Maximize2, Download, ExternalLink, 
  AlertCircle, Link
} from 'lucide-react';
import { useToast } from './ToastProvider';

export default function PDFPreviewModal({ files, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [rendering, setRendering] = useState(true);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const toast = useToast();
  const currentFile = files[currentIndex];

  useEffect(() => {
    if (currentFile) renderPage();
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentFile]);

  const renderPage = async () => {
    setRendering(true);
    setError(null);
    let blobUrl = null;
    try {
      // 1. Fetch file as blob with cache busting to force check new CORS rules
      const cacheBustUrl = `${currentFile.url}&t=${Date.now()}`;
      const response = await fetch(cacheBustUrl, {
        method: 'GET',
        mode: 'cors',
      });
      
      if (!response.ok) {
        if (response.status === 403) throw new Error("403: Security Block (CORS). Update your Firebase CORS policy.");
        throw new Error(`HTTP ${response.status}: Failed to reach file.`);
      }

      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);

      // 2. Render with PDF.js
      const loadingTask = pdfjsLib.getDocument({
        url: blobUrl,
        disableAutoFetch: true,
        disableStream: true
      });
      
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 2.0 }); 
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      setRendering(false);
    } catch (err) {
      console.error("Preview render failed:", err);
      setError(err.message || "Failed to load preview.");
      setRendering(false);
    } finally {
      if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }
  };

  const handleCopyImage = async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.toBlob(async (blob) => {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (err) {
      console.error("Copy failed:", err);
      toast.error("Copy failed. Try right-clicking the image.");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentFile.url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      console.error("Link copy failed:", err);
      toast.error("Failed to copy link.");
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % files.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl h-[90vh] flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
        {/* Top bar */}
        <div className="w-full flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
          <div className="flex flex-col">
            <h3 className="text-white font-bold text-sm truncate max-w-[200px] md:max-w-md" title={currentFile.name}>
              {currentFile.name}
            </h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
              Page 1 Preview • {currentIndex + 1} of {files.length}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                linkCopied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105 active:scale-95'
              }`}
            >
              {linkCopied ? <Check size={14} /> : <Link size={14} />}
              {linkCopied ? 'Link Copied!' : 'Copy Link'}
            </button>
            <button 
              onClick={handleCopyImage}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                copied ? 'bg-emerald-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied to Clipboard!' : 'Copy Page for Word'}
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 w-full relative flex items-center justify-center group">
          {/* Navigation Arrows */}
          <button 
            onClick={handlePrev}
            className="absolute left-0 z-10 p-4 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all opacity-0 group-hover:opacity-100 -translate-x-full md:translate-x-0"
          >
            <ChevronLeft size={48} />
          </button>
          
          <button 
            onClick={handleNext}
            className="absolute right-0 z-10 p-4 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all opacity-0 group-hover:opacity-100 translate-x-full md:translate-x-0"
          >
            <ChevronRight size={48} />
          </button>

          {/* Rendering / Image Container */}
          <div className="relative max-h-full max-w-full overflow-auto bg-white/5 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center min-w-[300px] min-h-[400px]">
            {rendering && (
              <div className="flex flex-col items-center gap-4 text-white/60">
                <Loader2 className="animate-spin" size={40} />
                <p className="text-sm font-medium">Generating HD Preview...</p>
              </div>
            )}
            
            {error && (
              <div className="flex flex-col items-center gap-4 text-rose-500 p-8 text-center">
                <AlertCircle size={40} />
                <p className="text-sm font-medium">{error}</p>
                <a href={currentFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-white bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-all">
                   <ExternalLink size={14} />
                   Open Source PDF
                </a>
              </div>
            )}

            <canvas 
              ref={canvasRef} 
              className={`max-w-full max-h-[70vh] rounded-lg shadow-2xl ${rendering ? 'hidden' : 'block cursor-zoom-in'}`}
              onClick={() => window.open(currentFile.url, '_blank')}
            />
          </div>
        </div>

        {/* Keyboard Hint */}
        <div className="flex items-center gap-6 text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">
           <span className="flex items-center gap-2"><Maximize2 size={12} /> Click to Open</span>
           <span className="flex items-center gap-2"><ArrowLeftRight size={12} className="rotate-0" /> Arrow keys to Navigate</span>
        </div>
      </div>
    </div>
  );
}

function ArrowLeftRight({ size, className }) {
  return (
    <div className={`flex gap-0.5 ${className}`}>
      <ChevronLeft size={size} />
      <ChevronRight size={size} />
    </div>
  );
}
