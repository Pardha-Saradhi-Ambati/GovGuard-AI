import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  AlertTriangle, UserCheck, ShieldAlert, ArrowRight, Clock, CheckCircle2, ShieldQuestion 
} from 'lucide-react';

const Alerts = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAlertsAndOfficers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const alertsUrl = statusFilter ? `/api/alerts?status=${statusFilter}` : '/api/alerts';
      const [alertsRes, officersRes] = await Promise.all([
        axios.get(alertsUrl),
        axios.get('/api/auth/officers')
      ]);

      setAlerts(alertsRes.data);
      setOfficers(officersRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch fraud alert logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsAndOfficers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleAssign = async (alertId, officerId) => {
    try {
      setError('');
      await axios.put(`/api/alerts/${alertId}`, {
        assigned_officer: officerId || null,
        status: officerId ? 'Under Investigation' : 'New'
      });
      fetchAlertsAndOfficers();
    } catch (err) {
      console.error(err);
      setError('Assignment modification failed.');
    }
  };

  const handleSelfClaim = async (alertId) => {
    await handleAssign(alertId, user.id);
  };

  const handleInvestigateClick = (alert) => {
    if (alert.investigation_id) {
      navigate(`/investigations/${alert.investigation_id}`);
    } else {
      // If no investigation id exists yet, trigger update to 'Under Investigation' first
      handleAssign(alert.id, user.id).then(() => {
        // Re-fetch and navigate
        axios.get(`/api/alerts`).then(res => {
          const updatedAlert = res.data.find(a => a.id === alert.id);
          if (updatedAlert && updatedAlert.investigation_id) {
            navigate(`/investigations/${updatedAlert.investigation_id}`);
          }
        });
      });
    }
  };

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
            AI Anomaly & Risk Queue
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit queue of transactions flagged by digital validation engines.
          </p>
        </div>

        {/* Filter Tab buttons */}
        <div className="flex bg-gov-slate/60 p-1 rounded border border-gov-blue/20 text-xs self-start md:self-auto">
          {[
            { label: 'All Flags', val: '' },
            { label: 'New', val: 'New' },
            { label: 'Investigating', val: 'Under Investigation' },
            { label: 'Resolved', val: 'Resolved' },
            { label: 'Dismissed', val: 'Dismissed' },
          ].map(tab => (
            <button
              key={tab.val}
              onClick={() => setStatusFilter(tab.val)}
              className={`px-3 py-1.5 rounded font-bold transition-all uppercase tracking-wider ${statusFilter === tab.val ? 'bg-gov-accent text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-gov-crimson/10 border border-gov-crimson/25 text-gov-crimson text-xs rounded-md flex items-center">
          <AlertTriangle size={16} className="mr-2" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gov-accent border-t-transparent"></div>
          <p className="text-xs text-slate-400">Loading risk queues...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-20 text-center text-slate-500 text-xs glass-panel rounded-lg">
          <ShieldQuestion className="mx-auto text-slate-600 mb-3" size={36} />
          No alerts found matching current selection.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {alerts.map((alert) => {
            // Severity parsing
            let scoreColor = 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20';
            let meterColor = 'bg-emerald-400';
            if (alert.risk_score >= 90) {
              scoreColor = 'from-red-600/20 to-red-900/5 text-red-500 border-red-500/30';
              meterColor = 'bg-red-500';
            } else if (alert.risk_score >= 70) {
              scoreColor = 'from-gov-crimson/20 to-gov-crimson/5 text-gov-crimson border-gov-crimson/30';
              meterColor = 'bg-gov-crimson';
            } else if (alert.risk_score >= 40) {
              scoreColor = 'from-gov-gold/20 to-gov-gold/5 text-gov-gold border-gov-gold/30';
              meterColor = 'bg-gov-gold';
            }

            // Status label mapping
            let statusIcon = <Clock size={12} className="mr-1" />;
            let statusLabelColor = 'text-slate-400 bg-slate-800';
            if (alert.status === 'New') {
              statusIcon = <ShieldAlert size={12} className="mr-1" />;
              statusLabelColor = 'text-gov-crimson bg-gov-crimson/10 border-gov-crimson/20';
            } else if (alert.status === 'Under Investigation') {
              statusIcon = <Clock size={12} className="mr-1" />;
              statusLabelColor = 'text-gov-gold bg-gov-gold/10 border-gov-gold/20';
            } else if (alert.status === 'Resolved') {
              statusIcon = <CheckCircle2 size={12} className="mr-1" />;
              statusLabelColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            }

            return (
              <div key={alert.id} className="glass-panel p-6 rounded-lg flex flex-col justify-between hover:border-gov-blue/30 transition-all border border-gov-blue/15">
                <div>
                  
                  {/* Title and Badge */}
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <span className="text-[10px] text-gov-accent font-bold tracking-wider uppercase">Record Flag</span>
                      <h3 className="text-sm font-black text-slate-200 uppercase">{alert.record_number}</h3>
                    </div>
                    <span className={`flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${statusLabelColor}`}>
                      {statusIcon}
                      {alert.status}
                    </span>
                  </div>

                  {/* Risk gauge block */}
                  <div className={`p-4 rounded border bg-gradient-to-r ${scoreColor} mb-4`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">Audit Risk Coefficient</span>
                      <strong className="text-lg font-black">{alert.risk_score}%</strong>
                    </div>
                    {/* Linear Meter */}
                    <div className="w-full bg-gov-navy/60 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full ${meterColor}`} style={{ width: `${alert.risk_score}%` }}></div>
                    </div>
                  </div>

                  {/* Transaction core facts */}
                  <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block tracking-wider">Vendor</span>
                      <span className="font-semibold text-slate-300 truncate block">{alert.vendor}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block tracking-wider">Capital Value</span>
                      <span className="font-bold text-slate-200 block">{formatCurrency(alert.amount)}</span>
                    </div>
                  </div>

                  {/* Highlight reasons */}
                  <div className="p-3 bg-gov-navy/40 border border-gov-blue/10 rounded mb-4">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Flagged Anomaly Classifications</span>
                    <ul className="space-y-1.5 text-[11px] text-slate-400 pl-3 list-disc">
                      {alert.reasons?.map((reason, idx) => (
                        <li key={idx} className="leading-tight">{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Assignment & Action Section */}
                <div className="border-t border-gov-blue/20 pt-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Officer allocation */}
                  <div className="flex-1">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Assigned Investigator</span>
                    {alert.status === 'Resolved' || alert.status === 'Dismissed' ? (
                      <span className="text-xs font-semibold text-slate-400">
                        {alert.officer_username ? `@${alert.officer_username}` : 'Dismissed / Unassigned'}
                      </span>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <select
                          value={alert.assigned_officer || ''}
                          onChange={(e) => handleAssign(alert.id, e.target.value)}
                          className="glass-input py-1 text-[11px] font-semibold text-slate-300 max-w-[150px] bg-gov-navy focus:border-gov-accent"
                        >
                          <option value="">Unassigned</option>
                          {officers.map(off => (
                            <option key={off.id} value={off.id}>{off.username}</option>
                          ))}
                        </select>
                        {!alert.assigned_officer && (
                          <button
                            onClick={() => handleSelfClaim(alert.id)}
                            className="px-2 py-1 text-[10px] border border-gov-accent/30 text-gov-accent hover:bg-gov-accent/15 rounded font-bold uppercase"
                          >
                            Claim
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {(alert.status === 'New' || alert.status === 'Under Investigation') && (
                    <button
                      onClick={() => handleInvestigateClick(alert)}
                      className="flex items-center justify-center py-2 px-4 rounded text-xs font-bold text-slate-900 bg-gov-gold hover:bg-gov-gold/90 uppercase tracking-wider transition-colors self-end sm:self-auto"
                    >
                      Investigate
                      <ArrowRight size={14} className="ml-2" />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default Alerts;
