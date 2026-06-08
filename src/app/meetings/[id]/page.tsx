'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api/client';

interface Segment {
  id: string;
  speaker: string;
  timestamp: string;
  text: string;
}

interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: string | null;
  citationTimestamp: string | null;
}

interface MeetingDetail {
  id: string;
  title: string;
  date: string;
  participants: string[];
  summary: string | null;
  decisions: string[];
  segments: Segment[];
  actionItems: ActionItem[];
}

const speakerColors: Record<string, string> = {};
const colorPalette = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#14b8a6'];

function getSpeakerColor(speaker: string): string {
  if (!speakerColors[speaker]) {
    speakerColors[speaker] = colorPalette[Object.keys(speakerColors).length % colorPalette.length];
  }
  return speakerColors[speaker];
}

export default function MeetingDetailPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'decisions' | 'actions'>('summary');
  const [highlightedTimestamp, setHighlightedTimestamp] = useState<string | null>(null);
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (token) api.setToken(token);
  }, [token]);

  const fetchMeeting = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<MeetingDetail>(`/api/meetings/${meetingId}`);
      setMeeting(data);
    } catch (err) {
      console.error('Failed to fetch meeting:', err);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (token && meetingId) {
      Promise.resolve().then(() => fetchMeeting());
    }
  }, [token, meetingId, fetchMeeting]);

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      await api.post(`/api/meetings/${meetingId}/analyze`, {});
      await fetchMeeting();
      setActiveTab('summary');
    } catch (err) {
      console.error('Analysis failed:', err);
      alert(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStatusUpdate = async (itemId: string, newStatus: string) => {
    try {
      await api.patch(`/api/action-items/${itemId}/status`, { status: newStatus });
      await fetchMeeting();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const scrollToTimestamp = (timestamp: string) => {
    setHighlightedTimestamp(timestamp);
    const ref = segmentRefs.current[timestamp];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => setHighlightedTimestamp(null), 3000);
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ width: '100%', maxWidth: 800, padding: 40 }}>
          <div className="skeleton" style={{ width: '60%', height: 48, marginBottom: 24 }} />
          <div className="skeleton" style={{ width: '100%', height: 24, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '80%', height: 24, marginBottom: 32 }} />
          <div className="skeleton" style={{ width: '100%', height: 200 }} />
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <h2 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>Meeting not found</h2>
          <button className="btn-secondary" onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const hasAnalysis = meeting.summary || meeting.decisions.length > 0 || meeting.actionItems.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Top Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-primary)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <button className="btn-ghost" onClick={() => router.push('/dashboard')} style={{ padding: '4px 8px' }}>
            Dashboard
          </button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontWeight: 500 }}>📄 {meeting.title}</span>
        </div>
        <div>
          <button
            className="btn-secondary"
            onClick={handleAnalyze}
            disabled={analyzing}
            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {analyzing ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="40 60" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>✨ {hasAnalysis ? 'Re-Analyze' : 'Analyze with AI'}</>
            )}
          </button>
        </div>
      </nav>

      {/* Main Document Content */}
      <main className="notion-page-container">
        {/* Page Header (Notion Style) */}
        <div className="animate-fade-in" style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 72, marginBottom: 24, lineHeight: 1 }}>📄</div>
          <h1 className="notion-title" style={{ fontSize: 40, marginBottom: 24 }}>{meeting.title}</h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 24, marginBottom: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', fontSize: 14 }}>
              <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📅</span> Date
              </div>
              <div style={{ color: 'var(--text-primary)' }}>
                {new Date(meeting.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', fontSize: 14 }}>
              <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>👥</span> Participants
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {meeting.participants.map((p, i) => (
                  <span key={i} className="badge" style={{ background: 'var(--color-gray)' }}>{p}</span>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', fontSize: 14 }}>
              <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📊</span> Status
              </div>
              <div>
                {hasAnalysis ? (
                  <span className="badge badge-completed">Analyzed</span>
                ) : (
                  <span className="badge badge-pending">Needs Analysis</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Analysis Blocks */}
        {hasAnalysis ? (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 40, marginBottom: 48 }}>
            
            {/* Summary */}
            {meeting.summary && (
              <section>
                <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Summary
                </h2>
                <div style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {meeting.summary}
                </div>
              </section>
            )}

            {/* Action Items */}
            {meeting.actionItems.length > 0 && (
              <section>
                <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Action Items
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {meeting.actionItems.map((item) => {
                    const isCompleted = item.status === 'COMPLETED';
                    const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && !isCompleted;
                    
                    return (
                      <div key={item.id} className="notion-block" style={{ padding: '8px 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
                          <button
                            onClick={() => handleStatusUpdate(item.id, isCompleted ? 'PENDING' : 'COMPLETED')}
                            style={{
                              width: 18, height: 18, borderRadius: 3,
                              border: `1.5px solid ${isCompleted ? 'var(--accent)' : 'var(--text-muted)'}`,
                              background: isCompleted ? 'var(--accent)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', marginTop: 4, flexShrink: 0
                            }}
                          >
                            {isCompleted && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                          
                          <div style={{ flex: 1 }}>
                            <span style={{
                              fontSize: 15,
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)'
                            }}>
                              {item.description}
                            </span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                              <span className="badge" style={{ background: 'var(--color-blue)', fontSize: 11 }}>
                                @{item.assignee}
                              </span>
                              
                              {item.dueDate && (
                                <span className="badge" style={{ background: isOverdue ? 'var(--color-red)' : 'var(--color-gray)', fontSize: 11, color: isOverdue ? '#c42b1c' : 'var(--text-secondary)' }}>
                                  {isOverdue ? 'Overdue: ' : 'Due: '} {new Date(item.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              
                              {item.citationTimestamp && (
                                <button className="citation-pill" onClick={() => scrollToTimestamp(item.citationTimestamp!)}>
                                  {item.citationTimestamp}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Decisions */}
            {meeting.decisions.length > 0 && (
              <section>
                <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Decisions
                </h2>
                <ul style={{ listStylePosition: 'outside', paddingLeft: 24, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {meeting.decisions.map((decision, i) => {
                    const tsMatch = decision.match(/^\[(\d{2,3}:\d{2})\]\s*/);
                    const timestamp = tsMatch ? tsMatch[1] : null;
                    const text = tsMatch ? decision.replace(tsMatch[0], '') : decision;
                    
                    return (
                      <li key={i} style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.5, paddingLeft: 4 }}>
                        {text}
                        {timestamp && (
                          <button className="citation-pill" style={{ marginLeft: 8 }} onClick={() => scrollToTimestamp(timestamp)}>
                            {timestamp}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />
          </div>
        ) : (
          <div style={{ padding: '64px 0', textAlign: 'center', borderBottom: '1px solid var(--border)', marginBottom: 48 }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Click Analyze with AI to generate meeting insights.</p>
          </div>
        )}

        {/* Transcript Section */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 0', marginBottom: 16 }} onClick={() => setActiveTab(activeTab === 'summary' ? 'actions' : 'summary')}>
            <h2 style={{ fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: activeTab === 'summary' ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Transcript
            </h2>
          </div>
          
          {activeTab === 'summary' && (
            <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {meeting.segments.map((seg, i) => (
                <div
                  key={seg.id}
                  ref={(el) => { segmentRefs.current[seg.timestamp] = el; }}
                  className={`transcript-segment ${highlightedTimestamp === seg.timestamp ? 'highlighted' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, minWidth: 60 }}>
                      {seg.speaker}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {seg.timestamp}
                    </span>
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-primary)', marginTop: 4 }}>
                    {seg.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
