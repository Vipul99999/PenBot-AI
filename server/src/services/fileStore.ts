import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import mongoose, { Types } from 'mongoose';
import { GridFSBucket } from 'mongodb';

type StoredUpload = {
  fileId: Types.ObjectId;
  filename: string;
  mimetype: string;
  size: number;
};

type StoredFile = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
};

function bucket() {
  if (!mongoose.connection.db) throw new Error('MongoDB is not connected');
  return new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
}

function streamToBuffer(stream: NodeJS.ReadableStream) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export function saveUpload(file: Express.Multer.File) {
  return new Promise<StoredUpload>((resolve, reject) => {
    const fileId = new Types.ObjectId();
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    const uploadStream = bucket().openUploadStreamWithId(fileId, filename, {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        uploadedAt: new Date()
      }
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({ fileId, filename, mimetype: file.mimetype, size: file.size });
    });

    Readable.from(file.buffer).pipe(uploadStream);
  });
}

export async function readStoredFile(fileId?: Types.ObjectId | string, fallbackPath?: string): Promise<StoredFile> {
  if (fileId) {
    const objectId = typeof fileId === 'string' ? new Types.ObjectId(fileId) : fileId;
    const files = await bucket().find({ _id: objectId }).toArray();
    const file = files[0];
    if (!file) throw new Error('Uploaded file not found in GridFS');
    const buffer = await streamToBuffer(bucket().openDownloadStream(objectId));
    return {
      buffer,
      filename: file.filename,
      mimetype: file.contentType || 'application/octet-stream',
      size: file.length
    };
  }

  if (fallbackPath) {
    const uploadRoot = path.resolve('uploads');
    const filePath = path.resolve(fallbackPath);
    const isInsideUploads = filePath === uploadRoot || filePath.startsWith(`${uploadRoot}${path.sep}`);
    if (!isInsideUploads) throw new Error('Invalid fallback upload path');
    const buffer = await fs.promises.readFile(filePath);
    return {
      buffer,
      filename: path.basename(filePath),
      mimetype: fallbackPath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png',
      size: buffer.length
    };
  }

  throw new Error('No uploaded file is attached to this note');
}

export function openStoredFileStream(fileId: Types.ObjectId | string) {
  const objectId = typeof fileId === 'string' ? new Types.ObjectId(fileId) : fileId;
  return bucket().openDownloadStream(objectId);
}

export async function deleteStoredFile(fileId?: Types.ObjectId | string) {
  if (!fileId) return;
  const objectId = typeof fileId === 'string' ? new Types.ObjectId(fileId) : fileId;
  try {
    await bucket().delete(objectId);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error;
  }
}
