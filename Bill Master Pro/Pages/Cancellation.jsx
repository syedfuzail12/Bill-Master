import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Cancellations() {
  const [invoices, setInvoices] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [currentUser, pendingInvoices] = await Promise.all([
        base44.auth.me(),
        base44.entities.Invoice.filter({ status: 'pending_cancel' }, '-created_date')
      ]);
      setUser(currentUser);
      setInvoices(pendingInvoices);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleApprove = async (invoice) => {
    if (!confirm(`Approve cancellation for ${invoice.invoice_number}? Stock will be restored.`)) return;

    try {
      // Update invoice status
      await base44.entities.Invoice.update(invoice.id, {
        status: 'cancelled',
        cancelled_by: user.email,
        cancelled_date: new Date().toISOString()
      });

      // Restore stock for each item
      for (const item of invoice.items) {
        const dbItems = await base44.entities.Item.filter({ id: item.item_id });
        if (dbItems.length > 0) {
          const dbItem = dbItems[0];
          await base44.entities.Item.update(item.item_id, {
            quantity_in_stock: dbItem.quantity_in_stock + item.quantity
          });
        }
      }

      // Update customer outstanding credit if there was balance due
      if (invoice.balance_due > 0) {
        const customers = await base44.entities.Customer.filter({ id: invoice.customer_id });
        if (customers.length > 0) {
          await base44.entities.Customer.update(invoice.customer_id, {
            outstanding_credit: Math.max(0, (customers[0].outstanding_credit || 0) - invoice.balance_due)
          });
        }
      }

      // Audit log
      await base44.entities.AuditLog.create({
        action: 'Approve Invoice Cancellation',
        user_email: user.email,
        user_role: user.role,
        details: `Invoice ${invoice.invoice_number} cancellation approved. Stock restored.`,
        invoice_number: invoice.invoice_number
      });

      alert('Invoice cancellation approved. Stock has been restored.');
      loadData();
    } catch (error) {
      console.error('Error approving cancellation:', error);
      alert('Error approving cancellation');
    }
  };

  const handleReject = async () => {
    if (!selectedInvoice) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      // Return invoice to active status
      await base44.entities.Invoice.update(selectedInvoice.id, {
        status: 'active',
        cancellation_reason: rejectionReason
      });

      // Audit log
      await base44.entities.AuditLog.create({
        action: 'Reject Invoice Cancellation',
        user_email: user.email,
        user_role: user.role,
        details: `Invoice ${selectedInvoice.invoice_number} cancellation rejected. Reason: ${rejectionReason}`,
        invoice_number: selectedInvoice.invoice_number
      });

      alert('Invoice cancellation rejected');
      setShowRejectModal(false);
      setSelectedInvoice(null);
      setRejectionReason('');
      loadData();
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      alert('Error rejecting cancellation');
    }
  };

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
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
        <h1 className="text-3xl font-bold text-slate-900">Cancellation Requests</h1>
        <p className="text-slate-500 mt-1">Review and manage invoice cancellation requests</p>
      </div>

      {/* Summary */}
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 rounded-lg">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Pending Requests</p>
            <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
          </div>
        </div>
      </Card>

      {/* Requests Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Invoice No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Requested By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{invoice.invoice_number}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{invoice.customer_name}</p>
                    <p className="text-sm text-slate-500">{invoice.customer_phone}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">₹{invoice.grand_total.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{invoice.created_by}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 max-w-xs">{invoice.cancellation_reason || 'No reason provided'}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {format(new Date(invoice.updated_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <Link to={createPageUrl('ViewInvoice') + '?id=' + invoice.id}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleApprove(invoice)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowRejectModal(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {invoices.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No pending cancellation requests</p>
            </div>
          )}
        </div>
      </Card>

      {/* Reject Modal */}
      {showRejectModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Reject Cancellation Request</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Invoice</p>
                <p className="font-medium">{selectedInvoice.invoice_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Rejection Reason *</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  placeholder="Provide reason for rejection..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedInvoice(null);
                    setRejectionReason('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  variant="destructive"
                  className="flex-1"
                >
                  Reject Request
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}