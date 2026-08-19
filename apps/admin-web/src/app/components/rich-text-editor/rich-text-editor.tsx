import { Editor } from '@tinymce/tinymce-react';
import { useMemo } from 'react';
import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/models/dom';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/table';
import 'tinymce/plugins/code';
import 'tinymce/skins/ui/oxide/skin.min.css';
import './rich-text-editor.scss';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

const RADIX_FALLBACK_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI (Custom)', Roboto, 'Helvetica Neue', 'Open Sans (Custom)', system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'";

const readRadixFontFamily = (): string =>
  getComputedStyle(document.documentElement)
    .getPropertyValue('--default-font-family')
    .trim() || RADIX_FALLBACK_FONT;

export const RichTextEditor = ({
  value,
  onChange,
  disabled,
}: RichTextEditorProps) => {
  const init = useMemo(
    () => ({
      height: 480,
      menubar: false,
      branding: false,
      promotion: false,
      plugins: 'lists link table code',
      toolbar:
        'undo redo | styles | bold italic underline | bullist numlist | link table | removeformat | code',
      skin: false,
      content_css: false,
      content_style: `body { font-family: ${readRadixFontFamily()}; }`,
    }),
    [],
  );

  return (
    <div className="rich-text-editor">
      <Editor
        licenseKey="gpl"
        disabled={disabled}
        value={value}
        onEditorChange={onChange}
        init={init}
      />
    </div>
  );
};
