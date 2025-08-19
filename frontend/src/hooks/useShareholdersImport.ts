import { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { apiFetch } from '../lib/api';

export interface Shareholder {
  code: string;
  name: string;
  document: string;
  email: string;
  actions: number;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: number;
}

const REQUIRED_COLUMNS = ['code', 'name', 'document', 'actions'];

export const useShareholdersImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Shareholder[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const validateRows = (rows: any[]) => {
    const errs: string[] = [];
    const valid: Shareholder[] = [];

    rows.forEach((row, idx) => {
      const missing = REQUIRED_COLUMNS.filter(
        (c) => row[c] === undefined || row[c] === '',
      );
      if (missing.length) {
        errs.push(`Fila ${idx + 1}: faltan columnas (${missing.join(', ')})`);
        return;
      }

      const actions = Number(row.actions);
      if (Number.isNaN(actions) || actions < 0) {
        errs.push(`Fila ${idx + 1}: acciones inválidas`);
        return;
      }

      valid.push({
        code: String(row.code),
        name: String(row.name),
        document: String(row.document),
        email: String(row.email || ''),
        actions,
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
        const parsed = Papa.parse(data as string, { header: true, skipEmptyLines: true });
        const { valid, errs } = validateRows(parsed.data as any[]);
        setPreviewData(valid);
        setErrors(errs);
      } else if (ext === 'xls' || ext === 'xlsx') {
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);
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
        `/elections/${electionId}/shareholders/import-file?preview=false`,
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

