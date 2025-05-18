import {
  StorageSharedKeyCredential,
  BlobSASPermissions,
  SASProtocol,
  generateBlobSASQueryParameters,
  ContainerClient,
  BlobItem // BlobItemをインポート
} from '@azure/storage-blob';

// これらの値は環境変数から取得することを強く推奨します
const ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;

if (!ACCOUNT_NAME || !ACCOUNT_KEY) {
  console.warn('Azure Storage account name or key is not set. SAS token generation will fail.');
}

const sharedKeyCredential = ACCOUNT_NAME && ACCOUNT_KEY ? new StorageSharedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY) : null;

export function getBlobUrlWithSas(containerClient: ContainerClient, blobName: string): string | null {
  if (!sharedKeyCredential || !containerClient) {
    console.error('Storage credentials or container client not initialized for SAS token generation.');
    // SASなしのURLを返すか、エラーを投げるか、アプリケーションの要件によります。
    // ここでは、SASなしのURLを返しますが、本番環境ではエラー処理を検討してください。
    const blobClient = containerClient ? containerClient.getBlobClient(blobName) : null;
    return blobClient ? blobClient.url : null;
  }

  const sasOptions = {
    containerName: containerClient.containerName,
    blobName: blobName,
    permissions: BlobSASPermissions.parse("r"), // 'r' for read access
    startsOn: new Date(),
    expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hour expiration (adjust as needed)
    protocol: SASProtocol.Https, // Enforce HTTPS
  };

  try {
    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    const blobClient = containerClient.getBlobClient(blobName);
    return `${blobClient.url}?${sasToken}`;
  } catch (error) {
    console.error(`Error generating SAS token for blob ${blobName}:`, error);
    // エラー発生時はSASなしのURLを返すか、nullを返すなどのフォールバック
    const blobClient = containerClient.getBlobClient(blobName);
    return blobClient.url; // フォールバック
  }
}