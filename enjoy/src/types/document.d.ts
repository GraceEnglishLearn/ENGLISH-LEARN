type DocumentEType = {
  id: string;
  language: string;
  md5: string;
  title: string;
  metadata: Record<string, any>;
  lastReadPosition: Record<string, any>;
  lastReadAt: Date;
  syncedAt: Date;
  uploadedAt: Date;
  updatedAt: Date;
  createdAt: Date;
  src?: string;
  filePath?: string;
  isSynced?: boolean;
  isUploaded?: boolean;
  sync(): Promise<void>;
};
