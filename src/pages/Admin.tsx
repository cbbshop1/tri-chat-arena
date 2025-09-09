import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Shield, Users, MessageSquare, CreditCard, ArrowLeft } from "lucide-react";

interface User {
  id: string;
  email: string;
  created_at: string;
  role: 'admin' | 'user';
}

interface Subscriber {
  id: string;
  email: string;
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

interface DailyUsage {
  id: string;
  user_id: string;
  date: string;
  message_count: number;
}

const Admin = () => {
  const { isAdmin, loading: roleLoading } = useRole();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<User[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (!roleLoading && !isAdmin) {
      navigate("/");
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
      });
      return;
    }

    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, roleLoading, user, authLoading, navigate, toast]);

  const fetchData = async () => {
    try {
      // Fetch users with their roles
      const { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          created_at
        `);

      if (userRolesError) throw userRolesError;

      // For demo purposes, we'll use the user_roles data to simulate user info
      const usersData = userRoles.map(ur => ({
        id: ur.user_id,
        email: `user-${ur.user_id.slice(-8)}@example.com`, // Simulated email
        created_at: ur.created_at,
        role: ur.role as 'admin' | 'user'
      }));

      setUsers(usersData);

      // Fetch subscribers
      const { data: subscribersData, error: subscribersError } = await supabase
        .from('subscribers')
        .select('*');

      if (subscribersError) throw subscribersError;
      setSubscribers(subscribersData || []);

      // Fetch daily usage
      const { data: usageData, error: usageError } = await supabase
        .from('daily_usage')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

      if (usageError) throw usageError;
      setDailyUsage(usageData || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load admin data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      
      toast({
        title: "Role Updated",
        description: `User role updated to ${newRole}.`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user role.",
      });
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to App
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscribers.filter(s => s.subscribed).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dailyUsage
                  .filter(d => d.date === new Date().toISOString().split('T')[0])
                  .reduce((sum, d) => sum + d.message_count, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-xs">
                        {user.id.slice(-8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => updateUserRole(user.id, value as 'admin' | 'user')}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Usage</CardTitle>
              <CardDescription>
                Daily message usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Messages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyUsage.slice(0, 10).map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell>{usage.date}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {usage.user_id?.slice(-8)}...
                      </TableCell>
                      <TableCell>{usage.message_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;