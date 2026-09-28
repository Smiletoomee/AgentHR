import { useState, useEffect } from 'react';

export interface CiriVicuData {
  id: string;
  title: string;
  content: string;
}

export interface UploadedFileData {
  id: string;
  fileName: string;
  mimeType: string;
  base64Data: string;
}

export function useCandidateData(searchParams: URLSearchParams) {
  const [cvData, setCvData] = useState<CiriVicuData | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFileData | null>(null);
  const [isLoadingCv, setIsLoadingCv] = useState<boolean>(false);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);

  useEffect(() => {
    const docId = searchParams.get('ciriVicuId') || searchParams.get('articleId');
    if (!docId) return;

    setIsLoadingCv(true);
    fetch(`/api/documents/${docId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Nie udało się pobrać dokumentu');
        return res.json();
      })
      .then((data) => {
        setCvData({
          id: docId,
          title: data.title || 'Dokument aplikacyjny bez tytułu',
          content: data.content || ''
        });
      })
      .catch((err) => console.error('Błąd pobierania pliku kontekstu:', err))
      .finally(() => setIsLoadingCv(false));
  }, [searchParams]);

  useEffect(() => {
    const fileId = searchParams.get('uploadedFileId') || searchParams.get('sessionId');
    if (!fileId) return;

    setIsLoadingFile(true);
    fetch(`/api/documents/${fileId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Nie udało się pobrać pliku dodatkowego');
        return res.json();
      })
      .then((data) => {
        setUploadedFile({
          id: fileId,
          fileName: data.fileName || 'Zaimplementowany plik binarny',
          mimeType: data.mimeType || 'application/pdf',
          base64Data: data.base64Data || data.content
        });
      })
      .catch((err) => console.error('Błąd pobierania pliku dla bazy danych:', err))
      .finally(() => setIsLoadingFile(false));
  }, [searchParams]);

  return { cvData, uploadedFile, isLoadingCv, isLoadingFile };
}