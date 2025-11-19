import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, Download, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  
  const convertBelow1000 = (n) => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertBelow1000(n % 100) : '');
  };

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let result = '';
  if (crore > 0) result += convertBelow1000(crore) + ' Crore ';
  if (lakh > 0) result += convertBelow1000(lakh) + ' Lakh ';
  if (thousand > 0) result += convertBelow1000(thousand) + ' Thousand ';
  if (remainder > 0) result += convertBelow1000(remainder);

  return result.trim();
};

export default function ViewInvoice() {
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, []);

  const loadInvoice = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const invoiceId = params.get('id');

      if (!invoiceId) {
        alert('Invoice ID is required');
        return;
      }

      const [invoiceData, settingsList] = await Promise.all([
        base44.entities.Invoice.filter({ id: invoiceId }),
        base44.entities.ShopSettings.list()
      ]);

      if (invoiceData.length > 0) {
        setInvoice(invoiceData[0]);
      }

      if (settingsList.length > 0) {
        setSettings(settingsList[0]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading invoice:', error);
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Invoice not found</p>
        <Link to={createPageUrl('Invoices')}>
          <Button className="mt-4">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Action Buttons - Hidden on Print */}
      <div className="print:hidden mb-6 flex items-center justify-between">
        <Link to={createPageUrl('Invoices')}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex gap-3">
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
        </div>
      </div>

      {/* Invoice Design - Matches Sample Image */}
      <Card className="max-w-4xl mx-auto bg-white p-8 print:shadow-none print:border-none">
        {/* Header */}
        <div className="border-2 border-slate-300 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start gap-4">
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="h-16 w-16 object-contain" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900 uppercase">
                  {settings?.shop_name || 'SHOP NAME'}
                </h1>
                <p className="text-sm text-slate-600">{settings?.address || 'Address'}</p>
                <p className="text-sm text-slate-600">
                  {settings?.city}, {settings?.state}
                </p>
                <p className="text-sm text-slate-600">Contact No.: {settings?.phone}</p>
                {settings?.email && (
                  <p className="text-sm text-slate-600">Email: {settings.email}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium"># Inv. No: {invoice.invoice_number}</p>
              <p className="text-sm">Inv. Date: {format(new Date(invoice.created_date), 'dd-MM-yy')}</p>
              <p className="text-sm">Payment Mode: {invoice.payment_mode.toUpperCase()}</p>
              {invoice.payment_mode === 'credit' && invoice.due_date && (
                <p className="text-sm font-bold text-red-600">
                  Due Date: {format(new Date(invoice.due_date), 'dd-MM-yy')}
                </p>
              )}
            </div>
          </div>

          {/* Bill To Section */}
          <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-200">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Bill To</p>
              <p className="font-medium text-slate-900">Name: {invoice.customer_name}</p>
              <p className="text-sm text-slate-600">Address: {invoice.customer_address || 'N/A'}</p>
              <p className="text-sm text-slate-600">Phone: {invoice.customer_phone}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Ship To</p>
              <p className="font-medium text-slate-900">Name: {invoice.customer_name}</p>
              <p className="text-sm text-slate-600">Address: {invoice.customer_address || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse border border-slate-300 mb-6">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold">Sr</th>
              <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold">
                Goods & Service Description
              </th>
              <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold">HSN</th>
              <th className="border border-slate-300 px-3 py-2 text-right text-xs font-semibold">Quantity</th>
              <th className="border border-slate-300 px-3 py-2 text-right text-xs font-semibold">Rate</th>
              <th className="border border-slate-300 px-3 py-2 text-right text-xs font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, index) => (
              <tr key={index}>
                <td className="border border-slate-300 px-3 py-2 text-sm">{index + 1}</td>
                <td className="border border-slate-300 px-3 py-2 text-sm">{item.name}</td>
                <td className="border border-slate-300 px-3 py-2 text-sm">{item.hsn || '-'}</td>
                <td className="border border-slate-300 px-3 py-2 text-sm text-right">
                  {item.quantity} {item.unit}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-sm text-right">
                  {item.rate.toFixed(2)}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-sm text-right font-medium">
                  {item.subtotal.toFixed(2)}
                </td>
              </tr>
            ))}
            {/* Empty rows for spacing */}
            {[...Array(Math.max(0, 5 - (invoice.items?.length || 0)))].map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-slate-300 px-3 py-6">&nbsp;</td>
                <td className="border border-slate-300 px-3 py-6">&nbsp;</td>
                <td className="border border-slate-300 px-3 py-6">&nbsp;</td>
                <td className="border border-slate-300 px-3 py-6">&nbsp;</td>
                <td className="border border-slate-300 px-3 py-6">&nbsp;</td>
                <td className="border border-slate-300 px-3 py-6">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Section */}
        <div className="border-2 border-slate-300 p-4">
          {/* Amount in Words */}
          <div className="mb-4 pb-4 border-b border-slate-300">
            <p className="text-sm font-semibold">Amount in Words:</p>
            <p className="text-sm font-bold text-slate-900">
              {numberToWords(Math.round(invoice.grand_total))} Rupees Only
            </p>
          </div>

          <div className="flex justify-between items-start gap-6">
            {/* Left: Bank Details */}
            <div className="w-1/2">
              {/* Bank Details */}
              {(settings?.bank_name || settings?.account_number) && (
                <div>
                  <p className="text-xs font-bold text-slate-900 mb-2">Bank Details</p>
                  {settings?.bank_name && (
                    <p className="text-xs font-semibold text-slate-700">Bank: {settings.bank_name}</p>
                  )}
                  {settings?.account_number && (
                    <p className="text-xs font-semibold text-slate-700">A/c No.: {settings.account_number}</p>
                  )}
                  {settings?.ifsc_code && (
                    <p className="text-xs font-semibold text-slate-700">IFSC: {settings.ifsc_code}</p>
                  )}
                  {settings?.bank_address && (
                    <p className="text-xs font-semibold text-slate-700">Branch: {settings.bank_address}</p>
                  )}
                </div>
                )}
                </div>

                {/* Right: UPI Details */}
                <div className="w-1/2">
                <p className="text-xs font-bold text-slate-900 mb-2">UPI Payment</p>
                {settings?.upi_qr_url && (
                <img
                  src={settings.upi_qr_url}
                  alt="UPI QR"
                  className="h-24 w-24 border border-slate-300 mb-1"
                />
                )}
                {settings?.upi_id && (
                <p className="text-xs font-semibold text-slate-700">UPI ID: {settings.upi_id}</p>
                )}
                </div>

            {/* Right: Summary */}
            <div className="w-1/2">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Sub-Total:</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Discount:</span>
                  <span>{invoice.discount > 0 ? '-' : ''}₹{(invoice.discount || 0).toFixed(2)}</span>
                </div>
                {invoice.rounding_off !== undefined && invoice.rounding_off !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">Rounding Off:</span>
                    <span>{invoice.rounding_off > 0 ? '+' : ''}₹{invoice.rounding_off.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total Amount:</span>
                  <span>₹{invoice.grand_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="mt-6 pt-4 border-t border-slate-300 flex justify-end">
            <div className="text-center min-w-[200px]">
              <p className="text-xs mb-20">For {settings?.shop_name || 'SHOP NAME'}</p>
              <div className="border-t border-slate-400 pt-1 w-full">
                <p className="text-xs font-medium">Authorised Signatory</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 mt-4">
            {settings?.invoice_footer_text || 'Thank You For Business With Us!'}
          </p>
          </div>
      </Card>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-4xl, .max-w-4xl * {
            visibility: visible;
          }
          .max-w-4xl {
            position: absolute;
            left: 0;
            top: 0;
            max-width: 100%;
            margin: 0;
            padding: 20px;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}