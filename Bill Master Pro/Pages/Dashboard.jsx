import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  CreditCard,
  FileText,
  Users,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState({
    todaySales: 0,
    monthSales: 0,
    totalCustomers: 0,
    lowStockItems: 0,
    dueTomorrow: 0,
    pendingCancellations: 0
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [duePayments, setDuePayments] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [invoices, items, customers] = await Promise.all([
        base44.entities.Invoice.list('-created_date', 100),
        base44.entities.Item.list(),
        base44.entities.Customer.list()
      ]);

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const todaySales = invoices
        .filter(inv => {
          const invDate = new Date(inv.created_date);
          return invDate >= todayStart && inv.status === 'active';
        })
        .reduce((sum, inv) => sum + inv.grand_total, 0);

      const monthSales = invoices
        .filter(inv => new Date(inv.created_date) >= monthStart && inv.status === 'active')
        .reduce((sum, inv) => sum + inv.grand_total, 0);

      const lowStockItems = items.filter(
        item => item.quantity_in_stock <= item.minimum_stock_alert && item.status === 'active'
      );

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const dueTomorrow = invoices.filter(
        inv => inv.due_date === tomorrowStr && inv.balance_due > 0
      ).length;

      const pendingCancellations = invoices.filter(
        inv => inv.status === 'pending_cancel'
      ).length;

      setStats({
        todaySales,
        monthSales,
        totalCustomers: customers.length,
        lowStockItems: lowStockItems.length,
        dueTomorrow,
        pendingCancellations
      });

      setRecentInvoices(invoices.slice(0, 5));
      setDuePayments(invoices.filter(inv => inv.balance_due > 0).slice(0, 5));
      setLowStock(lowStockItems.slice(0, 5));

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Today's Sales",
      value: `₹${stats.todaySales.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-green-500',
      textColor: 'text-green-700'
    },
    {
      title: 'Month Sales',
      value: `₹${stats.monthSales.toFixed(2)}`,
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-700'
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'bg-purple-500',
      textColor: 'text-purple-700'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      alert: stats.lowStockItems > 0
    },
    {
      title: 'Due Tomorrow',
      value: stats.dueTomorrow,
      icon: Calendar,
      color: 'bg-red-500',
      textColor: 'text-red-700',
      alert: stats.dueTomorrow > 0
    },
    {
      title: 'Pending Cancellations',
      value: stats.pendingCancellations,
      icon: CreditCard,
      color: 'bg-orange-500',
      textColor: 'text-orange-700',
      alert: stats.pendingCancellations > 0
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back! Here's your business overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                    <Icon className={`h-5 w-5 ${stat.textColor}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  {stat.alert && (
                    <Badge variant="destructive" className="text-xs">Alert</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Invoices</CardTitle>
              <Link to={createPageUrl('Invoices')}>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentInvoices.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No invoices yet</p>
              ) : (
                recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={createPageUrl('ViewInvoice') + '?id=' + invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-slate-500">{invoice.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">₹{invoice.grand_total.toFixed(2)}</p>
                      <Badge variant={invoice.status === 'active' ? 'default' : 'secondary'}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Due Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Due Payments</CardTitle>
              <Link to={createPageUrl('CreditDues')}>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {duePayments.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No pending payments</p>
              ) : (
                duePayments.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-slate-500">{invoice.customer_name}</p>
                      {invoice.due_date && (
                        <p className="text-xs text-amber-600 mt-1">
                          Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">₹{invoice.balance_due.toFixed(2)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-900">Low Stock Alert</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lowStock.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white border border-amber-200"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">Min: {item.minimum_stock_alert}</p>
                  </div>
                  <Badge variant="destructive">{item.quantity_in_stock} left</Badge>
                </div>
              ))}
            </div>
            <Link to={createPageUrl('Inventory')}>
              <Button className="w-full mt-4" variant="outline">
                Manage Inventory
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
