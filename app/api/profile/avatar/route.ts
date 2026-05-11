import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getProfileForApi } from "@/lib/session";
import { getCloudinaryConfig, signCloudinaryParams } from "@/lib/cloudinary";

export async function POST(req: Request) {
  try {
    const profile = await getProfileForApi();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image file" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
    }

    const { cloudName, apiKey } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = "habit/avatars";
    const publicId = `profile-${profile.id}`;
    // Every signed upload param except `file`, `api_key`, and `cloud_name` must be included in the signature (sorted).
    const signature = signCloudinaryParams({
      folder,
      overwrite: "true",
      public_id: publicId,
      timestamp,
    });

    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("api_key", apiKey);
    uploadData.append("timestamp", timestamp);
    uploadData.append("folder", folder);
    uploadData.append("public_id", publicId);
    uploadData.append("signature", signature);
    uploadData.append("overwrite", "true");

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: uploadData,
      }
    );

    const uploadJson = (await uploadRes.json()) as {
      secure_url?: string;
      error?: { message?: string };
    };
    if (!uploadRes.ok || !uploadJson.secure_url) {
      return NextResponse.json(
        { error: uploadJson.error?.message ?? "Cloudinary upload failed" },
        { status: 502 }
      );
    }

    const db = requireDb();
    await db
      .update(profiles)
      .set({ avatarUrl: uploadJson.secure_url, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id));

    return NextResponse.json({ avatarUrl: uploadJson.secure_url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
