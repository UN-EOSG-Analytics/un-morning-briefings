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
 * Supports multiple storage backends:
 * - Local file system (for development)
 * - Azure Blob Storage (for production)
 * 
 * Configure via environment variables:
 * - BLOB_STORAGE_TYPE: 'local' or 'azure'
 * - BLOB_STORAGE_PATH: Local storage directory path
 * - AZURE_STORAGE_ACCOUNT: Azure storage account name
 * - AZURE_STORAGE_KEY: Azure storage account key
 * - AZURE_STORAGE_CONTAINER: Azure container name
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
   * @param buffer - File contents as Buffer
   * @param filename - Original filename
   * @param mimeType - MIME type of the file
   * @returns Promise that resolves to upload result with URL
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
    console.log('downloadLocal: Attempting to download from URL:', url);
    const filename = url.replace('/uploads/', '');
    const filePath = path.join(this.localStoragePath, filename);
    console.log('downloadLocal: File path:', filePath);
    console.log('downloadLocal: File exists:', existsSync(filePath));
    
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const buffer = await readFile(filePath);
    console.log('downloadLocal: Successfully read file, size:', buffer.length);
    return buffer;
  }

  private async deleteLocal(url: string): Promise<void> {
    const filename = url.replace('/uploads/', '');
    const filePath = path.join(this.localStoragePath, filename);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  // AWS S3 implementation (placeholder - requires aws-sdk)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async uploadS3(buffer: Buffer, filename: string, mimeType: string): Promise<BlobUploadResult> {
    // TODO: Implement S3 upload
    // const s3 = new AWS.S3();
    // const result = await s3.upload({ Bucket, Key, Body: buffer }).promise();
    throw new Error('S3 upload not implemented. Install aws-sdk and configure.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async downloadS3(_url: string): Promise<Buffer> {
    // TODO: Implement S3 download
    throw new Error('S3 download not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    
    // Ensure container exists (private access)
    await containerClient.createIfNotExists();
    
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async uploadCloudinary(buffer: Buffer, filename: string, mimeType: string): Promise<BlobUploadResult> {
    // TODO: Implement Cloudinary upload
    throw new Error('Cloudinary upload not implemented. Install cloudinary and configure.');
  }

  private async downloadCloudinary(_url: string): Promise<Buffer> {
    // Cloudinary images are served via CDN, download via fetch
    const response = await fetch(_url);
    return Buffer.from(await response.arrayBuffer());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async deleteCloudinary(url: string): Promise<void> {
    // TODO: Implement Cloudinary delete
    throw new Error('Cloudinary delete not implemented.');
  }
}

export const blobStorage = new BlobStorageService();
