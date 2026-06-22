import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const handleProfileClick = () => {
    navigate('/my-profile');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2 w-full justify-start">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>
              {user?.name?.split(' ').map(n => n[0]).join('') || user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-sm font-medium text-foreground truncate w-full">
              {user?.email || user?.name || 'User'}
            </span>
            <span className="text-xs text-muted-foreground capitalize truncate w-full">
              {user?.roles && user.roles.length > 1
                ? user.roles.map(r => r.replace('_', ' ')).join(', ')
                : user?.role?.replace('_', ' ') || 'User'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          My Profile
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}