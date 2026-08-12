import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutBucketCorsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const required = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Environment belum lengkap: ${missing.join(", ")}`);

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT.replace(/\/+$/, ""),
  region: process.env.S3_REGION || "default",
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
});
const bucket = process.env.S3_BUCKET;
const probeKey = `_system/health-check/${Date.now()}-codex.txt`;
const allowedOrigins = (process.env.S3_ALLOWED_ORIGINS || "http://localhost:5173").split(",").map((value) => value.trim()).filter(Boolean);
if (allowedOrigins.includes("*")) throw new Error("CORS wildcard tidak diizinkan untuk bucket data sekolah.");

await client.send(new HeadBucketCommand({ Bucket: bucket }));
console.log(`OK bucket: ${bucket}`);
await client.send(new PutBucketCorsCommand({
  Bucket: bucket,
  CORSConfiguration: {
    CORSRules: [{ AllowedOrigins: allowedOrigins, AllowedMethods: ["GET", "HEAD", "PUT"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"], MaxAgeSeconds: 3600 }],
  },
}));
console.log(`OK CORS origins: ${allowedOrigins.join(", ")}`);

try {
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: probeKey, ContentType: "text/plain" }), { expiresIn: 120 });
  const uploadResponse = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "text/plain" }, body: "TSLS object storage health check" });
  if (!uploadResponse.ok) throw new Error(`Presigned upload gagal (${uploadResponse.status}).`);
  const downloadUrl = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: probeKey }), { expiresIn: 120 });
  const downloadResponse = await fetch(downloadUrl);
  const contents = await downloadResponse.text();
  if (!downloadResponse.ok) throw new Error(`Presigned download gagal (${downloadResponse.status}).`);
  if (contents !== "TSLS object storage health check") throw new Error("Isi file uji tidak sesuai.");
  console.log("OK presigned upload dan download file uji");
} finally {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey }));
  console.log("OK file uji dibersihkan");
}
