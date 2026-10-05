"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, UserRole } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, User, Users, Truck, Calculator, Briefcase } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const login = useAuthStore((state) => state.login);
    const [selectedRole, setSelectedRole] = useState<UserRole>("MASTER");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        console.log("Login button clicked");
        setIsLoading(true);

        const mockUser = {
            id: Math.random().toString(36).substr(2, 9),
            name: username || selectedRole,
            role: selectedRole,
        };
        console.log("Attempting to login with:", mockUser);

        try {
            login(mockUser);
            console.log("Store updated. Waiting...");

            // Wait a tick for state to settle
            await new Promise(resolve => setTimeout(resolve, 500));

            console.log("Redirecting to dashboard...");
            // Hard navigation to ensure dirty state is cleared and router works
            window.location.href = "/dashboard";
        } catch (error) {
            console.error("Login failed", error);
            alert("Login failed: " + JSON.stringify(error));
            setIsLoading(false);
        }
    };

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case "MASTER": return <ShieldCheck className="h-5 w-5" />;
            case "MANAGER": return <Users className="h-5 w-5" />;
            case "GODOWN": return <User className="h-5 w-5" />;
            case "ACCOUNTANT": return <Calculator className="h-5 w-5" />;
            case "OFFICE_STAFF": return <Briefcase className="h-5 w-5" />;
            case "HAWKER": return <Truck className="h-5 w-5" />;
            default: return <User className="h-5 w-5" />;
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
                    <CardDescription>
                        Select your role and enter your credentials to access the system.
                    </CardDescription>
                </CardHeader>
                <div className="space-y-4">
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Role</Label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {(["MASTER", "MANAGER", "GODOWN", "HAWKER", "ACCOUNTANT", "OFFICE_STAFF"] as UserRole[]).map((role) => (
                                    <Button
                                        key={role}
                                        type="button"
                                        variant={selectedRole === role ? "default" : "outline"}
                                        className="flex flex-col items-center justify-center h-20 gap-1 p-2"
                                        onClick={() => setSelectedRole(role)}
                                    >
                                        {getRoleIcon(role)}
                                        <span className="text-xs font-medium">{role}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username">Username / Name</Label>
                            <Input
                                id="username"
                                placeholder="Enter your name"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <p className="text-[0.8rem] text-muted-foreground">
                                (Any password works for mock login)
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full"
                            disabled={isLoading}
                            onClick={handleLogin}
                        >
                            {isLoading ? "Signing in..." : `Login as ${selectedRole}`}
                        </Button>
                    </CardFooter>
                </div>
            </Card>
        </div>
    );
}
