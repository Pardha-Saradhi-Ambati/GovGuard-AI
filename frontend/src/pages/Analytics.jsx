import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ComposedChart 
} from 'recharts';
import { 
  AlertTriangle, FileBarChart2, Landmark, ShieldCheck, Download 
} from 'lucide-react';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/analytics/reports');
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load system reports. Try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gov-accent border-t-transparent"></div>
          <p className="text-xs text-slate-400">Compiling ledger statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-gov-crimson/10 border border-gov-crimson/25 rounded-md text-gov-crimson text-xs flex items-center">
        <AlertTriangle className="mr-3" />
        <span>{error}</span>
      </div>
    );
  }

  const { charts, summary } = data;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 uppercase tracking-wider">
            Integrity Analytics Workbench
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Systematic statistical breakdown of anomaly patterns, risk capital, and department variances.
          </p>
        </div>
        <button
          onClick={() => alert('PDF report compiling started. Mock download initialized.')}
          className="flex items-center justify-center px-4 py-2 border border-gov-blue/40 text-slate-200 hover:text-white bg-gov-blue/20 hover:bg-gov-blue/30 text-xs font-bold rounded uppercase tracking-wider transition-colors self-start sm:self-auto"
        >
          <Download size={14} className="mr-1.5" />
          Export Audit PDF
        </button>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Line Graph Trend */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-lg">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-6">
            Monthly Fraud Suspect Volume & Capital Variance (2026)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={charts.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2541" />
                <XAxis dataKey="month_name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={(val) => `${val/100000}L`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c2541', borderColor: '#3a506b', color: '#f8fafc' }}
                  formatter={(value, name) => name === 'risk_amount' ? [formatCurrency(value), 'Capital At Risk'] : [value, 'High Risk Flags']}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area yAxisId="right" name="Capital At Risk (INR)" type="monotone" dataKey="risk_amount" fill="#e63946" fillOpacity={0.1} stroke="#e63946" strokeWidth={2} />
                <Bar yAxisId="left" name="High Risk Flags" dataKey="high_risk_count" fill="#e0a96d" barSize={20} radius={[3, 3, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Statistics panel */}
        <div className="glass-panel p-6 rounded-lg flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-gov-blue/20 pb-4 mb-4">
              Audit Overview Metrics
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Audited Records Count</span>
                <strong className="text-slate-200">{summary.totalRecords} Items</strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Active Suspicious Flags</span>
                <strong className="text-gov-crimson">{summary.highRiskRecords} Flags</strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Avg Risk score rating</span>
                <strong className="text-slate-200">{summary.averageRiskScore}% Score</strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Case Resolved Rate</span>
                <strong className="text-emerald-400">
                  {summary.totalInvestigations > 0 
                    ? `${Math.round((summary.resolvedCases / summary.totalInvestigations) * 100)}%`
                    : '100%'}
                </strong>
              </div>
            </div>
          </div>

          <div className="p-4 rounded border border-gov-blue/15 bg-gov-navy/40 text-xs mt-6">
            <div className="flex items-center text-gov-accent mb-2">
              <Landmark size={14} className="mr-1.5" />
              <strong>Audit Ledger Sync</strong>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Reports compile ledger entries across all regional departments. Flagged anomaly lists synchronize database indexes at 10-minute thresholds.
            </p>
          </div>
        </div>

      </div>

      {/* Row 2: Department Bar details and Vendor list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Department detailed review */}
        <div className="glass-panel p-6 rounded-lg">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-6">
            Departmental Capital Risk Variance
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.departmentFraud} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2541" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(val) => `${val/100000}L`} />
                <YAxis type="category" dataKey="department" tick={{ fill: '#94a3b8', fontSize: 9 }} width={120} tickFormatter={(val) => val.split(' ').slice(2).join(' ') || val} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c2541', borderColor: '#3a506b', color: '#f8fafc' }}
                  formatter={(value) => [formatCurrency(value), 'Suspicious Capital']}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar name="Flagged Capital Value (INR)" dataKey="risk_amount" fill="#e63946" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Flagged Vendors list table */}
        <div className="glass-panel p-6 rounded-lg">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-gov-blue/20 pb-4 mb-4">
            Critical Vendor Risk Catalogs
          </h3>
          
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gov-blue/20 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="py-2">Vendor Name</th>
                  <th className="py-2 text-right">Invoiced Total</th>
                  <th className="py-2 text-right">Suspicious Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-blue/10 text-slate-300">
                {charts.topVendors.map((vend, idx) => (
                  <tr key={idx} className="hover:bg-gov-blue/5">
                    <td className="py-3 font-semibold text-slate-200">{vend.vendor}</td>
                    <td className="py-3 text-right">{formatCurrency(vend.total_amount)}</td>
                    <td className="py-3 text-right font-black text-gov-crimson">{formatCurrency(vend.flagged_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;
