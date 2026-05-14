import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Crop, FileImage, FileText, RotateCcw, RotateCw, ScanLine, UploadCloud, Wand2 } from 'lucide-react';
import { notesApi } from '@/api/notes';
import { useAuthStore } from '@/store/authStore';
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = URL.createObjectURL(file);
    });
}
function previewUrlFromFile(file) {
    return file ? URL.createObjectURL(file) : '';
}
async function transformImageFile(file, settings) {
    if (!file.type.startsWith('image/'))
        return file;
    const image = await loadImage(file);
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const cropX = Math.round((settings.left / 100) * sourceWidth);
    const cropY = Math.round((settings.top / 100) * sourceHeight);
    const cropWidth = Math.max(1, Math.round(sourceWidth - cropX - (settings.right / 100) * sourceWidth));
    const cropHeight = Math.max(1, Math.round(sourceHeight - cropY - (settings.bottom / 100) * sourceHeight));
    const normalizedRotation = ((settings.rotation % 360) + 360) % 360;
    const rotated = normalizedRotation === 90 || normalizedRotation === 270;
    const canvas = document.createElement('canvas');
    canvas.width = rotated ? cropHeight : cropWidth;
    canvas.height = rotated ? cropWidth : cropHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return file;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((normalizedRotation * Math.PI) / 180);
    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, -cropWidth / 2, -cropHeight / 2, cropWidth, cropHeight);
    URL.revokeObjectURL(image.src);
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(new File([blob], file.name.replace(/\.(jpe?g|png)$/i, '') + '-edited.png', { type: 'image/png' }));
        }, 'image/png', 0.96);
    });
}
async function analyzeImageQuality(file) {
    if (!file.type.startsWith('image/'))
        return null;
    const image = await loadImage(file);
    const canvas = document.createElement('canvas');
    const maxSide = 900;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx)
        return null;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(image.src);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const gray = [];
    let sum = 0;
    let dark = 0;
    for (let index = 0; index < data.length; index += 4) {
        const value = Math.round(data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114);
        gray.push(value);
        sum += value;
        if (value < 120)
            dark += 1;
    }
    const brightness = sum / gray.length;
    const variance = gray.reduce((total, value) => total + (value - brightness) ** 2, 0) / gray.length;
    const contrast = Math.sqrt(variance);
    let edges = 0;
    for (let y = 1; y < canvas.height - 1; y += 2) {
        for (let x = 1; x < canvas.width - 1; x += 2) {
            const i = y * canvas.width + x;
            edges += Math.abs(gray[i] * 4 - gray[i - 1] - gray[i + 1] - gray[i - canvas.width] - gray[i + canvas.width]);
        }
    }
    const blur = edges / Math.max(1, (canvas.width * canvas.height) / 4);
    const darkRatio = dark / gray.length;
    const suggestions = [];
    if (Math.max(image.width, image.height) < 1400)
        suggestions.push('Move closer or use a higher resolution photo.');
    if (blur < 18)
        suggestions.push('The page looks blurry. Retake with steady focus.');
    if (contrast < 42)
        suggestions.push('Increase contrast or scan under brighter light.');
    if (brightness < 95)
        suggestions.push('The page is dark. Add light before uploading.');
    if (darkRatio < 0.015)
        suggestions.push('Text looks faint or too small. Crop closer to the writing.');
    const score = Math.max(0, Math.min(100, Math.round((Math.min(blur, 42) / 42) * 35 + (Math.min(contrast, 80) / 80) * 35 + (Math.min(Math.max(image.width, image.height), 2200) / 2200) * 30)));
    return {
        score,
        blur: Math.round(blur),
        brightness: Math.round(brightness),
        contrast: Math.round(contrast),
        suggestions: suggestions.length ? suggestions : ['Scan quality looks usable.']
    };
}
function createDemoFile(kind) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1500;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('Canvas unavailable');
    ctx.fillStyle = '#fbfbf4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#d8e0ee';
    ctx.lineWidth = 2;
    for (let y = 140; y < canvas.height; y += 72) {
        ctx.beginPath();
        ctx.moveTo(80, y);
        ctx.lineTo(1120, y);
        ctx.stroke();
    }
    ctx.strokeStyle = '#f0a0ac';
    ctx.beginPath();
    ctx.moveTo(150, 0);
    ctx.lineTo(150, canvas.height);
    ctx.stroke();
    ctx.translate(80, 80);
    ctx.rotate(-0.015);
    ctx.fillStyle = '#21213a';
    ctx.font = '700 54px "Comic Sans MS", "Segoe Print", cursive';
    const samples = {
        network: ['Computer Networks', 'TCP is reliable protocol', '- Packet switching', '- Error control', 'Q: Why TCP uses ACK?', 'A: To confirm delivery of data.'],
        math: ['Quadratic Formula', 'ax^2 + bx + c = 0', 'x = (-b +/- sqrt(b^2 - 4ac)) / 2a', 'Steps:', '- identify a, b, c', '- substitute values'],
        database: ['DBMS Notes', 'Normalization: process to reduce data redundancy', '1. First Normal Form', '2. Second Normal Form', 'SQL is used to query tables.']
    };
    samples[kind].forEach((line, index) => {
        ctx.fillText(line, 90 + (index % 2) * 8, 100 + index * 135);
    });
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(new File([blob], `${kind}-sample-note.png`, { type: 'image/png' }));
        }, 'image/png');
    });
}
export function UploadPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const settings = useAuthStore((s) => s.user?.settings);
    const [ocrMode, setOcrMode] = useState(settings?.ocrMode || 'balanced');
    const [documentTemplate, setDocumentTemplate] = useState(settings?.documentTemplate || 'study_notes');
    const [maxPdfPages, setMaxPdfPages] = useState(settings?.maxPdfPages || 25);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [workingFile, setWorkingFile] = useState(null);
    const [quality, setQuality] = useState(null);
    const [checking, setChecking] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [cropSettings, setCropSettings] = useState({ top: 0, right: 0, bottom: 0, left: 0, rotation: 0 });
    const [activeHandle, setActiveHandle] = useState(null);
    const cropFrameRef = useRef(null);
    const upload = useMutation({
        mutationFn: (file) => notesApi.upload(file, quality, { ocrMode, documentTemplate, maxPdfPages }).then((r) => r.data),
        onSuccess: (note) => {
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            navigate(`/dashboard/editor/${note._id}`);
        },
        onError: (err) => setError(err.response?.data?.message || 'Upload failed. Try a smaller JPG, PNG, or PDF.')
    });
    useEffect(() => () => {
        if (previewUrl)
            URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);
    async function prepareFile(file) {
        setError('');
        setSelectedFile(file);
        setWorkingFile(file);
        setQuality(null);
        setCropSettings({ top: 0, right: 0, bottom: 0, left: 0, rotation: 0 });
        const url = previewUrlFromFile(file);
        setPreviewUrl((oldUrl) => {
            if (oldUrl)
                URL.revokeObjectURL(oldUrl);
            return url;
        });
        setChecking(true);
        try {
            setQuality(await analyzeImageQuality(file));
        }
        catch {
            setQuality(null);
        }
        finally {
            setChecking(false);
        }
    }
    async function applyImageEdits() {
        if (!selectedFile)
            return;
        setChecking(true);
        try {
            const edited = await transformImageFile(selectedFile, cropSettings);
            setWorkingFile(edited);
            setPreviewUrl((oldUrl) => {
                if (oldUrl)
                    URL.revokeObjectURL(oldUrl);
                return previewUrlFromFile(edited);
            });
            setQuality(await analyzeImageQuality(edited));
        }
        catch {
            setError('Could not apply image edits. Try another image.');
        }
        finally {
            setChecking(false);
        }
    }
    function hasImageEdits() {
        return cropSettings.top + cropSettings.right + cropSettings.bottom + cropSettings.left !== 0 || cropSettings.rotation % 360 !== 0;
    }
    async function startConversion() {
        if (!workingFile)
            return;
        if (selectedFile?.type.startsWith('image/') && hasImageEdits()) {
            setChecking(true);
            try {
                const edited = await transformImageFile(selectedFile, cropSettings);
                upload.mutate(edited);
            }
            catch {
                setError('Could not prepare the edited image for upload.');
            }
            finally {
                setChecking(false);
            }
            return;
        }
        upload.mutate(workingFile);
    }
    function updateCrop(key, value) {
        setCropSettings((current) => ({ ...current, [key]: Math.max(0, Math.min(35, value)) }));
    }
    function cropBoxStyle() {
        return {
            left: `${cropSettings.left}%`,
            top: `${cropSettings.top}%`,
            right: `${cropSettings.right}%`,
            bottom: `${cropSettings.bottom}%`
        };
    }
    function pointerToPercent(event) {
        const rect = cropFrameRef.current?.getBoundingClientRect();
        if (!rect)
            return null;
        const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
        return { x, y };
    }
    function dragCrop(event) {
        if (!activeHandle)
            return;
        const point = pointerToPercent(event);
        if (!point)
            return;
        setCropSettings((current) => {
            const leftEdge = current.left;
            const rightEdge = 100 - current.right;
            const topEdge = current.top;
            const bottomEdge = 100 - current.bottom;
            const minSize = 20;
            if (activeHandle === 'move') {
                const width = rightEdge - leftEdge;
                const height = bottomEdge - topEdge;
                const nextLeft = Math.max(0, Math.min(100 - width, point.x - width / 2));
                const nextTop = Math.max(0, Math.min(100 - height, point.y - height / 2));
                return {
                    ...current,
                    left: Math.round(nextLeft),
                    right: Math.round(100 - nextLeft - width),
                    top: Math.round(nextTop),
                    bottom: Math.round(100 - nextTop - height)
                };
            }
            const next = { ...current };
            if (activeHandle.includes('l'))
                next.left = Math.round(Math.max(0, Math.min(point.x, rightEdge - minSize)));
            if (activeHandle.includes('r'))
                next.right = Math.round(Math.max(0, Math.min(100 - point.x, 100 - leftEdge - minSize)));
            if (activeHandle.includes('t'))
                next.top = Math.round(Math.max(0, Math.min(point.y, bottomEdge - minSize)));
            if (activeHandle.includes('b'))
                next.bottom = Math.round(Math.max(0, Math.min(100 - point.y, 100 - topEdge - minSize)));
            return next;
        });
    }
    function startDrag(handle, event) {
        event.preventDefault();
        setActiveHandle(handle);
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    function stopDrag() {
        setActiveHandle(null);
    }
    async function useDemo(kind) {
        const file = await createDemoFile(kind);
        await prepareFile(file);
    }
    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        multiple: false,
        maxSize: 20 * 1024 * 1024,
        accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'application/pdf': ['.pdf'] },
        onDrop: (files) => {
            if (files[0])
                void prepareFile(files[0]);
        }
    });
    return (_jsxs("div", { className: "mx-auto max-w-4xl space-y-6", children: [_jsxs("div", { className: "surface p-5", children: [_jsx("p", { className: "text-sm font-black uppercase text-brand", children: "Upload" }), _jsx("h2", { className: "mt-1 text-3xl font-black text-ink", children: "Add a handwritten note" }), _jsx("p", { className: "mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink/80", children: "Choose a clear scan, image, or PDF. PenBot will convert it into readable digital notes." })] }), _jsxs("div", { className: "surface grid gap-4 p-5 md:grid-cols-3", children: [_jsxs("label", { className: "block", children: [_jsx("span", { className: "text-xs font-black uppercase text-brand", children: "OCR mode" }), _jsxs("select", { className: "field mt-2", value: ocrMode, onChange: (event) => setOcrMode(event.target.value), children: [_jsx("option", { value: "fast", children: "Fast" }), _jsx("option", { value: "balanced", children: "Balanced" }), _jsx("option", { value: "high_accuracy", children: "High accuracy" })] })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "text-xs font-black uppercase text-brand", children: "Document template" }), _jsxs("select", { className: "field mt-2", value: documentTemplate, onChange: (event) => setDocumentTemplate(event.target.value), children: [_jsx("option", { value: "study_notes", children: "Study notes" }), _jsx("option", { value: "lab_report", children: "Lab report" }), _jsx("option", { value: "exam_revision", children: "Exam revision" }), _jsx("option", { value: "formula_sheet", children: "Formula sheet" }), _jsx("option", { value: "qa_worksheet", children: "Q&A worksheet" })] })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "text-xs font-black uppercase text-brand", children: "Max PDF pages" }), _jsx("input", { className: "field mt-2", type: "number", min: "1", max: "100", value: maxPdfPages, onChange: (event) => setMaxPdfPages(Number(event.target.value)) })] })] }), _jsx("div", { className: "grid gap-3 md:grid-cols-3", children: ['network', 'math', 'database'].map((kind) => (_jsxs("button", { onClick: () => void useDemo(kind), className: "surface flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-brand/40", children: [_jsx("span", { className: "grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand text-white", children: _jsx(Wand2, { size: 18 }) }), _jsxs("span", { children: [_jsxs("span", { className: "block font-black capitalize text-ink", children: [kind, " sample"] }), _jsx("span", { className: "text-sm font-semibold text-ink/75", children: "Try demo OCR" })] })] }, kind))) }), _jsxs("div", { ...getRootProps(), className: `surface flex min-h-72 cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 text-center transition sm:min-h-96 sm:p-8 ${isDragActive ? 'border-brand bg-mist' : 'border-ink/25 hover:border-brand hover:bg-white'}`, children: [_jsx("input", { ...getInputProps() }), _jsx("div", { className: "grid h-16 w-16 place-items-center rounded-lg bg-brand text-white", children: _jsx(UploadCloud, { size: 30 }) }), _jsx("p", { className: "mt-5 text-2xl font-black text-ink", children: upload.isPending ? 'Uploading...' : 'Drop file to upload' }), _jsx("p", { className: "mt-2 max-w-md text-base font-semibold text-ink/80", children: "JPG, JPEG, PNG, or PDF up to 20 MB." }), _jsxs("div", { className: "mt-6 flex flex-wrap justify-center gap-2", children: [_jsxs("span", { className: "badge bg-mist text-ink", children: [_jsx(FileImage, { size: 14 }), " Images"] }), _jsxs("span", { className: "badge bg-mist text-ink", children: [_jsx(FileText, { size: 14 }), " PDFs"] })] })] }), selectedFile && (_jsxs("div", { className: "surface p-5", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-black uppercase text-brand", children: "Scan check" }), _jsx("h3", { className: "mt-1 text-xl font-black text-ink", children: selectedFile.name }), _jsx("p", { className: "mt-1 text-sm font-semibold text-ink/75", children: selectedFile.type === 'application/pdf' ? 'PDF selected. First page quality will be improved during OCR.' : checking ? 'Checking image quality...' : 'Review quality before conversion.' })] }), _jsxs("button", { onClick: () => void startConversion(), disabled: upload.isPending || checking || !workingFile, className: "primary-button", children: [_jsx(ScanLine, { size: 18 }), upload.isPending ? 'Starting...' : 'Start conversion'] })] }), selectedFile.type.startsWith('image/') && (_jsxs("div", { className: "mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]", children: [_jsxs("div", { ref: cropFrameRef, className: "relative touch-none overflow-hidden rounded-lg border border-ink/15 bg-ink/5", onPointerMove: dragCrop, onPointerUp: stopDrag, onPointerCancel: stopDrag, onPointerLeave: stopDrag, children: [previewUrl && _jsx("img", { src: previewUrl, alt: "Selected scan preview", className: "max-h-[520px] w-full select-none object-contain", draggable: false }), previewUrl && (_jsxs("div", { className: "absolute inset-0", children: [_jsx("div", { className: "absolute inset-0 bg-ink/35" }), _jsx("div", { className: "absolute cursor-move border-2 border-white bg-white/10 shadow-[0_0_0_9999px_rgba(32,36,44,0.35)]", style: cropBoxStyle(), onPointerDown: (event) => startDrag('move', event), children: [
                                                    ['tl', 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize'],
                                                    ['tr', 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize'],
                                                    ['bl', 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize'],
                                                    ['br', 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize']
                                                ].map(([handle, position]) => (_jsx("button", { type: "button", "aria-label": `Drag ${handle} crop handle`, className: `absolute h-7 w-7 rounded-full border-2 border-white bg-brand shadow-md ${position}`, onPointerDown: (event) => startDrag(handle, event) }, handle))) })] }))] }), _jsxs("div", { className: "rounded-lg border border-ink/15 bg-white p-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Crop, { className: "text-brand", size: 18 }), _jsx("p", { className: "font-black text-ink", children: "Crop and rotate" })] }), _jsx("p", { className: "mt-2 text-sm font-semibold leading-6 text-ink/75", children: "Drag the crop box corners on the image, or use sliders for exact control." }), _jsx("div", { className: "mt-4 space-y-3", children: ['top', 'right', 'bottom', 'left'].map((side) => (_jsxs("label", { className: "block", children: [_jsxs("span", { className: "flex justify-between text-xs font-black uppercase text-ink/75", children: [side, _jsxs("span", { children: [cropSettings[side], "%"] })] }), _jsx("input", { type: "range", min: "0", max: "35", value: cropSettings[side], onChange: (event) => updateCrop(side, Number(event.target.value)), className: "mt-2 w-full accent-brand" })] }, side))) }), _jsxs("div", { className: "mt-4 grid grid-cols-2 gap-2", children: [_jsxs("button", { className: "secondary-button", onClick: () => updateCrop('rotation', cropSettings.rotation - 90), children: [_jsx(RotateCcw, { size: 16 }), "Left"] }), _jsxs("button", { className: "secondary-button", onClick: () => updateCrop('rotation', cropSettings.rotation + 90), children: [_jsx(RotateCw, { size: 16 }), "Right"] })] }), _jsxs("p", { className: "mt-3 text-sm font-semibold text-ink/75", children: ["Rotation: ", ((cropSettings.rotation % 360) + 360) % 360, " degrees"] }), _jsxs("button", { onClick: () => void applyImageEdits(), disabled: checking, className: "primary-button mt-4 w-full", children: [_jsx(Crop, { size: 18 }), "Apply edits"] })] })] })), quality && (_jsxs("div", { className: "mt-4 grid gap-4 lg:grid-cols-[180px_1fr]", children: [_jsxs("div", { className: `rounded-lg border p-4 ${quality.score >= 70 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`, children: [_jsxs("div", { className: "flex items-center gap-2", children: [quality.score >= 70 ? _jsx(CheckCircle2, { className: "text-emerald-700", size: 20 }) : _jsx(AlertTriangle, { className: "text-amber-700", size: 20 }), _jsxs("span", { className: "font-black text-ink", children: [quality.score, "/100"] })] }), _jsx("p", { className: "mt-2 text-sm font-semibold text-ink/75", children: "OCR readiness" })] }), _jsxs("div", { className: "grid gap-2 sm:grid-cols-3", children: [_jsxs("div", { className: "rounded-lg border border-ink/10 bg-white p-3", children: [_jsx("p", { className: "text-xs font-black uppercase text-brand", children: "Focus" }), _jsx("p", { className: "font-black text-ink", children: quality.blur })] }), _jsxs("div", { className: "rounded-lg border border-ink/10 bg-white p-3", children: [_jsx("p", { className: "text-xs font-black uppercase text-brand", children: "Contrast" }), _jsx("p", { className: "font-black text-ink", children: quality.contrast })] }), _jsxs("div", { className: "rounded-lg border border-ink/10 bg-white p-3", children: [_jsx("p", { className: "text-xs font-black uppercase text-brand", children: "Brightness" }), _jsx("p", { className: "font-black text-ink", children: quality.brightness })] })] }), _jsx("div", { className: "lg:col-span-2", children: _jsx("ul", { className: "grid gap-2 text-sm font-semibold text-ink", children: quality.suggestions.map((suggestion) => (_jsxs("li", { className: "flex gap-2 rounded-md bg-white p-3", children: [_jsx(RotateCcw, { size: 16, className: "mt-0.5 shrink-0 text-brand" }), suggestion] }, suggestion))) }) })] }))] })), (error || fileRejections[0]) && (_jsx("div", { className: "surface border-coral/30 bg-coral/10 p-4 font-medium text-coral", children: error || fileRejections[0]?.errors[0]?.message }))] }));
}
