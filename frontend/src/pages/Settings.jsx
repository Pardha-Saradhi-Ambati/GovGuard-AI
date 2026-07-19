import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { 
  Sliders, User, ShieldCheck, CheckCircle2, ShieldAlert, Cpu, Lock 
} from 'lucide-react';

const Settings = () => {
  const { user } = useContext(AuthContext);

  // States for Settings Configuration
  const [riskThreshold, setRiskThreshold] = useState(70);
  const [fastApiUrl, setFastApiUrl] = useState('http://localhost:8000/api/v1/predict');
  const [sessionTimeout, setSessionTimeout] = useState('24 Hours');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setSuccessMsg('');
    
    // Save to local storage mock configuration variables
    localStorage.setItem('cfg_risk_threshold', riskThreshold);
    localStorage.setItem('cfg_fastapi_url', fastApiUrl);
    localStorage.setItem('cfg_session_timeout', sessionTimeout);

    setSuccessMsg('Platform configuration registry successfully updated.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Top Banner */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 uppercase tracking-wider">
          Platform Configuration Panel
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure security settings, anomaly sensitivities, and external FastAPI AI backend connections.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-md flex items-center">
          <CheckCircle2 size={16} className="mr-2" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* User Identity Profile (Left col) */}
        <div className="glass-panel p-6 rounded-lg flex flex-col justify-between h-fit border border-gov-blue/15">
          <div>
            <div className="flex items-center space-x-2 text-gov-gold mb-5">
              <User size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">
                Officer Profile identity
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex flex-col space-y-1 p-2 bg-gov-navy/40 rounded border border-gov-blue/10">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">User Identity Code</span>
                <strong className="text-slate-200">@{user?.username}</strong>
              </div>
              <div className="flex flex-col space-y-1 p-2 bg-gov-navy/40 rounded border border-gov-blue/10">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Secure Registry Email</span>
                <strong className="text-slate-200">{user?.email}</strong>
              </div>
              <div className="flex flex-col space-y-1 p-2 bg-gov-navy/40 rounded border border-gov-blue/10">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Assigned Security Clearance</span>
                <strong className="text-gov-accent uppercase tracking-wider">{user?.role}</strong>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gov-blue/20 text-[10px] text-slate-500 leading-normal flex items-start space-x-1.5">
            <Lock size={12} className="shrink-0 text-slate-500 mt-0.5" />
            <span>Profile settings are managed directly by central database administrators.</span>
          </div>
        </div>

        {/* Configuration settings form (Right 2 cols) */}
        <div className="md:col-span-2 glass-panel p-6 rounded-lg border border-gov-blue/15">
          <div className="flex items-center space-x-2 text-gov-accent mb-6 border-b border-gov-blue/25 pb-4">
            <Sliders size={16} />
            <h3 className="text-xs font-bold uppercase tracking-widest">
              Audit Sensitivity & AI Connectors
            </h3>
          </div>

          <form onSubmit={handleSave} className="space-y-6 text-xs text-slate-300">
            {/* Risk sensitivity threshold */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-200 uppercase tracking-wider text-[11px] block">
                  AI Auto-Flagging Threshold (Severity Gauge)
                </label>
                <strong className="text-gov-crimson text-sm font-black">{riskThreshold}% Score</strong>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                step="5"
                value={riskThreshold}
                onChange={(e) => setRiskThreshold(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gov-navy rounded-lg appearance-none cursor-pointer accent-gov-accent"
              />
              <p className="text-[10px] text-slate-500 leading-normal">
                Transactions uploaded with computed risk scores at or above this threshold will automatically raise a critical fraud alarm.
              </p>
            </div>

            {/* FastAPI prediction endpoint */}
            <div className="space-y-2">
              <label className="font-bold text-slate-200 uppercase tracking-wider text-[11px] block flex items-center">
                <Cpu size={14} className="mr-1.5 text-gov-accent" />
                Python FastAPI AI Prediction Endpoint URL
              </label>
              <input
                type="url"
                value={fastApiUrl}
                onChange={(e) => setFastApiUrl(e.target.value)}
                className="w-full glass-input text-xs"
                placeholder="http://localhost:8000/api/v1/predict"
              />
              <p className="text-[10px] text-slate-500 leading-normal">
                Configure the target FastAPI microservice pathway for Phase 2 anomaly audits and machine learning logic integrations.
              </p>
            </div>

            {/* JWT Expiration timeout */}
            <div className="space-y-2">
              <label className="font-bold text-slate-200 uppercase tracking-wider text-[11px] block">
                Audited Session Registry TTL Timeout
              </label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full glass-input text-xs"
              >
                <option value="8 Hours">8 Hours (High Security Clearance)</option>
                <option value="12 Hours">12 Hours (Standard Clearance)</option>
                <option value="24 Hours">24 Hours (Extended Session Limit)</option>
              </select>
              <p className="text-[10px] text-slate-500 leading-normal">
                JWT tokens expire dynamically based on local network administrator security policies.
              </p>
            </div>

            {/* Submit */}
            <div className="border-t border-gov-blue/20 pt-4 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-gov-accent hover:bg-gov-accent/90 text-slate-900 text-xs font-bold rounded uppercase tracking-wider transition-colors shadow-lg shadow-gov-accent/15"
              >
                Save configurations
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
};

export default Settings;
