import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Package, Edit, Trash2, AlertTriangle } from 'lucide-react';
import CategoryForm from '@/components/inventory/CategoryForm';
import ItemForm from '@/components/inventory/ItemForm';

export default function Inventory() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchTerm, items]);

  const loadData = async () => {
    try {
      const [categoriesData, itemsData] = await Promise.all([
        base44.entities.Category.list(),
        base44.entities.Item.list()
      ]);
      setCategories(categoriesData);
      setItems(itemsData);
      setFilteredItems(itemsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const filterItems = () => {
    if (!searchTerm) {
      setFilteredItems(items);
      return;
    }
    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category? Items will not be deleted.')) return;
    try {
      await base44.entities.Category.delete(id);
      await logAudit('Delete Category', `Category deleted`);
      loadData();
    } catch (error) {
      alert('Error deleting category');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await base44.entities.Item.delete(id);
      await logAudit('Delete Item', `Item deleted`);
      loadData();
    } catch (error) {
      alert('Error deleting item');
    }
  };

  const logAudit = async (action, details) => {
    try {
      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        action,
        user_email: user.email,
        user_role: user.role,
        details
      });
    } catch (error) {
      console.error('Error logging audit:', error);
    }
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Unknown';
  };

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
          <h1 className="text-3xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-slate-500 mt-1">Manage categories and items</p>
        </div>
      </div>

      <Tabs defaultValue="items" className="space-y-6">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => { setEditingItem(null); setShowItemForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className={item.quantity_in_stock <= item.minimum_stock_alert ? 'border-amber-300 bg-amber-50' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">{getCategoryName(item.category_id)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingItem(item); setShowItemForm(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Stock:</span>
                      <Badge variant={item.quantity_in_stock <= item.minimum_stock_alert ? 'destructive' : 'default'}>
                        {item.quantity_in_stock} {item.unit}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Min Alert:</span>
                      <span className="text-sm font-medium">{item.minimum_stock_alert}</span>
                    </div>
                    {item.hsn_code && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">HSN:</span>
                        <span className="text-sm font-medium">{item.hsn_code}</span>
                      </div>
                    )}
                    {item.quantity_in_stock <= item.minimum_stock_alert && (
                      <div className="flex items-center gap-2 text-amber-600 pt-2 border-t">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-medium">Low Stock Alert!</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No items found</p>
            </div>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingCategory(null); setShowCategoryForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{category.name}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">{category.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingCategory(category); setShowCategoryForm(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No categories found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <CategoryForm
          category={editingCategory}
          onClose={() => { setShowCategoryForm(false); setEditingCategory(null); }}
          onSave={loadData}
        />
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <ItemForm
          item={editingItem}
          categories={categories}
          onClose={() => { setShowItemForm(false); setEditingItem(null); }}
          onSave={loadData}
        />
      )}
    </div>
  );
}