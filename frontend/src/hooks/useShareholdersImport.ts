import { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { apiFetch } from '../lib/api';

export interface PadronEntry {
  id: string;
  accionista: string;
  representante_legal?: string;
  apoderado?: string;
  acciones: number;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: number;
}

const EXPECTED_HEADERS = [
  'id',
  'accionista',
  'representante_legal',
  'apoderado',
  'acciones',
];

export const useShareholdersImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PadronEntry[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const validateRows = (rows: any[]) => {
    const errs: string[] = [];
    const valid: PadronEntry[] = [];
    const ids = new Set<string>();

    rows.forEach((row, idx) => {
      const missing: string[] = [];
      if (row.id === undefined || row.id === '') missing.push('id');
      if (row.accionista === undefined || row.accionista === '')
        missing.push('accionista');
      if (row.acciones === undefined || row.acciones === '')
        missing.push('acciones');
      if (missing.length) {
        errs.push(`Fila ${idx + 1}: faltan columnas (${missing.join(', ')})`);
        return;
      }

      const id = String(row.id);
      if (ids.has(id)) {
        errs.push(`Fila ${idx + 1}: id duplicado`);
        return;
      }
      ids.add(id);

      const acciones = Number(row.acciones);
      if (Number.isNaN(acciones) || acciones <= 0) {
        errs.push(`Fila ${idx + 1}: acciones inválidas`);
        return;
      }

      valid.push({
        id,
        accionista: String(row.accionista),
        representante_legal: row.representante_legal
          ? String(row.representante_legal)
          : '',
        apoderado: row.apoderado ? String(row.apoderado) : '',
        acciones,
      });
    });

    return { valid, errs };
  };

  const handleFile = (f: File) => {
    setFile(f);
    setErrors([]);
    setResult(null);

    const ext = f.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      if (ext === 'csv') {
        const parsed = Papa.parse(data as string, {
          header: true,
          skipEmptyLines: true,
        });
        const headers = parsed.meta.fields || [];
        const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
        if (missing.length) {
          setErrors([`Faltan columnas (${missing.join(', ')})`]);
          setPreviewData([]);
          return;
        }
        const { valid, errs } = validateRows(parsed.data as any[]);
        setPreviewData(valid);
        setErrors(errs);
      } else if (ext === 'xls' || ext === 'xlsx') {
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const headers = Object.keys(json[0] || {});
        const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
        if (missing.length) {
          setErrors([`Faltan columnas (${missing.join(', ')})`]);
          setPreviewData([]);
          return;
        }
        const { valid, errs } = validateRows(json as any[]);
        setPreviewData(valid);
        setErrors(errs);
      } else {
        setErrors(['Formato de archivo no soportado']);
      }
    };

    if (ext === 'csv') reader.readAsText(f);
    else reader.readAsBinaryString(f);
  };

  const upload = async (electionId: number) => {
    if (!file) return;
    setLoading(true);
    setErrors([]);

    try {
      const form = new FormData();
      form.append('file', file);

      const data = await apiFetch<any>(
        `/elections/${electionId}/assistants/import-excel`,
        {
          method: 'POST',
          body: form,
        },
      );
      setResult({
        created: Array.isArray(data) ? data.length : 0,
        updated: 0,
        errors: 0,
      });
    } catch (err: any) {
      setErrors([err.message]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewData([]);
    setErrors([]);
    setResult(null);
  };

  return {
    file,
    previewData,
    errors,
    loading,
    result,
    handleFile,
    upload,
    reset,
  };
};

