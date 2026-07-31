import { useEffect, useState, type FormEvent } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Users, Clock, Server, Send, Mail, MousePointerClick } from 'lucide-react';

// --- Types ---
interface LogEntry {
  uid: string;
  email: string;
  sentAt: string;
  clickedAt: string | null;
  ip: string | null;
}

// --- Components ---

function LandingPage({ uid }: { uid: string | null }) {
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    // If a UID is present, record the click to the backend
    if (uid && !tracked) {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      }).then(() => setTracked(true)).catch(console.error);
    }
  }, [uid, tracked]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-slate-900">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-amber-500 p-8 flex flex-col items-center text-center">
          <div className="bg-white p-4 rounded-full mb-4 shadow-sm">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Security Awareness Test</h1>
          <p className="text-amber-50 text-lg">
            Oops! The link you just clicked was part of an authorized internal security simulation.
          </p>
        </div>
        
        <div className="p-8">
          <p className="text-lg mb-6 leading-relaxed">
            Don't worry, your computer is safe and no malicious software was installed. However, in a real-world scenario, clicking that link could have compromised your account or the company network.
          </p>
          
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-indigo-600" />
              How to spot a phishing email:
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="bg-indigo-100 p-1 rounded mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-700" />
                </div>
                <div>
                  <strong className="block text-slate-800">Check the Sender Address</strong>
                  <span className="text-slate-600 text-sm">Look closely at the email address, not just the display name. Attackers often use domains that look similar to legitimate ones (e.g., @microsoft-support.com instead of @microsoft.com).</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-indigo-100 p-1 rounded mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-700" />
                </div>
                <div>
                  <strong className="block text-slate-800">Beware of Urgency</strong>
                  <span className="text-slate-600 text-sm">Phishing emails often try to create a sense of panic (e.g., "Your account will be suspended in 24 hours!"). Take a breath and verify independently.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-indigo-100 p-1 rounded mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-700" />
                </div>
                <div>
                  <strong className="block text-slate-800">Hover Before You Click</strong>
                  <span className="text-slate-600 text-sm">Hover your mouse over links without clicking to see the actual destination URL. If it looks suspicious or doesn't match the context, do not click.</span>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="mt-8 text-center text-sm text-slate-500">
            If you have any questions about this test, please contact the IT Department.
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetEmail, setTargetEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Preserve the admin secret across API calls
  const secret = new URLSearchParams(window.location.search).get('secret') || '';
  const apiQuery = secret ? `?secret=${encodeURIComponent(secret)}` : '';

  const fetchLogs = () => {
    fetch(`/api/logs${apiQuery}`)
      .then(res => res.json())
      .then(data => { setLogs(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000); // auto-refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/send${apiQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ ok: true, message: `Email sent to ${targetEmail} (UID: ${data.uid})` });
        setTargetEmail('');
        fetchLogs();
      } else {
        setSendResult({ ok: false, message: data.error || 'Unknown error' });
      }
    } catch (err) {
      setSendResult({ ok: false, message: 'Network error — could not reach the server.' });
    } finally {
      setSending(false);
    }
  };

  const clickedCount = logs.filter(l => l.clickedAt !== null).length;

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Phishing Simulation</h1>
            <p className="text-slate-500 mt-1">Internal security awareness training — authorised use only.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2 text-slate-600">
              <Users className="w-5 h-5" />
              <span className="font-semibold">{logs.length}</span>
              <span className="text-sm">Sent</span>
            </div>
            <div className={`px-4 py-2 rounded-lg shadow-sm border flex items-center gap-2 ${clickedCount > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}>
              <MousePointerClick className="w-5 h-5" />
              <span className="font-semibold">{clickedCount}</span>
              <span className="text-sm">Clicked</span>
            </div>
          </div>
        </div>

        {/* Send Email Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600" />
            Send Simulation Email
          </h2>
          <form onSubmit={handleSend} className="flex gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="email" className="block text-sm font-medium text-slate-600 mb-1">
                Recipient email address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="user@pfcvalves.com"
                value={targetEmail}
                onChange={e => setTargetEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
          {sendResult && (
            <p className={`mt-3 text-sm font-medium ${sendResult.ok ? 'text-emerald-600' : 'text-red-600'}`}>
              {sendResult.ok ? '✓' : '✗'} {sendResult.message}
            </p>
          )}
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Campaign Results</h2>
            <span className="text-xs text-slate-400">Auto-refreshes every 15 s</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <ShieldCheck className="w-16 h-16 text-emerald-400 mb-4" />
              <h3 className="text-xl font-medium text-slate-700">No emails sent yet</h3>
              <p className="text-slate-500 mt-2">Use the form above to send the first simulation email.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 font-semibold text-slate-600 text-sm">Recipient</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm">Sent At</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm">Clicked At</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm">IP Address</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.uid} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {log.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-800">{log.email}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(log.sentAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        {log.clickedAt ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(log.clickedAt).toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">
                        {log.ip ? (
                          <div className="flex items-center gap-1">
                            <Server className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono text-xs">{log.ip}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {log.clickedAt ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
                            Clicked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded-full">
                            No Click
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Simple routing based on URL path and query parameters
  const path = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const uid = urlParams.get('uid');

  if (path === '/admin') {
    return <AdminDashboard />;
  }

  return <LandingPage uid={uid} />;
}
