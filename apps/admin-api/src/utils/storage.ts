import path from 'path'
import fs   from 'fs'
import { config } from '../config'

export interface StoredFile {
  fileName:        string
  fileSize:        number
  mimeType:        string
  fileUrl:         string
  storageProvider: 'local' | 'azure'
}

/**
 * Upload a file. Uses local disk by default.
 * To switch to Azure Blob Storage:
 *   1. npm install @azure/storage-blob
 *   2. Set STORAGE_PROVIDER=azure in .env
 *   3. Set AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER
 * No other code changes needed.
 */
export async function uploadFile(
  file: Express.Multer.File,
  folder: string
): Promise<StoredFile> {
  if (config.storage.provider === 'azure') {
    return uploadToAzure(file, folder)
  }
  return uploadToLocal(file, folder)
}

export async function deleteFile(fileUrl: string, storageProvider: string): Promise<void> {
  if (storageProvider === 'local') {
    const filePath = path.join(process.cwd(), fileUrl.replace(/^\//, ''))
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return
  }
  // Azure: TODO when STORAGE_PROVIDER=azure
  // const { BlobServiceClient } = require('@azure/storage-blob')
  // const client = BlobServiceClient.fromConnectionString(config.storage.azure.connectionString)
  // const container = client.getContainerClient(config.storage.azure.container)
  // const blobName = new URL(fileUrl).pathname.split('/').slice(2).join('/')
  // await container.getBlockBlobClient(blobName).delete()
}

// ─── Local disk ───────────────────────────────────────────────────────────────

async function uploadToLocal(
  file: Express.Multer.File,
  folder: string
): Promise<StoredFile> {
  const uploadDir = path.join(process.cwd(), config.storage.uploadDir, folder)
  fs.mkdirSync(uploadDir, { recursive: true })

  const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const fullPath = path.join(uploadDir, safeName)
  fs.writeFileSync(fullPath, file.buffer)

  return {
    fileName:        file.originalname,
    fileSize:        file.size,
    mimeType:        file.mimetype,
    fileUrl:         `/${config.storage.uploadDir}/${folder}/${safeName}`,
    storageProvider: 'local',
  }
}

// ─── Azure Blob (ready to implement) ─────────────────────────────────────────

async function uploadToAzure(
  file: Express.Multer.File,
  folder: string
): Promise<StoredFile> {
  // TODO: uncomment when Azure Blob Storage is configured
  // const { BlobServiceClient } = require('@azure/storage-blob')
  // const client    = BlobServiceClient.fromConnectionString(config.storage.azure.connectionString)
  // const container = client.getContainerClient(config.storage.azure.container)
  // await container.createIfNotExists({ access: 'blob' })
  // const blobName    = `${folder}/${Date.now()}-${file.originalname}`
  // const blobClient  = container.getBlockBlobClient(blobName)
  // await blobClient.uploadData(file.buffer, {
  //   blobHTTPHeaders: { blobContentType: file.mimetype },
  // })
  // return {
  //   fileName: file.originalname, fileSize: file.size,
  //   mimeType: file.mimetype, fileUrl: blobClient.url, storageProvider: 'azure',
  // }
  throw new Error('Azure Blob Storage not yet configured. Set STORAGE_PROVIDER=local in .env')
}