import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

export function NoteEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Edit your extracted note...' })],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', false);
      onChange(content || '');
    }
  }, [content, editor, onChange]);

  return <EditorContent className="editor-shell min-h-96" editor={editor} />;
}
