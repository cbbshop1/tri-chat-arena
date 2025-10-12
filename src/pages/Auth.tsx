import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { validateEmail, validatePassword, getPasswordStrength, authRateLimit } from "@/lib/validation";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailErrors, setEmailErrors] = useState<string[]>([]);
  const [emailWarnings, setEmailWarnings] = useState<string[]>([]);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Real-time email validation
  const emailValidation = useMemo(() => {
    if (!email) return { isValid: true, errors: [], warnings: [] };
    return validateEmail(email);
  }, [email]);

  // Real-time password validation and strength
  const passwordValidation = useMemo(() => {
    if (!password) return { isValid: true, errors: [], warnings: [] };
    return validatePassword(password);
  }, [password]);

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, feedback: '', requirements: { length: false, uppercase: false, lowercase: false, number: false, special: false, common: true } };
    return getPasswordStrength(password);
  }, [password]);

  // Update error states when validation changes
  useEffect(() => {
    setEmailErrors(emailValidation.errors);
    setEmailWarnings(emailValidation.warnings);
  }, [emailValidation]);

  useEffect(() => {
    setPasswordErrors(passwordValidation.errors);
    setShowPasswordStrength(password.length > 0);
  }, [passwordValidation, password]);

  useEffect(() => {
    // Check if user is already authenticated
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      // Try to sign in with a dummy password to check if email exists
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: "dummy-password-to-check-email"
      });
      
      // If we get "Invalid login credentials", the email exists but password is wrong
      // If we get "Invalid email or password", the email might not exist
      if (error?.message.includes("Invalid login credentials")) {
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Rate limiting check
    if (!authRateLimit.isAllowed(email)) {
      const remainingTime = Math.ceil(authRateLimit.getRemainingTime(email) / 60000);
      setError(`Too many attempts. Please try again in ${remainingTime} minutes.`);
      setLoading(false);
      return;
    }

    // Validate email and password
    const emailVal = validateEmail(email);
    const passwordVal = validatePassword(password);

    if (!emailVal.isValid) {
      setError(emailVal.errors[0]);
      setLoading(false);
      return;
    }

    if (!passwordVal.isValid) {
      setError(passwordVal.errors[0]);
      setLoading(false);
      return;
    }

    // Check if email already exists
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      setError("This email is already registered. Please use the Sign In tab instead.");
      setLoading(false);
      return;
    }

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      if (error.message.includes("already registered") || error.message.includes("User already registered")) {
        setError("This email is already registered. Please use the Sign In tab instead.");
      } else {
        setError(error.message);
      }
    } else {
      toast({
        title: "Sign up successful!",
        description: "Check your email for the confirmation link.",
      });
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Rate limiting check
    if (!authRateLimit.isAllowed(email)) {
      const remainingTime = Math.ceil(authRateLimit.getRemainingTime(email) / 60000);
      setError(`Too many attempts. Please try again in ${remainingTime} minutes.`);
      setLoading(false);
      return;
    }

    // Basic email validation for sign in
    if (!email.includes('@')) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else {
        setError(error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Private Research Instance</CardTitle>
          <CardDescription>
            This is a private research platform. New signups are currently disabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className={emailErrors.length > 0 ? "border-destructive" : ""}
                  />
                  {emailErrors.length > 0 && (
                    <div className="space-y-1">
                      {emailErrors.map((error, index) => (
                        <div key={index} className="flex items-center space-x-1 text-sm text-destructive">
                          <XCircle className="h-3 w-3" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {emailWarnings.length > 0 && (
                    <div className="space-y-1">
                      {emailWarnings.map((warning, index) => (
                        <div key={index} className="flex items-center space-x-1 text-sm text-yellow-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            {/* Signup disabled for private research instance */}
            <TabsContent value="signup" style={{ display: 'none' }}>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className={emailErrors.length > 0 ? "border-destructive" : emailValidation.isValid && email ? "border-green-500" : ""}
                  />
                  {emailErrors.length > 0 && (
                    <div className="space-y-1">
                      {emailErrors.map((error, index) => (
                        <div key={index} className="flex items-center space-x-1 text-sm text-destructive">
                          <XCircle className="h-3 w-3" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {emailWarnings.length > 0 && (
                    <div className="space-y-1">
                      {emailWarnings.map((warning, index) => (
                        <div key={index} className="flex items-center space-x-1 text-sm text-yellow-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {emailValidation.isValid && email && emailErrors.length === 0 && (
                    <div className="flex items-center space-x-1 text-sm text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>Valid email address</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Create a password"
                    className={passwordErrors.length > 0 ? "border-destructive" : passwordValidation.isValid && password ? "border-green-500" : ""}
                  />
                  {passwordErrors.length > 0 && (
                    <div className="space-y-1">
                      {passwordErrors.map((error, index) => (
                        <div key={index} className="flex items-center space-x-1 text-sm text-destructive">
                          <XCircle className="h-3 w-3" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {showPasswordStrength && (
                    <PasswordStrengthIndicator 
                      strength={passwordStrength}
                      className="mt-2"
                    />
                  )}
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !emailValidation.isValid || !passwordValidation.isValid}
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;