import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  Search, Filter, ChevronLeft, ChevronRight, Plus, Trash2, X, AlertTriangle, FileSpreadsheet, Eye
} from 'lucide-react';

const DEPARTMENTS = [
  'Department of Urban Development',
  'Department of Welfare and Social Justice',
  'Department of Information Technology',
  'Department of Public Works (PWD)',
  'Department of Health & Family Welfare',
  'Department of Agriculture and Rural Cooperatives'
];

const Records = () => {
  const { user } = useContext(AuthContext);
  
  // Records State
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters State
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [fraudStatus, setFraudStatus] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Modals / Drawer State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecordData, setNewRecordData] = useState({
    department: '',
    vendor: '',
    invoice_number: '',
    payment_method: 'Direct Bank Transfer',
    amount: '',
    purpose: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    risk_score: 0,
    fraud_status: 'unflagged',
    fraud_reasons: []
  });

  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(department && { department }),
        ...(status && { status }),
        ...(fraudStatus && { fraud_status: fraudStatus }),
      };

      const res = await axios.get('/api/records', { params });
      setRecords(res.data.records);
      setTotalRecords(res.data.pagination.total);
      setTotalPages(res.data.pagination.pages);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch financial record registers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, department, status, fraudStatus, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const { department, vendor, invoice_number, payment_method, amount, purpose, date, status } = newRecordData;
    
    if (!department || !vendor || !invoice_number || !payment_method || !amount || !purpose || !date || !status) {
      setAddError('Please complete all required fields.');
      return;
    }

    try {
      setAddLoading(true);
      setAddError('');
      
      const payload = {
        ...newRecordData,
        amount: parseFloat(amount),
        risk_score: parseInt(newRecordData.risk_score),
        fraud_reasons: newRecordData.fraud_reasons
      };

      await axios.post('/api/records', payload);
      setShowAddModal(false);
      // Reset form
      setNewRecordData({
        department: '',
        vendor: '',
        invoice_number: '',
        payment_method: 'Direct Bank Transfer',
        amount: '',
        purpose: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        risk_score: 0,
        fraud_status: 'unflagged',
        fraud_reasons: []
      });
      setPage(1);
      fetchRecords();
    } catch (err) {
      console.error(err);
      setAddError(err.response?.data?.message || 'Failed to submit records.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm('WARNING: Are you sure you want to permanently delete this audit record? This action is logged.')) {
      return;
    }
    try {
      await axios.delete(`/api/records/${id}`);
      setSelectedRecord(null);
      fetchRecords();
    } catch (err) {
      console.error(err);
      alert('Deletion failed. Verify credentials.');
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
      
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 uppercase tracking-wider">
            Ledger Catalog Directory
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Overview of all digitized government payments, disbursements, and contracts.
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center px-4 py-2 text-xs font-bold text-slate-900 bg-gov-accent hover:bg-gov-accent/90 rounded uppercase tracking-wider transition-colors"
        >
          <Plus size={16} className="mr-1.5" />
          Ingest New Record
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-5 rounded-lg">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          
          {/* Search bar */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">
              Search parameters
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ID, Vendor, Invoice, Purpose..."
                className="w-full glass-input pl-9 text-xs focus:border-gov-accent"
              />
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search size={14} />
              </span>
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
              className="w-full glass-input text-xs focus:border-gov-accent"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept, idx) => (
                <option key={idx} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">
              Approval Status
            </label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full glass-input text-xs focus:border-gov-accent"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Search / Reset buttons */}
          <div className="flex space-x-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 border border-gov-blue/40 text-slate-200 hover:text-white bg-gov-blue/20 hover:bg-gov-blue/30 text-xs font-bold rounded uppercase tracking-wider transition-colors"
            >
              Query
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDepartment('');
                setStatus('');
                setFraudStatus('');
                setPage(1);
                // Call fetch with cleared params
                axios.get('/api/records', { params: { page: 1, limit } })
                  .then(res => {
                    setRecords(res.data.records);
                    setTotalRecords(res.data.pagination.total);
                    setTotalPages(res.data.pagination.pages);
                  });
              }}
              className="px-3 py-2 border border-slate-700/50 hover:bg-slate-800 text-slate-400 hover:text-slate-300 text-xs font-bold rounded uppercase tracking-wider transition-colors"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Database Listing Grid */}
      <div className="glass-panel rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gov-accent border-t-transparent"></div>
            <p className="text-xs text-slate-400">Loading catalog items...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-gov-crimson text-xs font-semibold">{error}</div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            <FileSpreadsheet className="mx-auto text-slate-600 mb-3" size={32} />
            No records matched the system queries.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gov-blue/20 bg-gov-slate/40 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3 px-6">ID</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Risk</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-blue/10 text-xs text-slate-300">
                {records.map((rec) => {
                  // Determine risk badge color
                  let riskColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
                  if (rec.risk_score >= 70) {
                    riskColor = 'text-gov-crimson bg-gov-crimson/10 border-gov-crimson/25';
                  } else if (rec.risk_score >= 40) {
                    riskColor = 'text-gov-gold bg-gov-gold/10 border-gov-gold/25';
                  }

                  // Determine status color
                  let statusColor = 'text-slate-400 bg-slate-800 border-slate-700/50';
                  if (rec.status === 'Approved') statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                  if (rec.status === 'Rejected') statusColor = 'text-gov-crimson bg-gov-crimson/10 border-gov-crimson/20';

                  return (
                    <tr key={rec.id} className="hover:bg-gov-blue/5 transition-colors border-b border-gov-blue/5">
                      <td className="py-4 px-6 font-bold text-gov-accent">{rec.record_number}</td>
                      <td className="py-4 px-4 font-semibold truncate max-w-[150px]">{rec.vendor}</td>
                      <td className="py-4 px-4 text-[11px] truncate max-w-[150px]">{rec.department}</td>
                      <td className="py-4 px-4 text-right font-black text-slate-200">{formatCurrency(rec.amount)}</td>
                      <td className="py-4 px-4 text-slate-400">{new Date(rec.date).toLocaleDateString('en-GB')}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${riskColor}`}>
                          {rec.risk_score}%
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="p-1 text-slate-400 hover:text-gov-accent hover:bg-gov-blue/10 rounded transition-colors"
                          title="Open Case File Detail"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Panel */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gov-blue/20 bg-gov-slate/20">
            <span className="text-xs text-slate-400">
              Showing page <strong className="text-slate-200">{page}</strong> of <strong className="text-slate-200">{totalPages}</strong> ({totalRecords} records)
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-slate-700/50 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-slate-700/50 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record details modal (Drawer style) */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg h-full glass-panel border-l border-gov-blue/20 p-6 flex flex-col justify-between overflow-y-auto">
            
            {/* Header */}
            <div>
              <div className="flex justify-between items-center border-b border-gov-blue/25 pb-4 mb-5">
                <div>
                  <span className="text-[10px] text-gov-gold font-bold uppercase tracking-widest">RECORD META INSPECTION</span>
                  <h2 className="text-md font-extrabold text-slate-100 uppercase">{selectedRecord.record_number}</h2>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Grid content */}
              <div className="space-y-4 text-xs text-slate-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gov-navy/40 rounded border border-gov-blue/10">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Vendor</span>
                    <strong className="text-slate-200">{selectedRecord.vendor}</strong>
                  </div>
                  <div className="p-3 bg-gov-navy/40 rounded border border-gov-blue/10">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Invoice Number</span>
                    <strong className="text-slate-200">{selectedRecord.invoice_number}</strong>
                  </div>
                </div>

                <div className="p-3 bg-gov-navy/40 rounded border border-gov-blue/10">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Department</span>
                  <strong className="text-slate-200">{selectedRecord.department}</strong>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gov-navy/40 rounded border border-gov-blue/10">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Disbursement Amount</span>
                    <strong className="text-gov-accent font-black text-sm">{formatCurrency(selectedRecord.amount)}</strong>
                  </div>
                  <div className="p-3 bg-gov-navy/40 rounded border border-gov-blue/10">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Transfer Date</span>
                    <strong className="text-slate-200">{new Date(selectedRecord.date).toLocaleDateString('en-GB')}</strong>
                  </div>
                </div>

                <div className="p-3 bg-gov-navy/40 rounded border border-gov-blue/10">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Payment Method</span>
                  <strong className="text-slate-200">{selectedRecord.payment_method}</strong>
                </div>

                <div className="p-3 bg-gov-navy/40 rounded border border-gov-blue/10">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Purpose of Fund Allocation</span>
                  <p className="text-slate-300 leading-relaxed mt-1 font-medium">{selectedRecord.purpose}</p>
                </div>

                {/* Risk scoring detail */}
                <div className="p-4 bg-gov-navy/70 border border-gov-blue/20 rounded-md">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Fraud Risk Rating</span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-black border ${selectedRecord.risk_score >= 70 ? 'text-gov-crimson bg-gov-crimson/10 border-gov-crimson/30' : 'text-gov-gold bg-gov-gold/10 border-gov-gold/30'}`}>
                      {selectedRecord.risk_score}%
                    </span>
                  </div>
                  {selectedRecord.fraud_status === 'flagged' || selectedRecord.risk_score >= 70 ? (
                    <div className="space-y-2">
                      <div className="flex items-start text-gov-crimson text-[11px] font-medium">
                        <AlertTriangle size={14} className="mr-1.5 shrink-0 mt-0.5" />
                        <span>This transaction is flagged due to key anomaly classifications:</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                        {selectedRecord.fraud_reasons?.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-[11px]">This transaction lies within standard statistical variance. No anomaly flags raised.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-gov-blue/20 pt-4 mt-6 flex gap-3">
              {user.role === 'Admin' && (
                <button
                  onClick={() => handleDeleteRecord(selectedRecord.id)}
                  className="flex-1 flex justify-center items-center py-2 px-4 rounded text-xs font-bold text-gov-crimson hover:text-white bg-gov-crimson/5 hover:bg-gov-crimson border border-gov-crimson/30 hover:border-gov-crimson transition-all uppercase tracking-wider"
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Discard Record
                </button>
              )}
              <button
                onClick={() => setSelectedRecord(null)}
                className="flex-1 py-2 border border-slate-700/50 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded uppercase tracking-wider transition-colors"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-panel border border-gov-blue/25 rounded-lg p-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gov-blue/20 pb-4 mb-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
                Ingest New Government Financial Record
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {addError && (
              <div className="mb-4 p-3 bg-gov-crimson/10 border border-gov-crimson/20 rounded text-gov-crimson text-xs flex items-center">
                <AlertTriangle size={14} className="mr-2" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                {/* Vendor */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Vendor Name *</label>
                  <input
                    type="text"
                    required
                    value={newRecordData.vendor}
                    onChange={(e) => setNewRecordData({ ...newRecordData, vendor: e.target.value })}
                    className="w-full glass-input text-xs"
                    placeholder="e.g. TechnoCore Systems"
                  />
                </div>
                {/* Invoice number */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={newRecordData.invoice_number}
                    onChange={(e) => setNewRecordData({ ...newRecordData, invoice_number: e.target.value })}
                    className="w-full glass-input text-xs"
                    placeholder="e.g. INV-99081"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Allocated Department *</label>
                <select
                  required
                  value={newRecordData.department}
                  onChange={(e) => setNewRecordData({ ...newRecordData, department: e.target.value })}
                  className="w-full glass-input text-xs"
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Disbursement Amount (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newRecordData.amount}
                    onChange={(e) => setNewRecordData({ ...newRecordData, amount: e.target.value })}
                    className="w-full glass-input text-xs font-semibold text-gov-accent"
                    placeholder="0.00"
                  />
                </div>
                {/* Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Transaction Date *</label>
                  <input
                    type="date"
                    required
                    value={newRecordData.date}
                    onChange={(e) => setNewRecordData({ ...newRecordData, date: e.target.value })}
                    className="w-full glass-input text-xs text-slate-200"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Payment Channel *</label>
                <select
                  required
                  value={newRecordData.payment_method}
                  onChange={(e) => setNewRecordData({ ...newRecordData, payment_method: e.target.value })}
                  className="w-full glass-input text-xs"
                >
                  <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                  <option value="Electronic Fund Transfer (EFT)">Electronic Fund Transfer (EFT)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI / IMPS">UPI / IMPS</option>
                  <option value="Treasury Voucher">Treasury Voucher</option>
                </select>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Purpose explanation *</label>
                <textarea
                  required
                  rows={3}
                  value={newRecordData.purpose}
                  onChange={(e) => setNewRecordData({ ...newRecordData, purpose: e.target.value })}
                  className="w-full glass-input text-xs"
                  placeholder="Summarize the contract, welfare target, or procurement purpose..."
                />
              </div>

              {/* Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">System Approval Status *</label>
                  <select
                    required
                    value={newRecordData.status}
                    onChange={(e) => setNewRecordData({ ...newRecordData, status: e.target.value })}
                    className="w-full glass-input text-xs"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                {/* Risk manual flag option for development */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Demo Risk Flag Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRecordData.risk_score}
                    onChange={(e) => {
                      const score = parseInt(e.target.value) || 0;
                      // Auto flagged if >= 70
                      setNewRecordData({ 
                        ...newRecordData, 
                        risk_score: score, 
                        fraud_status: score >= 70 ? 'flagged' : 'unflagged',
                        fraud_reasons: score >= 70 ? ['Manual evaluation risk rating over 70'] : []
                      });
                    }}
                    className="w-full glass-input text-xs text-slate-200"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gov-blue/20 pt-4 mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-700/50 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-gov-accent hover:bg-gov-accent/90 text-slate-900 text-xs font-bold rounded uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {addLoading ? 'Ingesting...' : 'Ingest record'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Records;
