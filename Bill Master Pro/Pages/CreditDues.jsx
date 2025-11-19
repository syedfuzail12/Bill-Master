import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Eye, DollarSign, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function CreditDues() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  useEffect(() => {
    loadDues();
  }, []);

  useEffect(() => {
    filterDues();
  }, [filter, invoices]);

  const loadDues = async () => {
    try {
      const data = await base44.entities.Invoice.filter({ payment_mode: 'credit' }, '-due_date');
      const withDues = data.filter(inv => inv.balance_due > 0);
      setInvoices(withDues);
      setFilteredInvoices(withDues);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dues:', error);
      setLoading(false);
    }
  };

  const filterDues = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = [...invoices];

    if (filter === 'overdue') {
      filtered = filtered.filter(inv => {
        if (!inv.due_date) return false;
        const dueDate = new Date(inv.due_date);
        return dueDate < today;
      });
    } else if (filter === 'due_soon') {
      filtered = filtered.filter(inv => {
        if (!inv.due_date) return false;
        const dueDate = new Date(inv.due_date);
        const daysUntilDue = differenceInDays(dueDate, today);
        return daysUntilDue >= 0 && daysUntilDue <= 7;
      });
    }

    setFilteredInvoices(filtered);
  };

  const handlePayment = async () => {
    if (!selectedInvoice || paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (paymentAmount > selectedInvoice.balance_due) {
      alert('Payment amount cannot exceed balance due');
      return;
    }

    try {
      const user = await base44.auth.me();
      const newBalance = selectedInvoice.balance_due - paymentAmount;
      const newAmountPaid = selectedInvoice.amount_paid + paymentAmount;

      await base44.entities.Invoice.update(selectedInvoice.id, {
        balance_due: newBalance,
        amount_paid: newAmountPaid
      });

      // Update customer outstanding credit
      const customer = await base44.entities.Customer.filter({ id: selectedInvoice.customer_id });
      if (customer.length > 0) {
        await base44.entities.Customer.update(selectedInvoice.customer_id, {
          outstanding_credit: Math.max(0, (customer[0].outstanding_credit || 0) - paymentAmount)
        });
      }

      await base44.entities.AuditLog.create({
        action: 'Payment Received',
        user_email: user.email,
        user_role: user.role,
        details: `Payment received for ${selectedInvoice.invoice_number}: ₹${paymentAmount}`,
        invoice_number: selectedInvoice.invoice_number
      });

      alert('Payment recorded successfully!');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentAmount(0);
      loadDues();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment');
    }
  };

  const getDaysStatus = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    const days = differenceInDays(due, today);

    if (days < 0) {
      return { text: `${Math.abs(days)} days overdue`, variant: 'destructive' };
    } else if (days === 0) {
      return { text: 'Due today', variant: 'destructive' };
    } else if (days === 1) {
      return { text: 'Due tomorrow', variant: 'secondary' };
    } else if (days <= 7) {
      return { text: `Due in ${days} days`, variant: 'secondary' };
    }
    return { text: `Due in ${days} days`, variant: 'outline' };
  };

  const totalDue = filteredInvoices.reduce((sum, inv) => sum + inv.balance_due, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Credit & Dues</h1>
        <p className="text-slate-500 mt-1">Track and manage outstanding payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Outstanding</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">₹{totalDue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Invoices</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{filteredInvoices.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Overdue Invoices</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {invoices.filter(inv => {
                  if (!inv.due_date) return false;
                  return new Date(inv.due_date) < new Date();
                }).length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dues</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="due_soon">Due in 7 Days</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Invoices Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Invoice No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Balance Due</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredInvoices.map((invoice) => {
                const status = getDaysStatus(invoice.due_date);
                return (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{invoice.invoice_number}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{invoice.customer_name}</p>
                      <p className="text-sm text-slate-500">{invoice.customer_phone}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">₹{invoice.grand_total.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">₹{invoice.amount_paid.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-red-600">₹{invoice.balance_due.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {status && <Badge variant={status.variant}>{status.text}</Badge>}
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
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setPaymentAmount(invoice.balance_due);
                            setShowPaymentModal(true);
                          }}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No outstanding dues</p>
            </div>
          )}
        </div>
      </Card>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Record Payment</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Invoice</p>
                <p className="font-medium">{selectedInvoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-medium">{selectedInvoice.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Balance Due</p>
                <p className="text-xl font-bold text-red-600">₹{selectedInvoice.balance_due.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Payment Amount</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  max={selectedInvoice.balance_due}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedInvoice(null);
                    setPaymentAmount(0);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handlePayment} className="flex-1">
                  Record Payment
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
