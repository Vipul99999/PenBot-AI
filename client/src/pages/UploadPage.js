import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileImage, FileText, UploadCloud } from 'lucide-react';
import { notesApi } from '@/api/notes';
export function UploadPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [error, setError] = useState('');
    const upload = useMutation({
        mutationFn: (file) => notesApi.upload(file).then((r) => r.data),
        onSuccess: (note) => {
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            navigate(`/dashboard/editor/${note._id}`);
        },
        onError: (err) => setError(err.response?.data?.message || 'Upload failed. Try a smaller JPG, PNG, or PDF.')
    });
    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        multiple: false,
        maxSize: 20 * 1024 * 1024,
        accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'application/pdf': ['.pdf'] },
        onDrop: (files) => {
            setError('');
            if (files[0])
                upload.mutate(files[0]);
        }
    });
    return (_jsxs("div", { className: "mx-auto max-w-4xl space-y-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold uppercase text-brand", children: "Upload" }), _jsx("h2", { className: "mt-1 text-3xl font-black", children: "Add a handwritten note" })] }), _jsxs("div", { ...getRootProps(), className: `surface flex min-h-72 cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 text-center transition sm:min-h-96 sm:p-8 ${isDragActive ? 'border-brand bg-mist' : 'border-ink/15 hover:border-brand/50 hover:bg-white/80'}`, children: [_jsx("input", { ...getInputProps() }), _jsx("div", { className: "grid h-16 w-16 place-items-center rounded-lg bg-brand text-white", children: _jsx(UploadCloud, { size: 30 }) }), _jsx("p", { className: "mt-5 text-2xl font-black", children: upload.isPending ? 'Uploading...' : 'Drop file to upload' }), _jsx("p", { className: "mt-2 max-w-md text-ink/60", children: "JPG, JPEG, PNG, or PDF up to 20 MB." }), _jsxs("div", { className: "mt-6 flex flex-wrap justify-center gap-2", children: [_jsxs("span", { className: "badge bg-mist text-brand", children: [_jsx(FileImage, { size: 14 }), " Images"] }), _jsxs("span", { className: "badge bg-mist text-brand", children: [_jsx(FileText, { size: 14 }), " PDFs"] })] })] }), (error || fileRejections[0]) && (_jsx("div", { className: "surface border-coral/30 bg-coral/10 p-4 font-medium text-coral", children: error || fileRejections[0]?.errors[0]?.message }))] }));
}
