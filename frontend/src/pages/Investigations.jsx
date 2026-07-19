import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  FolderOpen, AlertTriangle, ArrowRight, ShieldAlert, CheckCircle, ShieldCheck
} from 'lucide-react';

const Investigations = () => {
  const { user } = useContext(AuthContext);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('/api/investigations');
      setCases(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch investigation records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 uppercase tracking-wider">
            Investigation Case Directory
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active audit files under systematic review for fraud confirmation.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-gov-crimson/10 border border-gov-crimson/25 text-gov-crimson text-xs rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gov-accent border-t-transparent"></div>
          <p className="text-xs text-slate-400">Opening audit folders...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="py-20 text-center text-slate-500 text-xs glass-panel rounded-lg">
          <FolderOpen className="mx-auto text-slate-600 mb-3" size={36} />
          No active investigations assigned to your desk.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c) => {
            // Determine risk coloring
            let riskBadge = 'text-gov-gold bg-gov-gold/10 border-gov-gold/25';
            if (c.risk_score >= 90) {
              riskBadge = 'text-red-500 bg-red-500/10 border-red-500/25';
            } else if (c.risk_score >= 70) {
              riskBadge = 'text-gov-crimson bg-gov-crimson/10 border-gov-crimson/25';
            }

            return (
              <div key={c.id} className="glass-panel p-5 rounded-lg flex flex-col justify-between hover:border-gov-blue/30 transition-all border border-gov-blue/15">
                <div>
                  
                  {/* Case Title and Status */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] text-gov-gold font-bold uppercase tracking-wider">CASE FILE ID: #{c.id}</span>
                      <h3 className="text-sm font-black text-slate-200 uppercase">{c.record_number}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${c.status === 'Open' ? 'text-gov-gold bg-gov-gold/10 border-gov-gold/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
                      {c.status}
                    </span>
                  </div>

                  {/* Summary Core Info */}
                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex justify-between border-b border-gov-blue/10 pb-1.5">
                      <span className="text-slate-500">Vendor</span>
                      <span className="font-semibold text-slate-300 truncate max-w-[150px]">{c.vendor}</span>
                    </div>
                    <div className="flex justify-between border-b border-gov-blue/10 pb-1.5">
                      <span className="text-slate-500">Invoice Value</span>
                      <span className="font-bold text-slate-200">{formatCurrency(c.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gov-blue/10 pb-1.5">
                      <span className="text-slate-500">Risk Score</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold border ${riskBadge}`}>
                        {c.risk_score}%
                      </span>
                    </div>
                    {user.role === 'Admin' && (
                      <div className="flex justify-between pb-1.5">
                        <span className="text-slate-500">Desk Officer</span>
                        <span className="font-bold text-gov-accent">@{c.officer_username || 'unassigned'}</span>
                      </div>
                    )}
                  </div>

                  {/* AI summary snippet */}
                  <div className="p-3 bg-gov-navy/40 border border-gov-blue/10 rounded mb-4">
                    <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">AI Case Context Overview</span>
                    <p className="text-[10px] text-slate-400 leading-normal line-clamp-3">
                      {c.ai_summary}
                    </p>
                  </div>
                </div>

                {/* Open Workbench Link */}
                <Link
                  to={`/investigations/${c.id}`}
                  className="w-full flex items-center justify-center py-2 border border-gov-blue/30 text-slate-300 hover:text-white bg-gov-blue/10 hover:bg-gov-blue/20 text-xs font-bold rounded uppercase tracking-wider transition-all"
                >
                  Open Workbench
                  <ArrowRight size={14} className="ml-2" />
                </Link>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default Investigations;
