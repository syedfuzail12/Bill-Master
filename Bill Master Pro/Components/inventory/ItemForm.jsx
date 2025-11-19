import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

export default function ItemForm({ item, categories, onClose, onSave }) {
  const [formData, setFormData] = useState(item || {
    name: '',
    category_id: '',
    unit: 'pcs',
    quantity_in_stock: 0,
    minimum_stock_alert: 10,
    hsn_code: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await base44.auth.me();
      
      if (item) {
        await base44.entities.Item.update(item.id, formData);
        await base44.entities.AuditLog.create({
          action: 'Update Item',
          user_email: user.email,
          user_role: user.role,
          details: `Item updated: ${formData.name}, Stock: ${formData.quantity_in_stock}`
        });
      } else {
        await base44.entities.Item.create(formData);
        await base44.entities.AuditLog.create({
          action: 'Create Item',
          user_email: user.email,
          user_role: user.role,
          details: `Item created: ${formData.name}, Stock: ${formData.quantity_in_stock}`
        });
      }
      
      onSave();
      onClose();
    } catch (error) {
      alert('Error saving item');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold">{item ? 'Edit' : 'Add'} Item</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="kg">Kilogram (kg)</SelectItem>
                  <SelectItem value="ltr">Liter (ltr)</SelectItem>
                  <SelectItem value="mtr">Meter (mtr)</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity in Stock *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity_in_stock}
                onChange={(e) => setFormData({ ...formData, quantity_in_stock: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="minStock">Minimum Stock Alert *</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                value={formData.minimum_stock_alert}
                onChange={(e) => setFormData({ ...formData, minimum_stock_alert: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="hsn">HSN Code</Label>
              <Input
                id="hsn"
                value={formData.hsn_code || ''}
                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}