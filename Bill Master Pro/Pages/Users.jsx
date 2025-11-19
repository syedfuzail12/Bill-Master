import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCog, AlertCircle, Mail, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const [user, allUsers] = await Promise.all([
        base44.auth.me(),
        base44.entities.User.list()
      ]);
      setCurrentUser(user);
      setUsers(allUsers);
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!confirm(`Change user role to ${newRole}?`)) return;

    try {
      await base44.entities.User.update(userId, { role: newRole });
      
      await base44.entities.AuditLog.create({
        action: 'Update User Role',
        user_email: currentUser.email,
        user_role: currentUser.role,
        details: `User role changed to ${newRole}`
      });

      alert('User role updated successfully');
      loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Error updating user role');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
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
        <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500 mt-1">Manage users and their roles</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Users</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{users.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <UserCog className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Admins</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Staff</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {users.filter(u => u.role === 'user').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCog className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-medium">
                      {user.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{user.full_name}</CardTitle>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="mt-1 capitalize">
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Joined: {format(new Date(user.created_date), 'MMM dd, yyyy')}
                </div>

                {user.id !== currentUser.id && (
                  <div className="pt-3 border-t">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Change Role</label>
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {user.id === currentUser.id && (
                  <div className="pt-3 border-t">
                    <Badge variant="outline" className="w-full justify-center">
                      Current User
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">User Management Info</p>
              <ul className="space-y-1 text-blue-800">
                <li>• Admins have full access to all features including settings, audit logs, and user management</li>
                <li>• Staff can create invoices, manage inventory, and handle customer records</li>
                <li>• Staff cannot delete invoices directly - they must request cancellation for admin approval</li>
                <li>• Users are invited manually via the invite functionality</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}