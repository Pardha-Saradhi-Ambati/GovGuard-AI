import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  Download, RefreshCw, XCircle, ArrowRight, Clock, History 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const UploadRecords = () => {
  const { token } = useContext(AuthContext);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch Import History logs
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await axios.get('/api/upload/history');
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch import history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle Drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle Drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Please select a valid CSV file (.csv format only).');
      }
    }
  };

  // Handle File Select
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel') {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Please select a valid CSV file (.csv format only).');
      }
    }
  };

  // Submit Upload Form
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please choose a CSV file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploading(true);
      setProgress(0);
      setError('');
      setSummary(null);

      const res = await axios.post('/api/upload/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setProgress(percentCompleted);
        },
      });

      setSummary(res.data);
      setSelectedFile(null);
      
      // Refresh import history log
      fetchHistory();
      
      // Dispatch global metric refresh event so Dashboard refreshes
      window.dispatchEvent(new Event('metricsUpdated'));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to upload and parse CSV file. Verify format.');
    } finally {
      setUploading(false);
    }
  };

  // Download Sample CSV helper
  const handleDownloadSample = () => {
    const csvContent = 
      "record_id,department,vendor,invoice_number,payment_method,amount,purpose,date,status\n" +
      "REC-2026-9001,Department of Urban Development,Urban Build Corp,INV-9001,Direct Bank Transfer,450000.00,Smart City Infrastructure,2026-07-01,Approved\n" +
      "REC-2026-9002,Department of Health & Family Welfare,Apex Med Supplies,INV-9002,Electronic Fund Transfer (EFT),1250000.00,Emergency ICU Equipment,2026-07-02,Pending\n" +
      "REC-2026-9003,Department of Information Technology,TechnoCore IT,INV-9003,UPI / IMPS,78000.00,Cloud Storage Subscription,2026-07-03,Approved";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_financial_records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 uppercase tracking-wider">
            Financial Record Ingestion
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingest government ledger records in bulk. Automatic validation, duplicate prevention, and queued for AI analysis.
          </p>
        </div>

        <button
          onClick={handleDownloadSample}
          className="flex items-center justify-center px-4 py-2 border border-gov-accent/40 text-gov-accent hover:bg-gov-accent/10 text-xs font-bold rounded uppercase tracking-wider transition-colors self-start sm:self-auto"
        >
          <Download size={14} className="mr-1.5" />
          Download CSV Template
        </button>
      </div>

      {/* Main Upload Box */}
      <div className="glass-panel p-6 rounded-lg">
        
        <form onSubmit={handleUpload} className="space-y-6">
          
          {/* Drag and Drop Zone */}
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
              dragActive 
                ? 'border-gov-accent bg-gov-accent/10' 
                : selectedFile 
                  ? 'border-emerald-500/50 bg-emerald-500/5' 
                  : 'border-gov-blue/30 hover:border-gov-blue/60 bg-gov-navy/20'
            }`}
          >
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileChange} 
              className="hidden" 
              id="csv-file-input"
            />
            
            <label htmlFor="csv-file-input" className="cursor-pointer block">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className={`p-3 rounded-full border ${selectedFile ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-gov-accent bg-gov-accent/10 border-gov-accent/20'}`}>
                  {selectedFile ? <FileSpreadsheet size={36} /> : <UploadCloud size={36} />}
                </div>
                
                {selectedFile ? (
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">{selectedFile.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Size: {(selectedFile.size / 1024).toFixed(2)} KB • Click or drag another file to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      Drag & Drop CSV File Here, or <span className="text-gov-accent underline">Browse Files</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports comma-separated .csv files up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-gov-crimson/10 border border-gov-crimson/25 rounded text-gov-crimson text-xs flex items-center">
              <AlertTriangle className="mr-3 shrink-0" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-semibold">
                <span className="flex items-center">
                  <RefreshCw size={14} className="animate-spin mr-2 text-gov-accent" />
                  Parsing and ingesting ledger records...
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gov-navy/80 rounded-full h-2.5 overflow-hidden border border-gov-blue/20">
                <div 
                  className="bg-gov-accent h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-[11px] text-slate-500">
              Required columns: <span className="text-slate-400 font-mono">department, vendor, invoice_number, payment_method, amount, purpose, date, status</span>
            </div>
            
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="flex items-center justify-center px-6 py-2.5 text-xs font-bold text-slate-900 bg-gov-accent hover:bg-gov-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded uppercase tracking-wider transition-colors shadow-lg"
            >
              {uploading ? (
                <>
                  <RefreshCw size={14} className="animate-spin mr-2" />
                  Ingesting Batch...
                </>
              ) : (
                <>
                  <UploadCloud size={16} className="mr-2" />
                  Ingest Financial Records
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* Success Notification Banner */}
      {summary && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span>
              {summary.aiCompleted 
                ? "AI Fraud Analysis Completed Successfully" 
                : "Records ingested successfully and queued for AI analysis."}
            </span>
          </div>
          <Link 
            to="/records" 
            className="flex items-center text-xs font-extrabold text-gov-accent hover:underline ml-4 uppercase tracking-wider shrink-0"
          >
            View Ingested Ledger
            <ArrowRight size={14} className="ml-1" />
          </Link>
        </div>
      )}

      {/* Summary Response Results Card */}
      {summary && (
        <div className="glass-panel p-6 rounded-lg space-y-6">
          <div className="flex items-center justify-between border-b border-gov-blue/20 pb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={20} className="text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Batch Ingestion Summary Report
              </h2>
            </div>
            <span className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider border ${summary.aiCompleted ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-gov-gold bg-gov-gold/10 border-gov-gold/30'}`}>
              AI Status: {summary.aiCompleted ? 'Completed' : 'Pending'}
            </span>
          </div>

          {/* Summary Stat Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Imported Count */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Imported Records</span>
                <h3 className="text-2xl font-black text-slate-100 mt-1">✓ {summary.imported} Records</h3>
              </div>
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>

            {/* Average Risk Score */}
            <div className="p-4 rounded-lg bg-gov-navy/60 border border-gov-blue/25 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average Risk Score</span>
                <h3 className="text-2xl font-black text-slate-100 mt-1">{summary.averageRiskScore || 0}%</h3>
              </div>
              <FileSpreadsheet size={28} className="text-gov-accent" />
            </div>

            {/* High Risk Count */}
            <div className="p-4 rounded-lg bg-gov-crimson/10 border border-gov-crimson/25 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gov-crimson uppercase tracking-widest">High Risk Count</span>
                <h3 className="text-2xl font-black text-slate-100 mt-1">{summary.highRiskCount || 0} Flags</h3>
              </div>
              <AlertTriangle size={28} className="text-gov-crimson" />
            </div>

            {/* AI Status */}
            <div className="p-4 rounded-lg bg-gov-gold/10 border border-gov-gold/25 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gov-gold uppercase tracking-widest">AI Analysis Status</span>
                <h3 className="text-xl font-black text-slate-100 mt-1">{summary.aiCompleted ? 'Completed' : 'Pending'}</h3>
              </div>
              <CheckCircle2 size={28} className="text-gov-gold" />
            </div>

          </div>

          {/* Row Validation Errors Log */}
          {summary.errors && summary.errors.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center">
                <AlertTriangle size={14} className="text-gov-gold mr-1.5" />
                Row Validation & Exception Log ({summary.errors.length} issues)
              </h3>
              <div className="max-h-60 overflow-y-auto p-4 rounded bg-gov-navy/60 border border-gov-blue/20 text-xs font-mono space-y-1 text-slate-300">
                {summary.errors.map((errLog, idx) => (
                  <div key={idx} className="flex items-start py-0.5 border-b border-gov-blue/10 last:border-0">
                    <span className="text-gov-crimson mr-2">•</span>
                    <span>{errLog}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Import History Table */}
      <div className="glass-panel p-6 rounded-lg space-y-4">
        <div className="flex items-center justify-between border-b border-gov-blue/20 pb-4">
          <div className="flex items-center space-x-2">
            <History size={18} className="text-gov-accent" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Ingestion Audit History
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {history.length} Ingestion Logs
          </span>
        </div>

        {loadingHistory ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading import history...
          </div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No ingestion history recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gov-blue/20 bg-gov-slate/40 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Upload Time</th>
                  <th className="py-3 px-4 text-center">Imported</th>
                  <th className="py-3 px-4 text-center">Duplicates</th>
                  <th className="py-3 px-4 text-center">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-blue/10 text-slate-300">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-gov-blue/5 border-b border-gov-blue/5">
                    <td className="py-3 px-4 font-semibold text-slate-200 flex items-center">
                      <FileSpreadsheet size={14} className="mr-2 text-gov-accent shrink-0" />
                      <span className="truncate max-w-[200px]">{item.file_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="flex items-center">
                        <Clock size={12} className="mr-1.5 shrink-0 text-slate-500" />
                        {new Date(item.upload_time).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.imported_records}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-gov-gold/10 text-gov-gold border border-gov-gold/20">
                        {item.duplicate_records}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${item.failed_records > 0 ? 'bg-gov-crimson/10 text-gov-crimson border border-gov-crimson/20' : 'text-slate-500'}`}>
                        {item.failed_records}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default UploadRecords;
