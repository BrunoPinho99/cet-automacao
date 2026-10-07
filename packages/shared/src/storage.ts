import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      supabaseClient = createClient(url, key);
      return supabaseClient;
    } catch (err) {
      console.warn('[Storage] Erro ao inicializar cliente Supabase:', err);
    }
  }

  return null;
}

export interface UploadOptions {
  bucket: 'cet-uploads' | 'cet-relatorios';
  key: string;
  buffer: Buffer;
  contentType: string;
}

export interface UploadResult {
  key: string;
  provider: 'supabase' | 'local';
  publicUrl?: string;
}

export async function uploadFileToStorage(options: UploadOptions): Promise<UploadResult> {
  const client = getSupabaseClient();
  const providerConfig = process.env.STORAGE_PROVIDER || (client ? 'supabase' : 'local');

  if (providerConfig === 'supabase' && client) {
    try {
      const { error } = await client.storage
        .from(options.bucket)
        .upload(options.key, options.buffer, {
          contentType: options.contentType,
          upsert: true,
        });

      if (!error) {
        const { data } = client.storage.from(options.bucket).getPublicUrl(options.key);
        return {
          key: options.key,
          provider: 'supabase',
          publicUrl: data?.publicUrl,
        };
      }
      console.warn(`[Storage] Falha no upload para o Supabase Storage (${error.message}). Usando fallback local.`);
    } catch (err) {
      console.warn('[Storage] Erro no Supabase Storage. Usando fallback local:', err);
    }
  }

  // Fallback Local Disk
  try {
    let targetDir;
    if (process.env.VERCEL === '1') {
      targetDir = path.join('/tmp', options.bucket);
    } else {
      const relativeDir = options.bucket === 'cet-relatorios' ? '../../.pdfs' : './uploads';
      targetDir = path.join(/*turbopackIgnore: true*/ process.cwd(), relativeDir);
    }
    await fs.mkdir(targetDir, { recursive: true });
    const filePath = path.join(/*turbopackIgnore: true*/ targetDir, options.key);
    await fs.writeFile(/*turbopackIgnore: true*/ filePath, options.buffer);
  } catch (err) {
    console.warn('[Storage] Falha ao escrever fallback no disco local:', err);
  }

  return {
    key: options.key,
    provider: 'local',
  };
}

export async function downloadFileFromStorage(
  bucket: 'cet-uploads' | 'cet-relatorios',
  key: string
): Promise<{ buffer: Buffer; provider: 'supabase' | 'local' }> {
  const client = getSupabaseClient();
  const providerConfig = process.env.STORAGE_PROVIDER || (client ? 'supabase' : 'local');

  if (providerConfig === 'supabase' && client) {
    try {
      const { data, error } = await client.storage.from(bucket).download(key);
      if (!error && data) {
        const arrayBuffer = await data.arrayBuffer();
        return {
          buffer: Buffer.from(arrayBuffer),
          provider: 'supabase',
        };
      }
      console.warn(`[Storage] Não encontrado no Supabase Storage (${error?.message}). Tentando local.`);
    } catch (err) {
      console.warn('[Storage] Erro ao baixar do Supabase Storage. Tentando local:', err);
    }
  }

  // Fallback Local Disk
  try {
    let filePath;
    if (process.env.VERCEL === '1') {
      filePath = path.join('/tmp', bucket, key);
    } else {
      const relativeDir = bucket === 'cet-relatorios' ? '../../.pdfs' : './uploads';
      filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), relativeDir, key);
    }
    const buffer = await fs.readFile(/*turbopackIgnore: true*/ filePath);

    return {
      buffer,
      provider: 'local',
    };
  } catch (err) {
    console.warn('[Storage] Arquivo não encontrado no disco local:', err);
    throw err;
  }
}

