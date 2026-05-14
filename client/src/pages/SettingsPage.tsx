import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Trash2 } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState({
    defaultExportFormat: 'pdf',
    ocrMode: 'balanced',
    documentTemplate: 'study_notes',
    maxPdfPages: 25
  });

  useEffect(() => {
    if (user?.settings) setSettings(user.settings);
  }, [user?.settings]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const { data } = await authApi.updateSettings({ ...settings, maxPdfPages: Number(settings.maxPdfPages) });
    setUser(data);
    setMessage('Settings saved.');
  }

  async function deleteData() {
    if (!window.confirm('Delete all notes and uploaded originals?')) return;
    const { data } = await authApi.deleteData();
    setMessage(`Deleted ${data.deletedNotes} notes.`);
  }

  async function deleteAccount() {
    if (!window.confirm('Delete your account and all data permanently?')) return;
    await authApi.deleteAccount();
    logout();
    navigate('/');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="surface p-5">
        <p className="text-sm font-black uppercase text-brand">Preferences</p>
        <h2 className="mt-1 text-3xl font-black text-ink">Settings</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-ink/75">Set defaults for OCR speed, document style, exports, and storage controls.</p>
      </div>

      <form onSubmit={save} className="surface grid gap-4 p-5 sm:grid-cols-2">
        <label>
          <span className="text-xs font-black uppercase text-brand">Default export</span>
          <select className="field mt-2" value={settings.defaultExportFormat} onChange={(e) => setSettings((s) => ({ ...s, defaultExportFormat: e.target.value }))}>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="markdown">Markdown</option>
            <option value="txt">TXT</option>
          </select>
        </label>
        <label>
          <span className="text-xs font-black uppercase text-brand">OCR mode</span>
          <select className="field mt-2" value={settings.ocrMode} onChange={(e) => setSettings((s) => ({ ...s, ocrMode: e.target.value }))}>
            <option value="fast">Fast</option>
            <option value="balanced">Balanced</option>
            <option value="high_accuracy">High accuracy</option>
          </select>
        </label>
        <label>
          <span className="text-xs font-black uppercase text-brand">Document style</span>
          <select className="field mt-2" value={settings.documentTemplate} onChange={(e) => setSettings((s) => ({ ...s, documentTemplate: e.target.value }))}>
            <option value="study_notes">Study notes</option>
            <option value="lab_report">Lab report</option>
            <option value="exam_revision">Exam revision</option>
            <option value="formula_sheet">Formula sheet</option>
            <option value="qa_worksheet">Q&A worksheet</option>
          </select>
        </label>
        <label>
          <span className="text-xs font-black uppercase text-brand">Max PDF pages</span>
          <input className="field mt-2" type="number" min="1" max="100" value={settings.maxPdfPages} onChange={(e) => setSettings((s) => ({ ...s, maxPdfPages: Number(e.target.value) }))} />
        </label>
        <button className="primary-button sm:col-span-2">
          <Save size={18} />
          Save settings
        </button>
        {message && <p className="text-sm font-bold text-emerald-700 sm:col-span-2">{message}</p>}
      </form>

      <div className="surface border-coral/30 p-5">
        <h3 className="font-black text-coral">Danger zone</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button className="secondary-button text-coral" onClick={deleteData}><Trash2 size={18} />Delete notes</button>
          <button className="secondary-button text-coral" onClick={deleteAccount}><Trash2 size={18} />Delete account</button>
        </div>
      </div>
    </div>
  );
}
