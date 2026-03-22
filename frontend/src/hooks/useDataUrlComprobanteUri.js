import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system';

/**
 * React Native a menudo no pinta bien `data:image/...;base64,...` largas.
 * Se copia a un archivo en caché y se usa `file://` para el componente Image.
 */
export function useDataUrlComprobanteUri(dataUrl, fileKey) {
  const [resolvedUri, setResolvedUri] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!dataUrl || typeof dataUrl !== 'string') {
      setResolvedUri(null);
      setBusy(false);
      return;
    }
    if (!dataUrl.startsWith('data:image')) {
      setResolvedUri(null);
      setBusy(false);
      return;
    }
    setBusy(true);
    setResolvedUri(null);
    (async () => {
      try {
        const comma = dataUrl.indexOf('base64,');
        if (comma === -1) {
          if (!cancelled) {
            setResolvedUri(dataUrl);
            setBusy(false);
          }
          return;
        }
        const header = dataUrl.slice(0, comma);
        const base64 = dataUrl.slice(comma + 7);
        if (!base64 || base64.length < 20) {
          if (!cancelled) {
            setResolvedUri(dataUrl);
            setBusy(false);
          }
          return;
        }
        let ext = 'jpg';
        if (header.includes('image/png')) ext = 'png';
        else if (header.includes('image/webp')) ext = 'webp';
        else if (header.includes('image/gif')) ext = 'gif';
        const safe = String(fileKey || 'k').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
        const path = `${FileSystem.cacheDirectory}comp_${safe}.${ext}`;
        await FileSystem.writeAsStringAsync(path, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (!cancelled) {
          setResolvedUri(path);
          setBusy(false);
        }
      } catch {
        if (!cancelled) {
          setResolvedUri(dataUrl);
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataUrl, fileKey]);

  return { resolvedUri, busy };
}
