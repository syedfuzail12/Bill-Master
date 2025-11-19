import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [applyRounding, setApplyRounding] = useState(true);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [creditTerm, setCreditTerm] = useState('net_7');
  const [amountPaid, setAmountPaid] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchItem, setSearchItem] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersData, itemsData, settingsData] = await Promise.all([
        base44.entities.Customer.list(),
        base44.entities.Item.filter({ status: 'active' }),
        base44.entities.ShopSettings.list()
      ]);
      setCustomers(customersData);
      setItems(itemsData);
      if (settingsData.length > 0) {
        setSettings(settingsData[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const addItem = (item) => {
    setInvoiceItems(prevItems => {
      const existing = prevItems.find(i => i.item_id === item.id);
      if (existing) {
        return prevItems.map(i =>
          i.item_id === item.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.rate } : i
        );
      } else {
        return [...prevItems, {
          item_id: item.id,
          name: item.name,
          hsn: item.hsn_code || '',
          quantity: 1,
          unit: item.unit,
          rate: 0,
          subtotal: 0
        }];
      }
    });
  };

  const updateItem = (index, field, value) => {
    setInvoiceItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index][field] = parseFloat(value) || 0;
      if (field === 'quantity' || field === 'rate') {
        newItems[index].subtotal = newItems[index].quantity * newItems[index].rate;
      }
      return newItems;
    });
  };

  const removeItem = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
    const afterDiscount = subtotal - discount;
    let roundingOff = 0;
    let grandTotal = afterDiscount;
    
    if (applyRounding) {
      const rounded = Math.round(afterDiscount);
      roundingOff = rounded - afterDiscount;
      grandTotal = rounded;
    }
    
    return { subtotal, afterDiscount, roundingOff, grandTotal };
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }
    if (invoiceItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const hasInvalidRate = invoiceItems.some(item => item.rate <= 0);
    if (hasInvalidRate) {
      alert('Please enter valid rates for all items');
      return;
    }

    setLoading(true);

    try {
      const user = await base44.auth.me();
      const { subtotal, roundingOff, grandTotal } = calculateTotals();

      // Generate invoice number
      const invoices = await base44.entities.Invoice.list();
      const prefix = settings?.invoice_prefix || 'INV';
      const invoiceNumber = `${prefix}-${invoices.length + 1}`;

      // Calculate due date if credit
      let dueDate = null;
      if (paymentMode === 'credit') {
        const termDays = parseInt(creditTerm.split('_')[1]);
        const due = new Date();
        due.setDate(due.getDate() + termDays);
        dueDate = due.toISOString().split('T')[0];
      }

      const balanceDue = paymentMode === 'credit' ? grandTotal - amountPaid : 0;

      // Create invoice
      const invoice = await base44.entities.Invoice.create({
        invoice_number: invoiceNumber,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        customer_phone: selectedCustomer.phone,
        customer_address: selectedCustomer.address || '',
        items: invoiceItems,
        subtotal,
        discount,
        rounding_off: roundingOff,
        grand_total: grandTotal,
        payment_mode: paymentMode,
        amount_paid: paymentMode === 'credit' ? amountPaid : grandTotal,
        balance_due: balanceDue,
        credit_term: paymentMode === 'credit' ? creditTerm : null,
        due_date: dueDate,
        status: 'active'
      });

      // Reduce stock for each item
      for (const item of invoiceItems) {
        const dbItem = items.find(i => i.id === item.item_id);
        if (dbItem) {
          await base44.entities.Item.update(item.item_id, {
            quantity_in_stock: dbItem.quantity_in_stock - item.quantity
          });
        }
      }

      // Update customer outstanding credit
      if (balanceDue > 0) {
        await base44.entities.Customer.update(selectedCustomer.id, {
          outstanding_credit: (selectedCustomer.outstanding_credit || 0) + balanceDue
        });
      }

      // Audit log
      await base44.entities.AuditLog.create({
        action: 'Create Invoice',
        user_email: user.email,
        user_role: user.role,
        details: `Invoice ${invoiceNumber} created for ${selectedCustomer.name}, Amount: ₹${grandTotal}`,
        invoice_number: invoiceNumber
      });

      alert('Invoice created successfully!');
      window.location.href = createPageUrl('ViewInvoice') + '?id=' + invoice.id;
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice');
      setLoading(false);
    }
  };

  const { subtotal, roundingOff, grandTotal } = calculateTotals();
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchItem.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create Invoice</h1>
        <p className="text-slate-500 mt-1">Generate a new invoice</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Customer *</Label>
                <Select
                  value={selectedCustomer?.id || ''}
                  onValueChange={(value) => {
                    const customer = customers.find(c => c.id === value);
                    setSelectedCustomer(customer);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCustomer && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-1">
                  <p className="text-sm"><strong>Phone:</strong> {selectedCustomer.phone}</p>
                  {selectedCustomer.address && (
                    <p className="text-sm"><strong>Address:</strong> {selectedCustomer.address}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoiceItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg">
                    <div className="col-span-4">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.unit}</p>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Rate"
                        value={item.rate || ''}
                        onChange={(e) => updateItem(index, 'rate', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-3">
                      <p className="font-semibold">₹{item.subtotal.toFixed(2)}</p>
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Payment Mode *</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMode === 'credit' && (
                <>
                  <div>
                    <Label>Credit Terms *</Label>
                    <Select value={creditTerm} onValueChange={setCreditTerm}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="net_7">Net 7 Days</SelectItem>
                        <SelectItem value="net_15">Net 15 Days</SelectItem>
                        <SelectItem value="net_30">Net 30 Days</SelectItem>
                        <SelectItem value="net_45">Net 45 Days</SelectItem>
                        <SelectItem value="net_60">Net 60 Days</SelectItem>
                        <SelectItem value="net_90">Net 90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount Paid Now</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Discount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="applyRounding"
                  checked={applyRounding}
                  onChange={(e) => setApplyRounding(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="applyRounding" className="cursor-pointer">Apply Rounding Off</Label>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span className="font-medium text-red-600">-₹{discount.toFixed(2)}</span>
                </div>
                {applyRounding && calculateTotals().roundingOff !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Rounding Off:</span>
                    <span className="font-medium">{calculateTotals().roundingOff > 0 ? '+' : ''}₹{calculateTotals().roundingOff.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Grand Total:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                {paymentMode === 'credit' && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>Balance Due:</span>
                    <span className="font-semibold">₹{(grandTotal - amountPaid).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Save className="h-5 w-5 mr-2" />
                {loading ? 'Creating...' : 'Create Invoice'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Item Selection Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Add Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search items..."
                    value={searchItem}
                    onChange={(e) => setSearchItem(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addItem(item)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                    >
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-slate-500">Stock: {item.quantity_in_stock} {item.unit}</p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}