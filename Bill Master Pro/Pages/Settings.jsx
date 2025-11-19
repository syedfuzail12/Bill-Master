import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Save, AlertCircle, Image as ImageIcon } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    shop_name: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    logo_url: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    bank_address: '',
    upi_id: '',
    upi_qr_url: '',
    invoice_prefix: 'INV',
    invoice_footer_text: 'Thank You For Business With Us!'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [currentUser, settingsData] = await Promise.all([
        base44.auth.me(),
        base44.entities.ShopSettings.list()
      ]);
      
      setUser(currentUser);
      
      if (settingsData.length > 0) {
        setSettings(settingsData[0]);
        setFormData(settingsData[0]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: result.file_url });
      setUploadingLogo(false);
    } catch (error) {
      alert('Error uploading logo');
      setUploadingLogo(false);
    }
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingQR(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, upi_qr_url: result.file_url });
      setUploadingQR(false);
    } catch (error) {
      alert('Error uploading QR code');
      setUploadingQR(false);
    }
  };

  const handleSave = async () => {
    if (!formData.shop_name) {
      alert('Shop name is required');
      return;
    }

    setSaving(true);
    try {
      if (settings) {
        await base44.entities.ShopSettings.update(settings.id, formData);
      } else {
        await base44.entities.ShopSettings.create(formData);
      }

      await base44.entities.AuditLog.create({
        action: 'Update Settings',
        user_email: user.email,
        user_role: user.role,
        details: 'Shop settings updated'
      });

      alert('Settings saved successfully!');
      loadSettings();
      setSaving(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
      setSaving(false);
    }
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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your shop information and preferences</p>
      </div>

      <Tabs defaultValue="shop" className="space-y-6">
        <TabsList>
          <TabsTrigger value="shop">Shop Details</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Settings</TabsTrigger>
          <TabsTrigger value="payment">Payment Details</TabsTrigger>
        </TabsList>

        {/* Shop Details */}
        <TabsContent value="shop">
          <Card>
            <CardHeader>
              <CardTitle>Shop Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="shop_name">Shop Name *</Label>
                  <Input
                    id="shop_name"
                    value={formData.shop_name}
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Shop Logo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {formData.logo_url && (
                      <img
                        src={formData.logo_url}
                        alt="Logo"
                        className="h-20 w-20 object-contain border rounded"
                      />
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload">
                        <Button type="button" variant="outline" disabled={uploadingLogo} asChild>
                          <span>
                            {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Settings */}
        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                <Input
                  id="invoice_prefix"
                  value={formData.invoice_prefix || ''}
                  onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                  placeholder="INV"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Example: INV-1, INV-2, etc.
                </p>
              </div>

              <div>
                <Label htmlFor="invoice_footer">Invoice Footer Text</Label>
                <Textarea
                  id="invoice_footer"
                  value={formData.invoice_footer_text || ''}
                  onChange={(e) => setFormData({ ...formData, invoice_footer_text: e.target.value })}
                  rows={3}
                  placeholder="Thank You For Business With Us!"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Details */}
        <TabsContent value="payment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bank Details */}
            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name || ''}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="account_number">Account Number</Label>
                  <Input
                    id="account_number"
                    value={formData.account_number || ''}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ifsc_code">IFSC Code</Label>
                  <Input
                    id="ifsc_code"
                    value={formData.ifsc_code || ''}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="bank_address">Branch Address</Label>
                  <Input
                    id="bank_address"
                    value={formData.bank_address || ''}
                    onChange={(e) => setFormData({ ...formData, bank_address: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* UPI Details */}
            <Card>
              <CardHeader>
                <CardTitle>UPI Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="upi_id">UPI ID</Label>
                  <Input
                    id="upi_id"
                    value={formData.upi_id || ''}
                    onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                    placeholder="your-upi-id@upi"
                  />
                </div>

                <div>
                  <Label>UPI QR Code</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {formData.upi_qr_url && (
                      <img
                        src={formData.upi_qr_url}
                        alt="UPI QR"
                        className="h-32 w-32 object-contain border rounded"
                      />
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQRUpload}
                        className="hidden"
                        id="qr-upload"
                      />
                      <label htmlFor="qr-upload">
                        <Button type="button" variant="outline" disabled={uploadingQR} asChild>
                          <span>
                            {uploadingQR ? 'Uploading...' : 'Upload QR Code'}
                          </span>
                        </Button>
                      </label>
                      <p className="text-xs text-slate-500 mt-2">
                        Upload your UPI payment QR code image
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
