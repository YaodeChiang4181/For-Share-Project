import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const dynamic = "force-dynamic";

const s3 = process.env.S3_ENDPOINT ? new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  }
}) : null;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");

    if (!fileUrl) {
      return new NextResponse("Missing file URL", { status: 400 });
    }

    // Parse the S3 URL.
    if (s3 && process.env.S3_ENDPOINT && fileUrl.startsWith(process.env.S3_ENDPOINT)) {
      const bucketAndKey = fileUrl.replace(process.env.S3_ENDPOINT + "/", "");
      const bucketName = process.env.S3_BUCKET_NAME || "";
      
      let key = bucketAndKey;
      if (key.startsWith(bucketName + "/")) {
        key = key.replace(bucketName + "/", "");
      }

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      // 產生 1 小時內有效的 Presigned URL
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
      return NextResponse.redirect(presignedUrl);
    }

    return NextResponse.redirect(fileUrl);
  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("Server Error", { status: 500 });
  }
}
