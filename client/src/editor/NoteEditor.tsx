import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

export function NoteEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Edit your extracted note...' })],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });

  return <EditorContent className="glass p-4 min-h-96" editor={editor} />;
}
