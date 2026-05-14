import { useQuery } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Clock3, Database, FileText, RefreshCw } from 'lucide-react';
import { adminApi } from '@/api/admin';

function formatBytes(value = 0) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${Math.round((value / 1024 / 1024) * 10) / 10} MB`;
}

export function AdminPage() {
  const stats = useQuery({ queryKey: ['admin-ocr-stats'], queryFn: () => adminApi.ocrStats().then((r) => r.data), refetchInterval: 10000 });
  const jobs = useQuery({ queryKey: ['admin-ocr-jobs'], queryFn: () => adminApi.ocrJobs().then((r) => r.data), refetchInterval: 10000 });
  const cleanup = useMutation({
    mutationFn: () => adminApi.cleanupFailed(30),
    onSuccess: () => {
      stats.refetch();
      jobs.refetch();
    }
  });
  const totals = stats.data?.totals || {};

  return (
    <div className="space-y-6">
      <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-black uppercase text-brand">Admin</p>
          <h2 className="mt-1 text-3xl font-black text-ink">OCR operations</h2>
          <p className="mt-2 text-sm font-semibold text-ink/75">Monitor conversion health, cost, retries, and failed jobs.</p>
        </div>
        <button onClick={() => { stats.refetch(); jobs.refetch(); }} className="secondary-button">
          <RefreshCw size={18} />
          Refresh
        </button>
        <button onClick={() => cleanup.mutate()} disabled={cleanup.isPending} className="secondary-button text-coral">
          {cleanup.isPending ? 'Cleaning...' : 'Clean failed 30d'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Queued', stats.data?.byStatus?.queued || 0, Clock3],
          ['Processing', stats.data?.byStatus?.processing || 0, RefreshCw],
          ['Failed', stats.data?.byStatus?.failed || 0, AlertTriangle],
          ['Storage', formatBytes(totals.totalStorage || 0), Database]
        ].map(([label, value, Icon]) => {
          const TypedIcon = Icon as typeof FileText;
          return (
            <div key={String(label)} className="surface p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink">{String(label)}</p>
                <TypedIcon className="text-brand" size={20} />
              </div>
              <p className="mt-4 text-3xl font-black text-ink">{String(value)}</p>
            </div>
          );
        })}
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-ink/10 p-4">
          <h3 className="font-black text-ink">Recent OCR jobs</h3>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-mist text-xs uppercase text-ink/70">
              <tr>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Engine</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Scan</th>
                <th className="px-4 py-3">Retries</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {(jobs.data || []).map((job: any) => (
                <tr key={job._id} className="border-t border-ink/10">
                  <td className="max-w-xs px-4 py-3 font-bold text-ink">{job.title || job.originalFilename}</td>
                  <td className="px-4 py-3"><span className="badge bg-mist text-ink">{job.status}</span></td>
                  <td className="px-4 py-3">{job.ocrEngine || '-'}</td>
                  <td className="px-4 py-3">{job.ocrConfidence ? `${Math.round(job.ocrConfidence * 100)}%` : '-'}</td>
                  <td className="px-4 py-3">{job.ocrDurationMs ? `${Math.round(job.ocrDurationMs / 1000)}s` : '-'}</td>
                  <td className="px-4 py-3">{formatBytes(job.originalSize || 0)}</td>
                  <td className="px-4 py-3">{typeof job.scanQualityScore === 'number' ? `${job.scanQualityScore}/100` : '-'}</td>
                  <td className="px-4 py-3">{job.retryCount || 0}</td>
                  <td className="max-w-sm px-4 py-3 text-coral">{job.ocrError || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
