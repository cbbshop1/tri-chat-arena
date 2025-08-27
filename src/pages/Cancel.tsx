import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const Cancel = () => {
  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <XCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <CardTitle className="text-2xl text-orange-700">Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            No worries! You can still use the AI chat with limited access.
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/">Continue to Chat</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Try Premium Later</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cancel;