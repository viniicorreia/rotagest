import { Download, FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Attachment } from '@/api/types';
import { errorMessage, http } from '@/api/client';
import { Button } from '@/components/ui/button';

export const ACCEPTED_FILES = 'application/pdf,image/jpeg,image/png,image/webp';
export const MAX_FILE_MB = 10;

export async function uploadAttachment(owner: { payableId?: string; receivableId?: string; settlementId?: string }, file: File) {
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`Arquivo maior que ${MAX_FILE_MB} MB`);
  const form = new FormData();
  for (const [k, v] of Object.entries(owner)) if (v) form.append(k, v);
  form.append('file', file);
  return http.upload<Attachment>('/attachments', form);
}

export async function downloadAttachment(id: string) {
  const { blob, fileName } = await http.download(`/attachments/${id}/download`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface AttachmentsPanelProps {
  attachments: Attachment[];
  owner: { payableId?: string; receivableId?: string };
  canManage: boolean;
  onChange: () => void;
}

/** Comprovantes privados: upload, download autenticado e remoção. */
export function AttachmentsPanel({ attachments, owner, canManage, onChange }: AttachmentsPanelProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await uploadAttachment(owner, file);
      toast.success('Comprovante anexado');
      onChange();
    } catch (e) {
      toast.error(e instanceof Error && !('status' in e) ? e.message : errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="size-4" aria-hidden /> Comprovantes
        </h4>
        {canManage && (
          <>
            <input ref={input} type="file" accept={ACCEPTED_FILES} className="sr-only" aria-label="Escolher comprovante" onChange={(e) => pick(e.target.files)} />
            <Button size="sm" variant="outline" loading={busy} onClick={() => input.current?.click()}>
              <Upload /> Anexar
            </Button>
          </>
        )}
      </div>
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum comprovante. PDF, JPG, PNG ou WEBP até {MAX_FILE_MB} MB.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{a.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  {sizeLabel(a.sizeBytes)}
                  {a.settlementId ? ' · do pagamento/recebimento' : ''}
                </p>
              </div>
              <Button size="icon" variant="ghost" aria-label={`Baixar ${a.originalName}`} onClick={() => downloadAttachment(a.id).catch((e) => toast.error(errorMessage(e)))}>
                <Download />
              </Button>
              {canManage && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  aria-label={`Remover ${a.originalName}`}
                  onClick={async () => {
                    try {
                      await http.delete(`/attachments/${a.id}`);
                      toast.success('Comprovante removido');
                      onChange();
                    } catch (e) {
                      toast.error(errorMessage(e));
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
