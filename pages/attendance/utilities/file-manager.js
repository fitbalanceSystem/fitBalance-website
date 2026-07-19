// file-manager.js
export class FileManager {
    constructor(supabaseClient, bucketName) {
      this.supabase = supabaseClient;
      this.bucket = bucketName;
    }
  
    // העלאת קובץ
    async uploadFile(path, file, upsert = true) {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert,
        });
  
      if (error) throw new Error(`Upload failed: ${error.message}`);
      return data;
    }
  
    // קבלת URL ציבורי לקובץ
    getPublicUrl(path) {
      const { data } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(path);
  
      return data?.publicUrl || null;
    }
  
    // יצירת קישור חתום (לקבצים פרטיים)
    async getSignedUrl(path, expiresInSeconds = 3600) {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(path, expiresInSeconds);
  
      if (error) throw new Error(`Signed URL failed: ${error.message}`);
      return data.signedUrl;
    }
  
    // מחיקת קובץ
    async deleteFile(path) {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([path]);
  
      if (error) throw new Error(`Delete failed: ${error.message}`);
      return true;
    }
  
    // רשימת קבצים בתיקיה
    async listFiles(folderPath = '') {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(folderPath);
  
      if (error) throw new Error(`List failed: ${error.message}`);
      return data;
    }
  }
  