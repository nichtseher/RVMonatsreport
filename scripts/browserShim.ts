/*
  Browser-Bausteine, die in Node fehlen. Wird von den Prüfungen benötigt, die
  echte App-Funktionen aufrufen (Verschlüsselung, Textcodes).

  Nachgebildet wird nur die Verpackung:
    - `window`     -> zeigt auf globalThis (crypto.subtle ist in Node global)
    - `FileReader` -> nur readAsDataURL, das in crypto.ts zum Base64-Kodieren dient
  Die eigentliche Kryptografie und die Kompression laufen unverändert.
*/
const g = globalThis as unknown as Record<string, unknown>;

if (!g.window) g.window = globalThis;

if (!g.FileReader) {
  g.FileReader = class {
    result: string | null = null;
    onloadend: (() => void) | null = null;
    onerror: ((grund: unknown) => void) | null = null;
    readAsDataURL(blob: Blob) {
      blob
        .arrayBuffer()
        .then((puffer) => {
          this.result =
            "data:application/octet-stream;base64," + Buffer.from(puffer).toString("base64");
          this.onloadend?.();
        })
        .catch((grund) => this.onerror?.(grund));
    }
  };
}

export {};
