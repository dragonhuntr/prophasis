import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger as rootLogger } from "@repo/logger";

const logger = rootLogger.child({ pkg: "@repo/r2" });

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

export interface R2Config {
  accessKeyId: string;
  secretAccessKey: string;
  accountId: string;
  bucketName: string;
  endpoint?: string;
}

export class R2Client {
  private s3Client: S3Client;
  private bucketName: string;

  public constructor(config: R2Config) {
    const { accessKeyId, secretAccessKey, accountId, bucketName, endpoint } = config;
    this.bucketName = bucketName;
    const r2Endpoint = endpoint ?? `https://${accountId}.r2.cloudflarestorage.com`;
    this.s3Client = new S3Client({
      region: "auto",
      endpoint: r2Endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  public async generatePresignedUploadUrl(
    filename: string,
    contentType: string,
    maxSizeInBytes?: number,
    options?: { skipPrefix?: boolean },
  ): Promise<{ presignedUrl: string; r2Key: string }> {
    const r2Key = options?.skipPrefix ? filename : `uploads/${crypto.randomUUID()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: r2Key,
      ContentType: contentType,
      ...(maxSizeInBytes && { ContentLength: maxSizeInBytes }),
    });
    try {
      const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 15 * 60 });
      logger.info({ r2Key }, "generated pre-signed upload URL");
      return { presignedUrl, r2Key };
    } catch (error) {
      logger.error({ err: error }, "failed to generate pre-signed URL");
      throw new Error(`Failed to generate R2 pre-signed URL: ${getErrorMessage(error)}`, {
        cause: error,
      });
    }
  }

  public async generatePresignedDownloadUrl(
    r2Key: string,
    options: { ttlSeconds?: number; contentDisposition?: string } = {},
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: r2Key,
        ...(options.contentDisposition
          ? { ResponseContentDisposition: options.contentDisposition }
          : {}),
      });
      return await getSignedUrl(this.s3Client, command, {
        expiresIn: options.ttlSeconds ?? 15 * 60,
      });
    } catch (error) {
      throw new Error(`Failed to generate R2 presigned download URL: ${getErrorMessage(error)}`, {
        cause: error,
      });
    }
  }

  public async getContentType(r2Key: string): Promise<string | null> {
    try {
      const command = new HeadObjectCommand({ Bucket: this.bucketName, Key: r2Key });
      const response = await this.s3Client.send(command);
      return response.ContentType ?? null;
    } catch (error) {
      logger.error({ err: error, r2Key }, "failed to get content type");
      throw new Error(`Failed to get content type from R2: ${getErrorMessage(error)}`, {
        cause: error,
      });
    }
  }

  public async deleteObjects(r2Keys: string[], options?: { strict?: boolean }): Promise<void> {
    const keys = r2Keys.filter(Boolean);
    if (keys.length === 0) return;

    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
          Quiet: true,
        },
      });
      const response = await this.s3Client.send(command);
      const errors = response.Errors ?? [];
      if (errors.length > 0) {
        logger.error(
          { errors, totalKeys: keys.length },
          `failed to delete ${errors.length} of ${keys.length} R2 objects`,
        );
        if (options?.strict) {
          throw new Error(`Failed to delete ${errors.length} of ${keys.length} R2 objects`);
        }
      } else {
        logger.info({ count: keys.length }, "deleted R2 objects");
      }
    } catch (error) {
      logger.error({ err: error }, "failed to delete objects in batch");
      if (options?.strict) {
        throw new Error(`Failed to delete R2 objects: ${getErrorMessage(error)}`, {
          cause: error,
        });
      }
    }
  }

  public async deleteObject(r2Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({ Bucket: this.bucketName, Key: r2Key });
      await this.s3Client.send(command);
      logger.info({ r2Key }, "deleted object");
    } catch (error) {
      logger.error({ err: error, r2Key }, "failed to delete object");
      throw new Error(`Failed to delete R2 object: ${getErrorMessage(error)}`, {
        cause: error,
      });
    }
  }

  public async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const encodedSourceKey = sourceKey
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      const command = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${encodedSourceKey}`,
        Key: destinationKey,
      });
      await this.s3Client.send(command);
    } catch (error) {
      logger.error({ destinationKey, err: error, sourceKey }, "failed to copy object");
      throw new Error(`Failed to copy R2 object: ${getErrorMessage(error)}`, { cause: error });
    }
  }

  public async listObjects(
    prefix?: string,
    maxKeys = 1000,
    continuationToken?: string,
  ): Promise<{
    objects: Array<{ key: string; size: number; lastModified: Date; etag?: string }>;
    isTruncated: boolean;
    nextContinuationToken?: string;
  }> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
      });
      const response = await this.s3Client.send(command);
      const objects = (response.Contents ?? [])
        .filter((obj) => obj.Key != null && obj.LastModified != null)
        .map((obj) => ({
          key: obj.Key as string,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified as Date,
          etag: obj.ETag,
        }));
      return {
        objects,
        isTruncated: response.IsTruncated ?? false,
        nextContinuationToken: response.NextContinuationToken,
      };
    } catch (error) {
      logger.error({ err: error, prefix }, "failed to list objects");
      throw new Error(`Failed to list R2 objects: ${getErrorMessage(error)}`, { cause: error });
    }
  }

  public async uploadData(
    key: string,
    data: Buffer | string,
    contentType = "application/octet-stream",
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: typeof data === "string" ? Buffer.from(data) : data,
        ContentType: contentType,
      });
      await this.s3Client.send(command);
    } catch (error) {
      logger.error({ err: error, key }, "failed to upload data");
      throw new Error(`Failed to upload to R2: ${getErrorMessage(error)}`, { cause: error });
    }
  }

  /**
   * Streams a local file to R2 without buffering it into memory.
   * Switches to multipart upload for files over 10MB.
   */
  public async uploadFromFile(
    key: string,
    filePath: string,
    contentType = "application/octet-stream",
  ): Promise<void> {
    try {
      const fileStats = await stat(filePath);
      const stream = createReadStream(filePath);

      if (fileStats.size > 10 * 1024 * 1024) {
        const upload = new Upload({
          client: this.s3Client,
          params: {
            Bucket: this.bucketName,
            Key: key,
            Body: stream,
            ContentType: contentType,
          },
          partSize: 10 * 1024 * 1024,
          leavePartsOnError: false,
        });
        await upload.done();
      } else {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: stream,
          ContentType: contentType,
        });
        await this.s3Client.send(command);
      }
    } catch (error) {
      logger.error({ err: error, filePath, key }, "failed to upload file");
      throw new Error(`Failed to upload file to R2: ${getErrorMessage(error)}`, {
        cause: error,
      });
    }
  }

  public async downloadData(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
      const response = await this.s3Client.send(command);
      if (!response.Body) throw new Error("No data returned from R2");
      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (error) {
      logger.error({ err: error, key }, "failed to download data");
      throw new Error(`Failed to download from R2: ${getErrorMessage(error)}`, {
        cause: error,
      });
    }
  }
}
