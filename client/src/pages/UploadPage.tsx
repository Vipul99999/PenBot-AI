import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { notesApi } from '@/api/notes';
import { Card } from '@/components/ui/Card';

export function UploadPage() {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'application/pdf': ['.pdf'] },
    onDrop: async (files) => {
      setMessage('');
      if (!files[0]) return;
      setUploading(true);
      try {
        await notesApi.upload(files[0]);
        setMessage('Upload successful. OCR has been queued.');
      } catch (err: any) {
        setMessage(err?.response?.data?.message || 'Upload failed.');
      } finally {
        setUploading(false);
      }
    }
  });

  return (
    <Card>
      <div {...getRootProps()} className="p-10 text-center cursor-pointer border border-dashed border-slate-500 rounded-xl">
        <input {...getInputProps()} />
        <p className="font-medium">Drag & drop JPG/PNG/PDF here</p>
        <p className="text-sm text-slate-300 mt-2">Max size 20MB</p>
        {uploading ? <p className="mt-3">Uploading...</p> : null}
        {message ? <p className="mt-3 text-emerald-300">{message}</p> : null}
      </div>
    </Card>
  );
}
