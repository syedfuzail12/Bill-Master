import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Search, Filter, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, actionFilter, logs]);

  const loadData = async () => {
    try {
      const [currentUser, logsData] = await Promise.all([
        base44.auth.me(),
        base44.entities.AuditLog.list('-created_date', 500)
      ]);
      setUser(currentUser);
      setLogs(logsData);
      setFilteredLogs(logsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    setFilteredLogs(filtered);
  };

  const actionTypes = [
    'Create Invoice',
    'Update Invoice',
    'Delete Invoice',
    'Create Item',
    'Update Item',
    'Delete Item',
    'Create Customer',
    'Update Customer',
    'Delete Customer',
    'Payment Received',
    'Approve Invoice Cancellation',
    'Reject Invoice Cancellation'
  ];

  const getActionColor = (action) => {
    if (action.includes('Create')) return 'bg-green-100 text-green-800';
    if (action.includes('Update')) return 'bg-blue-100 text-blue-800';
    if (action.includes('Delete') || action.includes('Cancel')) return 'bg-red-100 text-red-800';
    if (action.includes('Payment')) return 'bg-purple-100 text-purple-800';
    if (action.includes('Approve')) return 'bg-emerald-100 text-emerald-800';
    return 'bg-slate-100 text-slate-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">You don't have permission to access this page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-slate-500 mt-1">Complete activity history and tracking</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actionTypes.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Invoice</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div>
                      <p>{format(new Date(log.created_date), 'MMM dd, yyyy')}</p>
                      <p className="text-xs">{format(new Date(log.created_date), 'hh:mm a')}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getActionColor(log.action)}>
                      {log.action}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{log.user_email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="outline" className="capitalize">
                      {log.user_role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-md">{log.details}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {log.invoice_number || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <ScrollText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No logs found</p>
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Total Logs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{logs.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Today's Activity</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {logs.filter(log => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return new Date(log.created_date) >= today;
            }).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Filtered Results</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{filteredLogs.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Active Users</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {new Set(logs.map(log => log.user_email)).size}
          </p>
        </Card>
      </div>
    </div>
  );
}