import { supabaseClient } from "./client";

const BUCKET_NAME = "school-documents";

export const uploadDocument = async (file: File, folder: string) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) throw error;
    
    return {
      filePath: data.path,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    };
  } catch (error) {
    console.error("Storage upload error:", error);
    throw error;
  }
};

export const getDocumentSignedUrl = async (filePath: string, expiresIn = 60) => {
  try {
    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn); // Expires in 60 seconds by default
      
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error("Storage signed URL error:", error);
    throw error;
  }
};
