import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

export interface BlobUploadResult {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Blob Storage Service
 * Supports multiple storage backends (local file system, S3, Azure, Cloudinary, etc.)
 */
class BlobStorageService {
  private storageType: string;
  private localStoragePath: string;
  private azureAccount?: string;
  private azureKey?: string;
  private azureContainer?: string;
  private blobServiceClient?: BlobServiceClient;

  constructor() {
    this.storageType = process.env.BLOB_STORAGE_TYPE || 'local';
    this.localStoragePath = process.env.BLOB_STORAGE_PATH || path.join(process.cwd(), 'uploads');
    
    // Azure configuration
    if (this.storageType === 'azure') {
      this.azureAccount = process.env.AZURE_STORAGE_ACCOUNT;
      this.azureKey = process.env.AZURE_STORAGE_KEY;
      this.azureContainer = process.env.AZURE_STORAGE_CONTAINER || 'morning-briefings';
      
      if (this.azureAccount && this.azureKey) {
        const sharedKeyCredential = new StorageSharedKeyCredential(this.azureAccount, this.azureKey);
        this.blobServiceClient = new BlobServiceClient(
          `https://${this.azureAccount}.blob.core.windows.net`,
          sharedKeyCredential
        );
      }
    }
  }

  /**
   * Upload a blob to storage
   */
  async upload(buffer: Buffer, filename: string, mimeType: string): Promise<BlobUploadResult> {
    switch (this.storageType) {
      case 'local':
        return this.uploadLocal(buffer, filename, mimeType);
      case 's3':
        return this.uploadS3(buffer, filename, mimeType);
      case 'azure':
        return this.uploadAzure(buffer, filename, mimeType);
      case 'cloudinary':
        return this.uploadCloudinary(buffer, filename, mimeType);
      default:
        return this.uploadLocal(buffer, filename, mimeType);
    }
  }

  /**
   * Download a blob from storage
   */
  async download(url: string): Promise<Buffer> {
    switch (this.storageType) {
      case 'local':
        return this.downloadLocal(url);
      case 's3':
        return this.downloadS3(url);
      case 'azure':
        return this.downloadAzure(url);
      case 'cloudinary':
        return this.downloadCloudinary(url);
      default:
        return this.downloadLocal(url);
    }
  }

  /**
   * Delete a blob from storage
   */
  async delete(url: string): Promise<void> {
    switch (this.storageType) {
      case 'local':
        return this.deleteLocal(url);
      case 's3':
        return this.deleteS3(url);
      case 'azure':
        return this.deleteAzure(url);
      case 'cloudinary':
        return this.deleteCloudinary(url);
      default:
        return this.deleteLocal(url);
    }
  }

  // Local file system implementation
  private async uploadLocal(buffer: Buffer, filename: string, mimeType: string): Promise<BlobUploadResult> {
    const timestamp = Date.now();
    const sanitizedFilename = `${timestamp}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(this.localStoragePath, sanitizedFilename);

    // Ensure upload directory exists
    if (!existsSync(this.localStoragePath)) {
      await mkdir(this.localStoragePath, { recursive: true });
    }

    await writeFile(filePath, buffer);

    return {
      url: `/uploads/${sanitizedFilename}`,
      filename: sanitizedFilename,
      mimeType,
      size: buffer.length,
    };
  }

  private async downloadLocal(url: string): Promise<Buffer> {
    const filename = url.replace('/uploads/', '');
    const filePath = path.join(this.localStoragePath, filename);
    return await readFile(filePath);
  }

  private async deleteLocal(url: string): Promise<void> {
    const filename = url.replace('/uploads/', '');
    const filePath = path.join(this.localStoragePath, filename);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  // AWS S3 implementation (placeholder - requires aws-sdk)
  private async uploadS3(buffer: Buffer, filename: string, mimeType: string): Promise<BlobUploadResult> {
    // TODO: Implement S3 upload
    // const s3 = new AWS.S3();
    // const result = await s3.upload({ Bucket, Key, Body: buffer }).promise();
    throw new Error('S3 upload not implemented. Install aws-sdk and configure.');
  }

  private async downloadS3(url: string): Promise<Buffer> {
    // TODO: Implement S3 download
    throw new Error('S3 download not implemented.');
  }

  private async deleteS3(url: string): Promise<void> {
    // TODO: Implement S3 delete
    throw new Error('S3 delete not implemented.');
  }

  // Azure Blob Storage implementation
  private async uploadAzure(buffer: Buffer, filename: string, mimeType: string): Promise<BlobUploadResult> {
    if (!this.blobServiceClient || !this.azureContainer) {
      throw new Error('Azure Blob Storage not configured. Check AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_KEY.');
    }

    const timestamp = Date.now();
    const sanitizedFilename = `${timestamp}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const containerClient = this.blobServiceClient.getContainerClient(this.azureContainer);
    
    // Ensure container exists
    await containerClient.createIfNotExists({ access: 'blob' });
    
    const blockBlobClient = containerClient.getBlockBlobClient(sanitizedFilename);
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: mimeType }
    });

    return {
      url: blockBlobClient.url,
      filename: sanitizedFilename,
      mimeType,
      size: buffer.length,
    };
  }

  private async downloadAzure(url: string): Promise<Buffer> {
    if (!this.blobServiceClient || !this.azureContainer) {
      throw new Error('Azure Blob Storage not configured.');
    }

    // Extract blob name from URL
    // URL format: https://account.blob.core.windows.net/container/blobname
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    // Skip container name (first part) and get blob name
    const blobName = pathParts.slice(1).join('/');
    
    if (!blobName) {
      throw new Error('Invalid blob URL.');
    }

    const containerClient = this.blobServiceClient.getContainerClient(this.azureContainer);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    const downloadResponse = await blockBlobClient.download(0);
    if (!downloadResponse.readableStreamBody) {
      throw new Error('Failed to download blob.');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }
    
    return Buffer.concat(chunks);
  }

  private async deleteAzure(url: string): Promise<void> {
    if (!this.blobServiceClient || !this.azureContainer) {
      throw new Error('Azure Blob Storage not configured.');
    }

    // Extract blob name from URL
    // URL format: https://account.blob.core.windows.net/container/blobname
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    // Skip container name (first part) and get blob name
    const blobName = pathParts.slice(1).join('/');
    
    if (!blobName) {
      throw new Error('Invalid blob URL.');
    }

    const containerClient = this.blobServiceClient.getContainerClient(this.azureContainer);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.deleteIfExists();
  }

  // Cloudinary implementation (placeholder - requires cloudinary)
  private async uploadCloudinary(buffer: Buffer, filename: string, mimeType: string): Promise<BlobUploadResult> {
    // TODO: Implement Cloudinary upload
    throw new Error('Cloudinary upload not implemented. Install cloudinary and configure.');
  }

  private async downloadCloudinary(url: string): Promise<Buffer> {
    // Cloudinary images are served via CDN, download via fetch
    const response = await fetch(url);
    return Buffer.from(await response.arrayBuffer());
  }

  private async deleteCloudinary(url: string): Promise<void> {
    // TODO: Implement Cloudinary delete
    throw new Error('Cloudinary delete not implemented.');
  }
}

export const blobStorage = new BlobStorageService();
