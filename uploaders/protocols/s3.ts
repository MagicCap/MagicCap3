import { S3 } from "tiny-s3-uploader";
import { fromBuffer } from "file-type";

export default async (
    accessKeyId: string, secretAccessKey: string,
    endpoint: string, bucketName: string,
    bucketUrl: string, body: Buffer, filename: string
): Promise<string> => {
    if (!endpoint.match(/^https?:\/\//)) endpoint = "https://" + endpoint;
    if (!bucketUrl.match(/^https?:\/\//)) bucketUrl = "https://" + bucketUrl;
    const s3 = new S3(
        endpoint, accessKeyId, secretAccessKey,
        bucketName
    );
    await s3.upload(filename, "public-read", ((await fromBuffer(body)) || {mime: "application/octet-stream"}).mime, body);
    const u = new URL(bucketUrl);
    u.pathname = "/" + filename;
    return u.toString();
};
