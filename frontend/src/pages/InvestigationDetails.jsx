import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  ChevronLeft, AlertTriangle, Send, ShieldCheck, Clock, CheckCircle2, ArrowRight, Server, Building, Landmark, AlertOctagon
} from 'lucide-react';

const InvestigationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newNote, setNewNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`/api/investigations/${id}`);
      setCaseData(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to retrieve investigation case file details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setNoteLoading(true);
      const res = await axios.post(`/api/investigations/${id}/notes`, { text: newNote });
      setCaseData(res.data); // Update case context with returned payload
      setNewNote('');
      fetchCaseDetails(); // Re-sync joining columns
    } catch (err) {
      console.error(err);
      alert('Failed to register case note.');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleCloseCase = async () => {
    if (!window.confirm('CRITICAL ACTION: Close case audit? This marks the alert as Resolved and rejects the invoice payment. This cannot be undone.')) {
      return;
    }

    try {
      setCloseLoading(true);
      await axios.put(`/api/investigations/${id}/status`, { status: 'Closed' });
      fetchCaseDetails();
    } catch (err) {
      console.error(err);
      alert('Failed to finalize case. Verify permissions.');
    } finally {
      setCloseLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gov-accent border-t-transparent"></div>
          <p className="text-slate-400 text-xs font-semibold tracking-wider">RETRIEVING CASE DOSSIER...</p>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-gov-crimson/10 border border-gov-crimson/25 rounded-md text-gov-crimson text-sm flex items-center">
          <AlertTriangle className="mr-3" />
          <span>{error || 'Dossier not found.'}</span>
        </div>
        <Link to="/investigations" className="inline-flex items-center text-xs text-gov-accent hover:underline">
          <ChevronLeft size={16} /> Back to Case Directory
        </Link>
      </div>
    );
  }

  // Parse notes safely
  const notesArray = Array.isArray(caseData.case_notes) 
    ? caseData.case_notes 
    : JSON.parse(caseData.case_notes || '[]');

  return (
    <div className="space-y-6">
      
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between border-b border-gov-blue/20 pb-4">
        <Link to="/investigations" className="flex items-center text-xs text-slate-400 hover:text-slate-200 transition-colors">
          <ChevronLeft size={16} className="mr-1" />
          Back to Case Directory
        </Link>
        <span className="text-[10px] text-gov-gold font-bold tracking-widest uppercase">
          SECURE CASE DESK #{caseData.id}
        </span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Details, Flow Graph, AI Summary, Notes */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Case Facts Panel */}
          <div className="glass-panel p-6 rounded-lg">
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <span className="text-[10px] text-gov-accent font-bold uppercase tracking-wider">Investigating Record</span>
                <h2 className="text-lg font-black text-slate-100 uppercase">{caseData.record_number}</h2>
              </div>
              <span className={`px-2.5 py-1 rounded text-xs font-bold border ${caseData.status === 'Open' ? 'text-gov-gold bg-gov-gold/10 border-gov-gold/25' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'}`}>
                {caseData.status === 'Open' ? 'Active Investigation' : 'Audit Finalized'}
              </span>
            </div>

            {/* Core facts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-gov-navy/40 border border-gov-blue/10 rounded">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Invoice Value</span>
                <strong className="text-base text-gov-crimson font-black">{formatCurrency(caseData.amount)}</strong>
              </div>
              <div className="p-3 bg-gov-navy/40 border border-gov-blue/10 rounded">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Vendor Target</span>
                <strong className="text-xs text-slate-200 truncate block mt-0.5">{caseData.vendor}</strong>
              </div>
              <div className="p-3 bg-gov-navy/40 border border-gov-blue/10 rounded">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Source Agency</span>
                <strong className="text-xs text-slate-200 truncate block mt-0.5">{caseData.department}</strong>
              </div>
            </div>

            {/* In-depth details table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs border-t border-gov-blue/20 pt-4">
              <div className="flex justify-between py-1.5 border-b border-gov-blue/10">
                <span className="text-slate-500">Invoice Number</span>
                <span className="font-semibold text-slate-300">{caseData.invoice_number}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gov-blue/10">
                <span className="text-slate-500">Payment Channel</span>
                <span className="font-semibold text-slate-300">{caseData.payment_method}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gov-blue/10">
                <span className="text-slate-500">Billing Date</span>
                <span className="font-semibold text-slate-300">{new Date(caseData.date).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gov-blue/10">
                <span className="text-slate-500">Case Assigned to</span>
                <span className="font-semibold text-gov-accent">@{caseData.officer_username}</span>
              </div>
            </div>
          </div>

          {/* AI Fraud Analysis Panel */}
          <div className="glass-panel p-6 rounded-lg relative overflow-hidden border border-gov-blue/20 space-y-5">
            {/* Header badge */}
            <div className="flex justify-between items-center border-b border-gov-blue/25 pb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center">
                <Server size={14} className="mr-2 text-gov-accent" />
                AI Fraud Analysis
              </h3>
              <span className="text-[9px] text-gov-accent bg-gov-accent/10 border border-gov-accent/20 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                Diagnostic Output
              </span>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-gov-navy/40 border border-gov-blue/10 rounded">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Risk Score</span>
                <strong className="text-base text-gov-crimson font-black">{caseData.risk_score}%</strong>
              </div>
              <div className="p-3 bg-gov-navy/40 border border-gov-blue/10 rounded">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Prediction Tier</span>
                <strong className="text-xs text-slate-200 truncate block mt-0.5 uppercase tracking-wider font-bold">
                  {caseData.prediction || 'Not Evaluated'}
                </strong>
              </div>
              <div className="p-3 bg-gov-navy/40 border border-gov-blue/10 rounded">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">AI Confidence</span>
                <strong className="text-base text-gov-accent font-black">
                  {caseData.confidence !== undefined && caseData.confidence !== null ? `${caseData.confidence}%` : 'N/A'}
                </strong>
              </div>
            </div>

            {/* Professional Summary Paragraph */}
            <div className="space-y-1.5">
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider">AI Case Narrative Summary</span>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold bg-gov-navy/40 p-4 border border-gov-blue/10 rounded">
                {caseData.ai_summary || 'No AI case summary generated.'}
              </p>
            </div>

            {/* Reasons and Recommendations columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reasons */}
              <div className="p-3 bg-gov-navy/40 border border-gov-blue/10 rounded">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Flagged Anomaly Classifications</span>
                {caseData.reasons && caseData.reasons.length > 0 ? (
                  <ul className="space-y-1.5 text-[11px] text-slate-400 pl-3 list-disc">
                    {caseData.reasons.map((reason, idx) => (
                      <li key={idx} className="leading-tight">{reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No significant fraud indicators detected.</p>
                )}
              </div>

              {/* Recommendation */}
              <div className="p-3 bg-gov-navy/40 border border-gov-blue/10 rounded">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Audit Action Plan</span>
                <p className="text-[11px] font-semibold text-gov-gold leading-relaxed">
                  {caseData.recommendation || 'No AI explanation available'}
                </p>
              </div>
            </div>
          </div>

          {/* Visual Transaction Flow Pathway */}
          <div className="glass-panel p-6 rounded-lg">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-6">
              Financial Path Audit Trail
            </h3>

            {/* Visual Node Diagram */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-6 px-4 bg-gov-navy/40 rounded border border-gov-blue/10 overflow-x-auto">
              
              {/* Node 1: Department */}
              <div className="flex flex-col items-center p-3 rounded bg-gov-slate border border-gov-blue/25 w-40 text-center shrink-0 shadow-lg">
                <Building size={20} className="text-gov-accent mb-1" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Origin Entity</span>
                <div className="text-[10px] font-semibold text-slate-200 truncate w-full mt-1">
                  {caseData.department.split(' ').slice(2).join(' ') || caseData.department}
                </div>
              </div>

              {/* Line arrow 1 */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="w-12 h-0.5 bg-gov-blue/40 relative hidden md:block">
                  <div className="absolute right-0 top-1/2 translate-y-[-50%] w-1.5 h-1.5 border-t-2 border-r-2 border-gov-blue/60 rotate-45"></div>
                </div>
                <div className="w-0.5 h-6 bg-gov-blue/40 relative block md:hidden">
                  <div className="absolute bottom-0 left-1/2 translate-x-[-50%] w-1.5 h-1.5 border-r-2 border-b-2 border-gov-blue/60 rotate-45"></div>
                </div>
                <span className="text-[9px] text-slate-500 mt-1 font-bold">Approved</span>
              </div>

              {/* Node 2: Bank Processor */}
              <div className="flex flex-col items-center p-3 rounded bg-gov-slate border border-gov-blue/25 w-40 text-center shrink-0 shadow-lg">
                <Landmark size={20} className="text-gov-gold mb-1" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Treasury Gateway</span>
                <div className="text-[10px] font-semibold text-slate-200 mt-1">
                  {caseData.payment_method}
                </div>
              </div>

              {/* Line arrow 2 */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="w-12 h-0.5 bg-gov-crimson/50 relative hidden md:block animate-pulse">
                  <div className="absolute right-0 top-1/2 translate-y-[-50%] w-1.5 h-1.5 border-t-2 border-r-2 border-gov-crimson rotate-45"></div>
                </div>
                <div className="w-0.5 h-6 bg-gov-crimson/50 relative block md:hidden animate-pulse">
                  <div className="absolute bottom-0 left-1/2 translate-x-[-50%] w-1.5 h-1.5 border-r-2 border-b-2 border-gov-crimson rotate-45"></div>
                </div>
                <span className="text-[9px] text-gov-crimson mt-1 font-bold animate-pulse">Suspicious</span>
              </div>

              {/* Node 3: Vendor */}
              <div className="flex flex-col items-center p-3 rounded bg-gov-crimson/5 border border-gov-crimson/30 w-42 text-center shrink-0 shadow-lg relative">
                <AlertOctagon size={20} className="text-gov-crimson mb-1" />
                <span className="text-[10px] text-gov-crimson font-black uppercase tracking-widest">Suspect Vendor</span>
                <div className="text-[10px] font-bold text-slate-200 truncate w-full mt-1">
                  {caseData.vendor}
                </div>
                {/* Floating flag */}
                <span className="absolute -top-2 -right-2 bg-gov-crimson text-white text-[8px] font-extrabold px-1 rounded animate-bounce">
                  FLAGGED
                </span>
              </div>

            </div>
          </div>

          {/* Case Audit logs & Notes */}
          <div className="glass-panel p-6 rounded-lg space-y-6">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-gov-blue/20 pb-4">
              Audit timeline and Case notes
            </h3>

            {/* Note Timeline */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {notesArray.map((note, idx) => {
                const isSystem = note.author === 'System Audit';
                const isSelf = note.author === user?.username;

                return (
                  <div 
                    key={idx} 
                    className={`flex flex-col p-3.5 rounded border text-xs max-w-[85%] ${
                      isSystem 
                        ? 'bg-gov-blue/15 border-gov-blue/20 text-slate-300 self-start mr-auto' 
                        : isSelf
                          ? 'bg-gov-accent/10 border-gov-accent/20 text-slate-200 ml-auto self-end text-right'
                          : 'bg-gov-slate/40 border-gov-blue/10 text-slate-300 mr-auto self-start'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1.5 text-[10px] text-slate-500 justify-between font-bold">
                      <span className={isSystem ? 'text-gov-accent' : isSelf ? 'text-gov-gold' : 'text-slate-400'}>
                        {isSystem ? 'System Audit' : `@${note.author}`}
                      </span>
                      <span>{new Date(note.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - {new Date(note.timestamp).toLocaleDateString('en-GB')}</span>
                    </div>
                    <p className="leading-relaxed font-medium">{note.text}</p>
                  </div>
                );
              })}
            </div>

            {/* Note Submit form */}
            {caseData.status === 'Open' && (
              <form onSubmit={handleAddNote} className="border-t border-gov-blue/15 pt-4 flex gap-3">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Insert case remark or verification notes..."
                  disabled={noteLoading}
                  className="flex-1 glass-input text-xs"
                />
                <button
                  type="submit"
                  disabled={noteLoading || !newNote.trim()}
                  className="px-4 bg-gov-accent hover:bg-gov-accent/90 text-slate-900 text-xs font-bold rounded flex items-center justify-center uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <Send size={12} className="mr-1.5" />
                  Append
                </button>
              </form>
            )}

          </div>

        </div>

        {/* Right 1 Col: Controls and Risk factors */}
        <div className="space-y-6">
          
          {/* Case controls panel */}
          <div className="glass-panel p-6 rounded-lg border border-gov-blue/20">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-gov-blue/20 pb-4 mb-5">
              Desk Case Controls
            </h3>

            {caseData.status === 'Open' ? (
              <div className="space-y-4">
                <div className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Reviewing the case flags will allow you to approve or terminate the invoice. Closing the case will:
                  <ul className="list-disc pl-4 mt-2 space-y-1 text-[11px] text-slate-500 font-medium">
                    <li>Mark the fraud alert status as **Resolved**.</li>
                    <li>Update the financial record status to **Rejected**.</li>
                    <li>Freeze the transfer value from release.</li>
                  </ul>
                </div>
                
                <button
                  onClick={handleCloseCase}
                  disabled={closeLoading}
                  className="w-full flex items-center justify-center py-2.5 px-4 bg-gov-crimson hover:bg-gov-crimson/95 text-white text-xs font-bold rounded uppercase tracking-wider shadow-lg shadow-gov-crimson/15 transition-all disabled:opacity-50"
                >
                  {closeLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                      Processing Closure...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} className="mr-2" />
                      Terminate & Close Case
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded text-emerald-400 text-xs flex flex-col items-center text-center space-y-2">
                <ShieldCheck size={28} />
                <strong>AUDIT CLOSED & SECURED</strong>
                <p className="text-[11px] text-slate-400">
                  This transaction invoice has been formally rejected. The case file is locked from manual edits.
                </p>
              </div>
            )}
          </div>

          {/* Anomaly triggers widget */}
          <div className="glass-panel p-6 rounded-lg">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-gov-blue/20 pb-4 mb-4">
              AI Assessment Flags
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Risk Severity Index</span>
                <span className="text-xl font-black text-gov-crimson">{caseData.risk_score}% Severity</span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Anomaly Triggers</span>
                {caseData.reasons?.map((reason, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-gov-navy/50 border border-gov-crimson/15 text-slate-300 text-xs leading-relaxed font-semibold">
                    {reason}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default InvestigationDetails;
