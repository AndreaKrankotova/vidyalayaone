import { Storage } from '@google-cloud/storage';
import config from '../config/config';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

class StorageService {
  private storage: Storage | null = null;
  private bucketName: string | null = null;
  private isLocal = false;
  private localDir: string;

  constructor() {
    try {
      const provider =
        process.env.FILE_STORAGE_PROVIDER ||
        process.env.STORAGE_PROVIDER ||
        'local';

      this.isLocal = provider !== 'gcs';
      this.localDir = path.resolve(__dirname, '../../uploads');

      if (this.isLocal) {
        console.log('[storage] Using LOCAL storage at', this.localDir);
      } else {
        this.storage = new Storage({
          retryOptions: { autoRetry: true, maxRetries: 3, retryDelayMultiplier: 2 },
        });
        this.bucketName = config.googleCloud.bucketName;
        if (!this.bucketName) {
          throw new Error('GOOGLE_CLOUD_BUCKET_NAME environment variable is required');
        }
        this.verifyBucketAccess().catch((e) =>
          console.error('Error verifying bucket access:', e)
        );
        console.log('[storage] Using GCS bucket', this.bucketName);
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw error;
    }
  }

  private async verifyBucketAccess(): Promise<void> {
    if (this.isLocal || !this.storage || !this.bucketName) return;
    const bucket = this.storage.bucket(this.bucketName);
    const [exists] = await bucket.exists();
    if (!exists) {
      console.warn(`Warning: Bucket '${this.bucketName}' does not exist or is not accessible`);
    } else {
      console.log(`Successfully connected to bucket: ${this.bucketName}`);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder?: string
  ): Promise<{ url: string; fileName: string; mimeType: string; size: number }> {
    if (!file?.buffer) throw new Error('Invalid file: file or file buffer is missing');
    if (!file.mimetype) throw new Error('Invalid file: mimetype is missing');

    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const relativePath = folder ? `${folder}/${fileName}` : fileName;

    if (this.isLocal) {
      const fullDir = folder ? path.join(this.localDir, folder) : this.localDir;
      const fullPath = path.join(fullDir, fileName);
      await fs.mkdir(fullDir, { recursive: true });
      await fs.writeFile(fullPath, file.buffer);
      const publicUrl = `file://${fullPath.replace(/\\/g, '/')}`;
      return { url: publicUrl, fileName, mimeType: file.mimetype, size: file.size };
    }

    const bucket = this.storage!.bucket(this.bucketName!);
    const gcsFile = bucket.file(relativePath);
    await gcsFile.save(file.buffer, {
      metadata: { contentType: file.mimetype, cacheControl: 'public, max-age=31536000' },
      resumable: false,
    });
    await gcsFile.makePublic();
    const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${relativePath}`;
    return { url: publicUrl, fileName, mimeType: file.mimetype, size: file.size };
  }

  async deleteFile(fileName: string): Promise<void> {
    if (this.isLocal) {
      const fullPath = path.join(this.localDir, fileName);
      try { await fs.unlink(fullPath); } catch { /* ignore */ }
      console.log(`[storage] Local file deleted: ${fileName}`);
      return;
    }
    const bucket = this.storage!.bucket(this.bucketName!);
    await bucket.file(fileName).delete();
    console.log(`File ${fileName} deleted successfully`);
  }

  async fileExists(fileName: string): Promise<boolean> {
    if (this.isLocal) {
      try { await fs.access(path.join(this.localDir, fileName)); return true; }
      catch { return false; }
    }
    const [exists] = await this.storage!.bucket(this.bucketName!).file(fileName).exists();
    return exists;
  }

  async getFileMetadata(fileName: string) {
    if (this.isLocal) {
      const stat = await fs.stat(path.join(this.localDir, fileName));
      return { size: stat.size, updated: stat.mtime, created: stat.ctime };
    }
    const [metadata] = await this.storage!.bucket(this.bucketName!).file(fileName).getMetadata();
    return metadata;
  }
}

export default new StorageService();
