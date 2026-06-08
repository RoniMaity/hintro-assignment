'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
  createdAt: string;
  summary?: string;
  _count: { segments: number; actionItems: number };
}

interface MeetingsResponse {
  meetings: Meeting[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function DashboardPage() {
  const { user, token, logout, isLoading } = useAuth();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [participants, setParticipants] = useState('');
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    Promise.resolve().then(() => setDate(new Date().toISOString().split('T')[0]));
  }, []);

  useEffect(() => {
    if (!isLoading && !user) router.push('/');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (token) api.setToken(token);
  }, [token]);

  const fetchMeetings = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const data = await api.get<MeetingsResponse>(`/api/meetings?page=${page}&limit=10`);
      setMeetings(data.meetings);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      // Defer execution to avoid synchronous setState warning
      Promise.resolve().then(() => fetchMeetings());
    }
  }, [token, fetchMeetings]);

  const parseTranscript = (raw: string) => {
    const lines = raw.split('\n').filter((l) => l.trim());
    return lines.map((line) => {
      const match = line.match(/^\[(\d{2,3}:\d{2})\]\s*(.+?):\s*(.+)$/);
      if (match) {
        return { timestamp: match[1], speaker: match[2].trim(), text: match[3].trim() };
      }
      const simpleMatch = line.match(/^(\d{2,3}:\d{2})\s+(.+?):\s*(.+)$/);
      if (simpleMatch) {
        return { timestamp: simpleMatch[1], speaker: simpleMatch[2].trim(), text: simpleMatch[3].trim() };
      }
      return { timestamp: '00:00', speaker: 'Unknown', text: line.trim() };
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const segments = parseTranscript(transcript);
      if (segments.length === 0) {
        setFormError('Please provide at least one transcript segment');
        return;
      }
      await api.post('/api/meetings', {
        title,
        date: new Date(date).toISOString(),
        participants: participants.split(',').map((p) => p.trim()).filter(Boolean),
        segments,
      });
      setShowModal(false);
      setTitle(''); setDate(new Date().toISOString().split('T')[0]);
      setParticipants(''); setTranscript('');
      fetchMeetings(pagination.page);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create meeting');
    } finally {
      setFormLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div className="skeleton" style={{ width: 800, height: 400 }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Top Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-primary)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>📝</span>
          <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>{user.name}&apos;s Workspace</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>Meetings</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="notion-page-container">
        {/* Header */}
        <div className="animate-fade-in" style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
          <h1 className="notion-title">Meeting Intelligence</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            {pagination.total} meeting{pagination.total !== 1 ? 's' : ''} recorded in this workspace.
          </p>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14 }}>
              <span style={{ fontWeight: 500 }}>{meetings.reduce((a, m) => a + m._count.segments, 0)}</span> Segments
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14 }}>
              <span style={{ fontWeight: 500 }}>{meetings.reduce((a, m) => a + m._count.actionItems, 0)}</span> Action Items
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + New
          </button>
        </div>

        {/* Meetings Table */}
        <div className="animate-fade-in">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="skeleton" style={{ width: '100%', height: 200 }} />
            </div>
          ) : meetings.length === 0 ? (
            <div style={{ padding: '40px 0', color: 'var(--text-muted)' }}>
              No meetings yet. Click + New to add one.
            </div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Participants</th>
                    <th>Action Items</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.map((m, i) => (
                    <tr key={m.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms`, cursor: 'pointer' }} onClick={() => router.push(`/meetings/${m.id}`)}>
                      <td style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>📄</span> {m.title}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {m.participants.slice(0, 3).map((p, j) => (
                            <span key={j} className="badge" style={{ background: 'var(--color-gray)' }}>{p}</span>
                          ))}
                          {m.participants.length > 3 && (
                            <span className="badge" style={{ background: 'var(--color-gray)' }}>+{m.participants.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {m._count.actionItems > 0 ? (
                          <span className="badge badge-pending">{m._count.actionItems} pending</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 16, padding: '24px 0',
                }}>
                  <button className="btn-ghost" disabled={pagination.page <= 1} onClick={() => fetchMeetings(pagination.page - 1)}>
                    Previous
                  </button>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button className="btn-ghost" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchMeetings(pagination.page + 1)}>
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create Meeting Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>New Meeting</h2>
            </div>

            {formError && (
              <div style={{
                background: 'var(--color-red)', padding: '8px 12px', borderRadius: 4,
                marginBottom: 16, color: '#c42b1c', fontSize: 13,
              }}>{formError}</div>
            )}

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <input id="meeting-title" className="input-borderless" placeholder="Meeting Title" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ fontSize: 24, fontWeight: 600 }} />
              </div>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: 100, fontSize: 14, color: 'var(--text-secondary)' }}>Date</label>
                  <input id="meeting-date" type="date" className="input-borderless" value={date} onChange={(e) => setDate(e.target.value)} required style={{ flex: 1, fontSize: 14 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: 100, fontSize: 14, color: 'var(--text-secondary)' }}>Participants</label>
                  <input id="meeting-participants" className="input-borderless" placeholder="Alice, Bob..." value={participants} onChange={(e) => setParticipants(e.target.value)} required style={{ flex: 1, fontSize: 14 }} />
                </div>
              </div>
              <div>
                <textarea
                  id="meeting-transcript"
                  className="input-borderless"
                  placeholder="Paste transcript here...&#10;&#10;Format:&#10;[00:00] Alice: Hello"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  required
                  style={{ minHeight: 200, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={formLoading}>
                  {formLoading ? 'Creating...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
