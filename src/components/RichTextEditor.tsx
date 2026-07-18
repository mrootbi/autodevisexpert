import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { AlignCenter, AlignLeft, AlignRight, Loader2 } from 'lucide-react';
import {
  applyImageLayout,
  readImageAlign,
  readImageSizePercent,
  registerResizableImageFormat,
  type ImageAlign,
  type ImageSizePreset,
} from '../lib/quillImageFormat';

registerResizableImageFormat();

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Upload clipboard/file image and return a public URL for <img src>. */
  onImageUpload?: (file: File) => Promise<string>;
}

type ToolbarState = {
  img: HTMLImageElement;
  top: number;
  left: number;
  width: number;
  height: number;
  size: ImageSizePreset;
  align: ImageAlign;
};

const SIZE_OPTIONS: ImageSizePreset[] = [25, 50, 75, 100];

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  onImageUpload,
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const uploadRef = useRef(onImageUpload);
  uploadRef.current = onImageUpload;
  const selectedImgRef = useRef<HTMLImageElement | null>(null);
  const resizingRef = useRef<{
    img: HTMLImageElement;
    startX: number;
    startWidth: number;
    align: ImageAlign;
  } | null>(null);

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
    () => [
      'header',
      'bold',
      'italic',
      'underline',
      'list',
      'bullet',
      'link',
      'image',
      'width',
      'height',
      'style',
      'class',
      'alt',
    ],
    [],
  );

  const syncHtml = useCallback(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    onChange(editor.root.innerHTML);
  }, [onChange]);

  const measureToolbar = useCallback((img: HTMLImageElement) => {
    const shell = shellRef.current;
    if (!shell) return null;
    const shellRect = shell.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    return {
      img,
      top: imgRect.top - shellRect.top,
      left: imgRect.left - shellRect.left,
      width: imgRect.width,
      height: imgRect.height,
      size: readImageSizePercent(img),
      align: readImageAlign(img),
    } satisfies ToolbarState;
  }, []);

  const selectImage = useCallback(
    (img: HTMLImageElement | null) => {
      const prev = selectedImgRef.current;
      if (prev) prev.classList.remove('blog-img-selected');
      selectedImgRef.current = img;
      if (!img) {
        setToolbar(null);
        return;
      }
      img.classList.add('blog-img-selected');
      const next = measureToolbar(img);
      if (next) setToolbar(next);
    },
    [measureToolbar],
  );

  const applyLayout = useCallback(
    (size: number, align: ImageAlign) => {
      const img = selectedImgRef.current;
      if (!img) return;
      applyImageLayout(img, size, align);
      // Persist clean classes first, then restore the ephemeral selection outline.
      syncHtml();
      img.classList.add('blog-img-selected');
      requestAnimationFrame(() => {
        const next = measureToolbar(img);
        if (next) setToolbar(next);
      });
    },
    [measureToolbar, syncHtml],
  );

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const root = editor.root;

    const insertImageUrl = (url: string) => {
      const range = editor.getSelection(true) ?? { index: editor.getLength(), length: 0 };
      editor.insertEmbed(range.index, 'image', url, 'user');
      // Default to centered 75% so pasted images are not wall-to-wall.
      requestAnimationFrame(() => {
        const imgs = root.querySelectorAll('img');
        const img = imgs[imgs.length - 1] as HTMLImageElement | undefined;
        if (!img) return;
        applyImageLayout(img, 75, 'center');
        selectImage(img);
        syncHtml();
      });
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

    const toolbarModule = editor.getModule('toolbar') as
      | { addHandler?: (name: string, fn: () => void) => void }
      | undefined;
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
    toolbarModule?.addHandler?.('image', pickAndUpload);

    const onEditorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'IMG') {
        event.preventDefault();
        event.stopPropagation();
        selectImage(target as HTMLImageElement);
        return;
      }
      if (!(event.target as HTMLElement)?.closest?.('.blog-img-controls')) {
        selectImage(null);
      }
    };

    const onScroll = () => {
      const img = selectedImgRef.current;
      if (!img) return;
      const next = measureToolbar(img);
      if (next) setToolbar(next);
    };

    root.addEventListener('paste', handlePaste);
    root.addEventListener('click', onEditorClick);
    root.addEventListener('scroll', onScroll, true);

    return () => {
      root.removeEventListener('paste', handlePaste);
      root.removeEventListener('click', onEditorClick);
      root.removeEventListener('scroll', onScroll, true);
    };
  }, [measureToolbar, selectImage, syncHtml]);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.blog-rich-editor') || target.closest('.blog-img-controls')) return;
      selectImage(null);
    };

    const onMove = (event: MouseEvent) => {
      const state = resizingRef.current;
      if (!state) return;

      const parent = state.img.parentElement;
      const parentWidth = parent?.clientWidth || shellRef.current?.clientWidth || 600;
      const delta = event.clientX - state.startX;
      const nextPx = Math.max(48, state.startWidth + delta);
      const pct = Math.min(100, Math.max(15, Math.round((nextPx / parentWidth) * 100)));
      applyImageLayout(state.img, pct, state.align);
      state.img.classList.add('blog-img-selected');
      const next = measureToolbar(state.img);
      if (next) setToolbar(next);
    };

    const onUp = () => {
      if (!resizingRef.current) return;
      const img = resizingRef.current.img;
      resizingRef.current = null;
      syncHtml();
      if (selectedImgRef.current === img) img.classList.add('blog-img-selected');
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [measureToolbar, selectImage, syncHtml]);

  const startResize = (event: React.MouseEvent, img: HTMLImageElement) => {
    event.preventDefault();
    event.stopPropagation();
    resizingRef.current = {
      img,
      startX: event.clientX,
      startWidth: img.getBoundingClientRect().width,
      align: readImageAlign(img),
    };
  };

  return (
    <div className="relative" ref={shellRef}>
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

      {toolbar && (
        <>
          <div
            className="blog-img-controls pointer-events-none absolute z-20"
            style={{
              top: Math.max(8, toolbar.top - 44),
              left: Math.max(8, toolbar.left + toolbar.width / 2),
              transform: 'translateX(-50%)',
            }}
          >
            <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1 shadow-md">
              {SIZE_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyLayout(pct, toolbar.align)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                    toolbar.size === pct
                      ? 'bg-trust-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={`Largeur ${pct}%`}
                >
                  {pct}%
                </button>
              ))}
              <span className="mx-0.5 h-4 w-px bg-slate-200" />
              {(
                [
                  ['left', AlignLeft, 'Aligner à gauche'],
                  ['center', AlignCenter, 'Centrer'],
                  ['right', AlignRight, 'Aligner à droite'],
                ] as const
              ).map(([align, Icon, title]) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => applyLayout(toolbar.size, align)}
                  className={`rounded-md p-1.5 transition ${
                    toolbar.align === align
                      ? 'bg-trust-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={title}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          <div
            className="blog-img-controls pointer-events-none absolute z-20 border-2 border-trust-500"
            style={{
              top: toolbar.top,
              left: toolbar.left,
              width: toolbar.width,
              height: toolbar.height,
            }}
          >
            {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
              <button
                key={corner}
                type="button"
                aria-label={`Redimensionner (${corner})`}
                onMouseDown={(e) => startResize(e, toolbar.img)}
                className={`pointer-events-auto absolute h-3 w-3 rounded-sm border border-trust-600 bg-white shadow ${
                  corner === 'nw'
                    ? '-left-1.5 -top-1.5 cursor-nwse-resize'
                    : corner === 'ne'
                      ? '-right-1.5 -top-1.5 cursor-nesw-resize'
                      : corner === 'sw'
                        ? '-bottom-1.5 -left-1.5 cursor-nesw-resize'
                        : '-bottom-1.5 -right-1.5 cursor-nwse-resize'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {uploading && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-white/70">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-trust-700 shadow-sm ring-1 ring-slate-200">
            <Loader2 className="h-4 w-4 animate-spin" /> Téléversement de l&apos;image…
          </span>
        </div>
      )}
      {pasteError && <p className="mt-2 text-xs text-action-redDark">{pasteError}</p>}
      <p className="mt-2 text-xs text-slate-400">
        Cliquez une image pour la redimensionner (poignées ou 25–100&nbsp;%) et l&apos;aligner. Ctrl+V pour coller.
      </p>
    </div>
  );
}
