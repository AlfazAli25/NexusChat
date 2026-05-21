import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { MessageCircle, Shield, Zap, Users, ArrowRight } from 'lucide-react';
import { LandingScene } from '@/components/3d/LandingScene';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chats');
      return;
    }

    // GSAP animations
    const tl = gsap.timeline();

    tl.fromTo(
      '.hero-title',
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
    )
      .fromTo(
        '.hero-subtitle',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
        '-=0.5'
      )
      .fromTo(
        '.hero-buttons',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
        '-=0.3'
      )
      .fromTo(
        '.feature-card',
        { opacity: 0, y: 40, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.15, ease: 'power3.out' },
        '-=0.2'
      );
  }, [isAuthenticated, navigate]);

  const features = [
    {
      icon: MessageCircle,
      title: 'Real-time Messaging',
      description: 'Instant message delivery with typing indicators and read receipts',
    },
    {
      icon: Shield,
      title: 'End-to-End Encryption',
      description: 'Your conversations are secured with military-grade encryption',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized for speed with instant notifications and updates',
    },
    {
      icon: Users,
      title: 'Group Chats',
      description: 'Create groups with unlimited members and rich media sharing',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 3D Background */}
      <LandingScene />

      {/* Content */}
      <div className="relative z-10">
        {/* Navbar */}
        <nav className="flex items-center justify-between px-6 py-4 md:px-12">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/20 backdrop-blur-sm">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold gradient-text">NexusChat</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button variant="gradient" onClick={() => navigate('/signup')}>
              Get Started
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <div ref={heroRef} className="flex flex-col items-center justify-center px-6 py-20 md:py-32 text-center">
          <h1 className="hero-title text-4xl md:text-6xl lg:text-7xl font-bold max-w-4xl mb-6">
            Connect with anyone,{' '}
            <span className="gradient-text">anywhere</span>
          </h1>
          <p className="hero-subtitle text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
            Experience the future of communication with real-time messaging,
            crystal-clear voice calls, and seamless file sharing.
          </p>
          <div className="hero-buttons flex flex-col sm:flex-row gap-4">
            <Button
              variant="glow"
              size="xl"
              onClick={() => navigate('/signup')}
              className="group"
            >
              Start Chatting Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="glass"
              size="xl"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div
          ref={featuresRef}
          className="px-6 py-16 md:px-12 md:py-24 max-w-6xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Why Choose <span className="gradient-text">NexusChat</span>?
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Built for the modern age with cutting-edge technology and beautiful design
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="feature-card group p-6 rounded-2xl bg-card/50 backdrop-blur-xl border border-border/50 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="px-6 py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto p-8 md:p-12 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-xl border border-border/50">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-6">
              Join millions of users who trust NexusChat for their daily communication
            </p>
            <Button
              variant="gradient"
              size="lg"
              onClick={() => navigate('/signup')}
            >
              Create Free Account
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-border/50 text-center text-muted-foreground text-sm">
          <p>© 2024 NexusChat. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
