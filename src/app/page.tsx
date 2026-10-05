import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Flame, ShieldCheck, Truck, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Section */}
      <section className="relative flex-1 overflow-hidden pt-16 md:pt-24 lg:pt-32">
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              <span className="text-muted-foreground">Gas Agency Management System v1.0</span>
            </div>

            <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl animate-in fade-in slide-in-from-bottom-6 duration-700">
              Manage Your Agency <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                With Precision
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-muted-foreground animate-in fade-in slide-in-from-bottom-8 duration-700">
              A comprehensive solution for inventory, staff, and accounts.
              Designed for Proprietors, Managers, and Field Staff.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row animate-in fade-in slide-in-from-bottom-10 duration-1000">
              <Link href="/login">
                <Button size="lg" className="gap-2 text-lg h-12 px-8 shadow-lg shadow-primary/20">
                  Login to Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Grid / Role Preview */}
          <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            <FeatureCard
              icon={<ShieldCheck className="h-10 w-10 text-primary" />}
              title="Master Control"
              description="Complete oversight for Proprietors. Manage staff and permissions."
            />
            <FeatureCard
              icon={<Users className="h-10 w-10 text-blue-500" />}
              title="Staff Management"
              description="Seamless coordination for Managers and Office Staff."
            />
            <FeatureCard
              icon={<Flame className="h-10 w-10 text-orange-500" />}
              title="Stock Audit"
              description="Real-time godown inventory tracking for Cylinders."
            />
            <FeatureCard
              icon={<Truck className="h-10 w-10 text-green-500" />}
              title="Trip Logistics"
              description="Track trips and deliveries for Hawkers efficiently."
            />
          </div>
        </div>

        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl" aria-hidden="true">
          <div
            className="aspect-[1155/678] w-[68.125rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors">
      <CardHeader>
        <div className="mb-2 rounded-lg bg-background/50 w-fit p-3 shadow-sm">{icon}</div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardContent>
    </Card>
  )
}
