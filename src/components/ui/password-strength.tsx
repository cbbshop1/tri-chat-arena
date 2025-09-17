import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle } from "lucide-react";
import { PasswordStrength } from "@/lib/validation";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  className?: string;
}

export const PasswordStrengthIndicator = ({ 
  strength, 
  className 
}: PasswordStrengthIndicatorProps) => {
  const getProgressColor = (score: number) => {
    if (score <= 2) return "bg-destructive";
    if (score <= 3) return "bg-yellow-500";
    if (score <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getTextColor = (score: number) => {
    if (score <= 2) return "text-destructive";
    if (score <= 3) return "text-yellow-600";
    if (score <= 4) return "text-blue-600";
    return "text-green-600";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Password Strength</span>
        <span className={cn("text-sm font-medium", getTextColor(strength.score))}>
          {strength.feedback}
        </span>
      </div>
      
      <Progress 
        value={(strength.score / 5) * 100} 
        className="h-2"
        style={{
          '--progress-foreground': getProgressColor(strength.score)
        } as React.CSSProperties}
      />
      
      <div className="grid grid-cols-2 gap-1 text-xs">
        <RequirementItem 
          met={strength.requirements.length} 
          text="8+ characters" 
        />
        <RequirementItem 
          met={strength.requirements.uppercase} 
          text="Uppercase letter" 
        />
        <RequirementItem 
          met={strength.requirements.lowercase} 
          text="Lowercase letter" 
        />
        <RequirementItem 
          met={strength.requirements.number} 
          text="Number" 
        />
        <RequirementItem 
          met={strength.requirements.special} 
          text="Special character" 
        />
        <RequirementItem 
          met={strength.requirements.common} 
          text="Not common" 
        />
      </div>
    </div>
  );
};

interface RequirementItemProps {
  met: boolean;
  text: string;
}

const RequirementItem = ({ met, text }: RequirementItemProps) => (
  <div className="flex items-center space-x-1">
    {met ? (
      <CheckCircle className="h-3 w-3 text-green-500" />
    ) : (
      <XCircle className="h-3 w-3 text-muted-foreground" />
    )}
    <span className={cn(
      "text-xs",
      met ? "text-green-600" : "text-muted-foreground"
    )}>
      {text}
    </span>
  </div>
);