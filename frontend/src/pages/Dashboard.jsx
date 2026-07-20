import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  FileText, ShieldAlert, FileSignature, CheckCircle2, Gauge, AlertTriangle, ArrowUpRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = ['#06d6a0', '#3a506b', '#e0a96d', '#e63946'];

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/analytics/summary');
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch platform metrics. Verify server status.');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gov-accent border-t-transparent"></div>
          <p className="text-slate-400 text-xs font-semibold tracking-wider">RETRIEVING AUDIT LEDGER DATA...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-gov-crimson/10 border border-gov-crimson/20 rounded-md text-gov-crimson text-sm flex items-center">
        <AlertTriangle className="mr-3" />
        <span>{error}</span>
      </div>
    );
  }

  const { summary, charts } = data;

  const kpis = [
    { 
      title: 'Total Financial Records', 
      value: summary.totalRecords, 
      desc: 'Monitored digital items', 
      icon: FileText, 
      color: 'text-gov-accent bg-gov-accent/10 border-gov-accent/20' 
    },
    { 
      title: 'High Risk Records', 
      value: summary.highRiskRecords, 
      desc: 'Risk score ≥ 70', 
      icon: ShieldAlert, 
      color: 'text-gov-crimson bg-gov-crimson/10 border-gov-crimson/20' 
    },
    { 
      title: 'Active Investigations', 
      value: summary.activeInvestigations ?? summary.totalInvestigations, 
      desc: user?.role === 'Admin' ? 'Total active investigations' : 'Assigned to your desk', 
      icon: FileSignature, 
      color: 'text-gov-gold bg-gov-gold/10 border-gov-gold/20' 
    },
    { 
      title: 'Resolved Cases', 
      value: summary.resolvedCases, 
      desc: 'Audit verified closures', 
      icon: CheckCircle2, 
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
    },
    { 
      title: 'Average Risk Score', 
      value: `${summary.averageRiskScore}%`, 
      desc: 'Platform average severity', 
      icon: Gauge, 
      color: 'text-slate-300 bg-gov-blue/20 border-gov-blue/30' 
    },
  ];

  // Formatter for Currency
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
      <div className="glass-panel p-6 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 uppercase tracking-wider">
            Integrity Oversight Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time financial audits, automated transaction risk classification, and case file reviews.
          </p>
        </div>
        <div className="text-xs text-gov-gold font-bold bg-gov-gold/10 border border-gov-gold/20 px-3 py-1.5 rounded uppercase self-start md:self-auto">
          Secure Session Expires in 24 Hours
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-card rounded-lg p-5 border flex flex-col justify-between h-32 hover:translate-y-[-2px] transition-transform">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                  {kpi.title}
                </span>
                <span className={`p-1.5 rounded border ${kpi.color}`}>
                  <Icon size={16} />
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-100">{kpi.value}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{kpi.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Department-wise Fraud Risk */}
        <div className="glass-panel p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              Department-wise High Risk Distribution
            </h3>
            <span className="text-[10px] text-gov-accent font-semibold tracking-wider uppercase">Count / Flagged Amount</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.departmentFraud}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2541" />
                <XAxis dataKey="department" tick={{ fill: '#94a3b8', fontSize: 9 }} interval={0} tickFormatter={(val) => val.split(' ').slice(2).join(' ') || val} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c2541', borderColor: '#3a506b', color: '#f8fafc' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar name="Flagged Cases Count" dataKey="high_risk_count" fill="#e63946" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="glass-panel p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              Monthly Flagged Anomaly Trends (2026)
            </h3>
            <span className="text-[10px] text-gov-crimson font-semibold tracking-wider uppercase">Risk Exposure</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2541" />
                <XAxis dataKey="month_name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c2541', borderColor: '#3a506b', color: '#f8fafc' }}
                  formatter={(value, name) => name === 'risk_amount' ? [formatCurrency(value), 'Capital At Risk'] : [value, 'High Risk Records']}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line name="High Risk Items" type="monotone" dataKey="high_risk_count" stroke="#e0a96d" strokeWidth={3} activeDot={{ r: 6 }} />
                <Line name="Risk Capital (INR)" type="monotone" dataKey="risk_amount" stroke="#e63946" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Breakdown */}
        <div className="glass-panel p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              Database Risk Classification breakdown
            </h3>
            <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Severity Index</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center h-72">
            <div className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="risk_tier"
                  >
                    {charts.riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1c2541', borderColor: '#3a506b', color: '#f8fafc' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {charts.riskDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-gov-navy/40 border border-gov-blue/10">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="text-xs text-slate-300 font-semibold">{item.risk_tier}</span>
                  </div>
                  <span className="text-xs font-black text-slate-200">{item.count} items</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Vendors Flagged */}
        <div className="glass-panel p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              Top Vendors by Flagged Exposure
            </h3>
            <span className="text-[10px] text-gov-gold font-semibold tracking-wider uppercase">High Capital Flags</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topVendors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2541" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(val) => `${val/100000}L`} />
                <YAxis type="category" dataKey="vendor" tick={{ fill: '#94a3b8', fontSize: 9 }} width={120} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c2541', borderColor: '#3a506b', color: '#f8fafc' }}
                  formatter={(value) => [formatCurrency(value), 'Suspicious Capital']}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar name="Suspicious Amount (INR)" dataKey="flagged_amount" fill="#e63946" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Quick Desk Action Items */}
      <div className="glass-panel p-6 rounded-lg">
        <div className="border-b border-gov-blue/20 pb-4 mb-4 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
            Investigator Workspace Actions
          </h3>
          <span className="text-[10px] text-slate-400">Desk shortcut routing</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/records" className="p-4 rounded border border-gov-blue/10 bg-gov-navy/30 hover:bg-gov-blue/10 transition-colors flex items-center justify-between group">
            <div>
              <h4 className="text-xs font-bold text-slate-200">Financial Records Ledger</h4>
              <p className="text-[10px] text-slate-500 mt-1">Review, add, or query transactions</p>
            </div>
            <ArrowUpRight size={16} className="text-slate-500 group-hover:text-gov-accent transition-colors" />
          </Link>
          <Link to="/alerts" className="p-4 rounded border border-gov-blue/10 bg-gov-navy/30 hover:bg-gov-blue/10 transition-colors flex items-center justify-between group">
            <div>
              <h4 className="text-xs font-bold text-slate-200">AI Risk Queue</h4>
              <p className="text-[10px] text-slate-500 mt-1">Review anomaly flags & assign cases</p>
            </div>
            <ArrowUpRight size={16} className="text-slate-500 group-hover:text-gov-crimson transition-colors" />
          </Link>
          <Link to="/investigations" className="p-4 rounded border border-gov-blue/10 bg-gov-navy/30 hover:bg-gov-blue/10 transition-colors flex items-center justify-between group">
            <div>
              <h4 className="text-xs font-bold text-slate-200">Investigation Workbench</h4>
              <p className="text-[10px] text-slate-500 mt-1">Review open case logs and AI writeups</p>
            </div>
            <ArrowUpRight size={16} className="text-slate-500 group-hover:text-gov-gold transition-colors" />
          </Link>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
