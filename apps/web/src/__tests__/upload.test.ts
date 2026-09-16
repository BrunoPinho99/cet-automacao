import { NextRequest } from 'next/server';
import { POST } from '../app/api/upload/route';
import { prisma } from '@cet/db';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@cet/db', () => ({
  prisma: {
    arquivo: {
      create: vi.fn().mockResolvedValue({
        id: 'arquivo-teste-123',
        nome: 'documento.pdf',
      }),
    },
  },
}));

// Mocking fs/promises
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('Upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve rejeitar requisição sem arquivo', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.erro).toBe('Nenhum arquivo enviado.');
  });

  it('deve rejeitar arquivo com mime type inválido', async () => {
    const formData = new FormData();
    const blob = new Blob(['teste'], { type: 'text/plain' });
    formData.append('file', blob, 'teste.txt');
    
    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.erro).toContain('Tipo de arquivo não permitido');
  });

  it('deve processar upload de arquivo pdf com sucesso', async () => {
    const formData = new FormData();
    const blob = new Blob(['conteudo fake pdf'], { type: 'application/pdf' });
    formData.append('file', blob, 'documento.pdf');
    
    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    const res = await POST(req);
    expect(res.status).toBe(201);
    
    const json = await res.json();
    expect(json.id).toBe('arquivo-teste-123');
    expect(json.nome).toBe('documento.pdf');
    expect(prisma.arquivo.create).toHaveBeenCalled();
  });
});
