import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary" />
          <span className="font-serif font-bold text-xl tracking-tight">Offercome</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="font-medium" data-testid="button-try-it">Try it</Button>
          </Link>
          <a href="/api/login">
            <Button className="font-medium rounded-full px-6" data-testid="button-sign-in">Sign In</Button>
          </a>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto w-full pb-20">
        <div className="inline-flex items-center rounded-full border px-4 py-1.5 mb-8 text-sm font-medium bg-muted/50 text-muted-foreground">
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
          Your personal job search command center
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold font-serif leading-tight mb-6 text-foreground">
          Offer favours people with <br className="hidden md:block" />
          <span className="italic text-muted-foreground">prepared mind.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
          Track applications, schedule interviews, and measure your success rate all in one unified dashboard. Stop using messy spreadsheets and start treating your job search like a professional campaign.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <a href="/api/login">
            <Button size="lg" className="rounded-full px-8 h-14 text-lg group" data-testid="button-hero-cta">
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-lg" data-testid="button-hero-try">
              Try Without Login
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
