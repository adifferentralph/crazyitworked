import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

import { slugify } from "@/lib/utils";

const TEN_MINUTES = 600;

export type PresignUploadInput = {
  userId: string;
  filename: string;
  contentType: string;
  size: number;
  folder: "products" | "verification" | "rfq" | "chat" | "imports";
};

function requireR2Config() {
  const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "R2_PUBLIC_BASE_URL",
  ] as const;

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Cloudflare R2 is missing configuration: ${missing.join(", ")}`);
  }
}

function getR2Client() {
  requireR2Config();

  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function createR2Upload(input: PresignUploadInput) {
  const extension = input.filename.includes(".") ? input.filename.split(".").pop() : "bin";
  const basename = slugify(input.filename.replace(/\.[^.]+$/, "")) || "upload";
  const key = `${input.folder}/${input.userId}/${Date.now()}-${crypto.randomUUID()}-${basename}.${extension}`;

  const presigned = await createPresignedPost(getR2Client(), {
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    Conditions: [
      ["content-length-range", 1, input.size],
      ["eq", "$Content-Type", input.contentType],
    ],
    Fields: {
      "Content-Type": input.contentType,
    },
    Expires: TEN_MINUTES,
  });

  return {
    ...presigned,
    key,
    publicUrl: `${process.env.R2_PUBLIC_BASE_URL!.replace(/\/$/, "")}/${key}`,
  };
}
