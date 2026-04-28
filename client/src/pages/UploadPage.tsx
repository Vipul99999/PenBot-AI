import { useDropzone } from 'react-dropzone';
import { notesApi } from '@/api/notes';

export function UploadPage() {
  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'application/pdf': ['.pdf'] },
    onDrop: async (files) => {
      if (files[0]) await notesApi.upload(files[0]);
      alert('Uploaded. OCR queued.');
    }
  });

  return <div {...getRootProps()} className="glass p-10 text-center cursor-pointer"><input {...getInputProps()} />Drag & drop JPG/PNG/PDF here</div>;
}
