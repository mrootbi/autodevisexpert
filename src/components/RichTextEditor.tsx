import { useEffect, useMemo, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Loader2 } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Upload clipboard/file image and return a public URL for <img src>. */
  onImageUpload?: (file: File) => Promise<string>;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  onImageUpload,
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const uploadRef = useRef(onImageUpload);
  uploadRef.current = onImageUpload;

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
    }),
    [],
  );

  const formats = useMemo(
    () => ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link', 'image'],
    [],
  );

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const root = editor.root;

    const insertImageUrl = (url: string) => {
      const range = editor.getSelection(true) ?? { index: editor.getLength(), length: 0 };
      editor.insertEmbed(range.index, 'image', url, 'user');
      editor.setSelection(range.index + 1, 0, 'silent');
    };

    const handlePaste = (event: ClipboardEvent) => {
      const upload = uploadRef.current;
      if (!upload) return;

      const items = event.clipboardData?.items;
      if (!items?.length) return;

      let imageFile: File | null = null;
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFile = file;
            break;
          }
        }
      }
      if (!imageFile) return;

      event.preventDefault();
      event.stopPropagation();
      setPasteError(null);
      setUploading(true);

      void upload(imageFile)
        .then((url) => {
          insertImageUrl(url);
        })
        .catch((err: unknown) => {
          setPasteError(err instanceof Error ? err.message : 'Échec du collage de l’image.');
        })
        .finally(() => {
          setUploading(false);
        });
    };

    // Also wire Quill toolbar image button to file picker → upload.
    const toolbar = editor.getModule('toolbar') as { addHandler?: (name: string, fn: () => void) => void } | undefined;
    const pickAndUpload = () => {
      const upload = uploadRef.current;
      if (!upload) return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp,image/gif';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        setPasteError(null);
        setUploading(true);
        void upload(file)
          .then((url) => insertImageUrl(url))
          .catch((err: unknown) => {
            setPasteError(err instanceof Error ? err.message : 'Échec du téléversement.');
          })
          .finally(() => setUploading(false));
      };
      input.click();
    };
    toolbar?.addHandler?.('image', pickAndUpload);

    root.addEventListener('paste', handlePaste);
    return () => {
      root.removeEventListener('paste', handlePaste);
    };
  }, []);

  return (
    <div className="relative">
      <div className="blog-rich-editor overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-trust-500 focus-within:ring-4 focus-within:ring-trust-100">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder ?? 'Rédigez votre article…'}
        />
      </div>
      {uploading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-trust-700 shadow-sm ring-1 ring-slate-200">
            <Loader2 className="h-4 w-4 animate-spin" /> Téléversement de l&apos;image…
          </span>
        </div>
      )}
      {pasteError && <p className="mt-2 text-xs text-action-redDark">{pasteError}</p>}
      <p className="mt-2 text-xs text-slate-400">Astuce : collez une image (Ctrl+V) directement dans l&apos;éditeur.</p>
    </div>
  );
}
