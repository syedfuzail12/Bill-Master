import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Package, Users, Download, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

export default function Reports() {
  const [dateRange, setDateRange] = useState('month');
  const [salesData, setSalesData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    try {
      const [invoices, items, customers] = await Promise.all([
        base44.entities.Invoice.list('-created_date'),
        base44.entities.Item.list(),
        base44.entities.Customer.list()
      ]);

      const filtered = filterByDateRange(invoices);
      setSalesData(filtered);
      setInventoryData(items);
      setCustomerData(customers);
      setLoading(false);
    } catch (error) {
      console.error('Error loading reports:', error);
      setLoading(false);
    }
  };

  const filterByDateRange = (invoices) => {
    const now = new Date();
    let startDate;

    switch (dateRange) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = startOfMonth(now);
    }

    return invoices.filter(inv =>
      new Date(inv.created_date) >= startDate && inv.status === 'active'
    );
  };

  const calculateSalesStats = () => {
    const totalSales = salesData.reduce((sum, inv) => sum + inv.grand_total, 0);
    const totalInvoices = salesData.length;
    const avgInvoice = totalInvoices > 0 ? totalSales / totalInvoices : 0;
    const cashSales = salesData.filter(inv => inv.payment_mode === 'cash').reduce((sum, inv) => sum + inv.grand_total, 0);
    const creditSales = salesData.filter(inv => inv.payment_mode === 'credit').reduce((sum, inv) => sum + inv.grand_total, 0);
    const upiSales = salesData.filter(inv => inv.payment_mode === 'upi').reduce((sum, inv) => sum + inv.grand_total, 0);
    const cardSales = salesData.filter(inv => inv.payment_mode === 'card').reduce((sum, inv) => sum + inv.grand_total, 0);

    return {
      totalSales,
      totalInvoices,
      avgInvoice,
      cashSales,
      creditSales,
      upiSales,
      cardSales
    };
  };

  const getLowStockItems = () => {
    return inventoryData.filter(item =>
      item.quantity_in_stock <= item.minimum_stock_alert && item.status === 'active'
    );
  };

  const getTopCustomers = () => {
    const customerSales = {};
    salesData.forEach(inv => {
      if (!customerSales[inv.customer_id]) {
        customerSales[inv.customer_id] = {
          name: inv.customer_name,
          total: 0,
          count: 0
        };
      }
      customerSales[inv.customer_id].total += inv.grand_total;
      customerSales[inv.customer_id].count += 1;
    });

    return Object.values(customerSales)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  };

  const downloadCSV = () => {
    const stats = calculateSalesStats();
    let csv = 'Sales Report\n\n';
    csv += `Period,${dateRange}\n`;
    csv += `Generated,${format(new Date(), 'dd/MM/yyyy HH:mm')}\n\n`;
    csv += 'Metric,Value\n';
    csv += `Total Sales,₹${stats.totalSales.toFixed(2)}\n`;
    csv += `Total Invoices,${stats.totalInvoices}\n`;
    csv += `Average Invoice,₹${stats.avgInvoice.toFixed(2)}\n`;
    csv += `Cash Sales,₹${stats.cashSales.toFixed(2)}\n`;
    csv += `UPI Sales,₹${stats.upiSales.toFixed(2)}\n`;
    csv += `Card Sales,₹${stats.cardSales.toFixed(2)}\n`;
    csv += `Credit Sales,₹${stats.creditSales.toFixed(2)}\n\n`;
    csv += 'Invoice Details\n';
    csv += 'Invoice No,Date,Customer,Amount,Payment Mode\n';
    salesData.forEach(inv => {
      csv += `${inv.invoice_number},${format(new Date(inv.created_date), 'dd/MM/yyyy')},${inv.customer_name},₹${inv.grand_total.toFixed(2)},${inv.payment_mode}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange}-${format(new Date(), 'ddMMyyyy')}.csv`;
    a.click();
  };

  const stats = calculateSalesStats();
  const lowStock = getLowStockItems();
  const topCustomers = getTopCustomers();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Business insights and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={downloadCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
          <TabsTrigger value="customers">Customer Report</TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Total Sales</p>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">₹{stats.totalSales.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Total Invoices</p>
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{stats.totalInvoices}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Avg Invoice</p>
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">₹{stats.avgInvoice.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Credit Sales</p>
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">₹{stats.creditSales.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Mode Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-slate-500 mb-2">Cash</p>
                  <p className="text-2xl font-bold text-slate-900">₹{stats.cashSales.toFixed(2)}</p>
                  <Badge className="mt-2">
                    {salesData.filter(inv => inv.payment_mode === 'cash').length} invoices
                  </Badge>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-slate-500 mb-2">UPI</p>
                  <p className="text-2xl font-bold text-slate-900">₹{stats.upiSales.toFixed(2)}</p>
                  <Badge className="mt-2">
                    {salesData.filter(inv => inv.payment_mode === 'upi').length} invoices
                  </Badge>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-slate-500 mb-2">Card</p>
                  <p className="text-2xl font-bold text-slate-900">₹{stats.cardSales.toFixed(2)}</p>
                  <Badge className="mt-2">
                    {salesData.filter(inv => inv.payment_mode === 'card').length} invoices
                  </Badge>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-slate-500 mb-2">Credit</p>
                  <p className="text-2xl font-bold text-slate-900">₹{stats.creditSales.toFixed(2)}</p>
                  <Badge className="mt-2">
                    {salesData.filter(inv => inv.payment_mode === 'credit').length} invoices
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Report */}
        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <p className="text-sm text-slate-500">Total Items</p>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{inventoryData.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <p className="text-sm text-slate-500">Active Items</p>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">
                  {inventoryData.filter(item => item.status === 'active').length}
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-300 bg-amber-50">
              <CardHeader className="pb-3">
                <p className="text-sm text-amber-700">Low Stock Items</p>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-900">{lowStock.length}</p>
              </CardContent>
            </Card>
          </div>

          {lowStock.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alert</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStock.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-slate-500">Min: {item.minimum_stock_alert}</p>
                      </div>
                      <Badge variant="destructive">
                        {item.quantity_in_stock} {item.unit} left
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Customer Report */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <p className="text-sm text-slate-500">Total Customers</p>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{customerData.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <p className="text-sm text-slate-500">Outstanding Credit</p>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">
                  ₹{customerData.reduce((sum, c) => sum + (c.outstanding_credit || 0), 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <p className="text-sm text-slate-500">Active This Period</p>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">
                  {new Set(salesData.map(inv => inv.customer_id)).size}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCustomers.map((customer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-slate-500">{customer.count} invoices</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-slate-900">₹{customer.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
