import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  BarChart3,
  Shield,
  Users,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
} from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Company Management",
    description:
      "Track and manage recruiting companies with complete history, contact details, and visit records.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Real-time insights into placement statistics, department performance, and hiring trends.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description:
      "Secure access control with distinct permissions for TPO, Coordinators, and Management.",
  },
  {
    icon: TrendingUp,
    title: "Performance Tracking",
    description:
      "Monitor placement percentages, PPO conversions, and year-over-year improvements.",
  },
];

const stats = [
  { value: "500+", label: "Companies Tracked" },
  { value: "95%", label: "Placement Rate" },
  { value: "15+", label: "Departments" },
  { value: "10000+", label: "Students Placed" },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">ERODE SENGUNTHAR ENGINEERING COLLEGE</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-orange-600 transition-colors">
              Features
            </a>
            <a href="#stats" className="text-sm font-medium text-muted-foreground hover:text-orange-600 transition-colors">
              Statistics
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild className="hover:text-orange-600 hover:bg-orange-50">
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0">
              <Link to="/auth?tab=signup">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {/* Hero Content Section (Video + Text) - NOW FIRST */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-20">
        {/* YouTube Video Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="relative w-full h-[300%] -top-[100%]">
            <iframe
              src="https://www.youtube.com/embed/sA2il3PqjQE?autoplay=1&mute=1&controls=0&start=30&loop=1&playlist=sA2il3PqjQE&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1&vq=hd2160"
              className="w-full h-full object-cover scale-150"
              title="Hero Background Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
          {/* No Filter requested */}
        </div>

        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-flex items-center rounded-full border border-orange-500/50 bg-black/40 px-4 py-2 text-sm text-yellow-300 backdrop-blur-md shadow-lg">
              <CheckCircle2 className="mr-2 h-4 w-4 text-orange-400" />
              Trusted by leading institutions
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-7xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
              <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent drop-shadow-none filter brightness-110">
                ERODE SENGUNTHAR ENGINEERING COLLEGE
              </span>
            </h1>
            <p className="mb-10 text-lg text-white md:text-2xl font-bold max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              Erode Sengunthar Engineering College is accredited by National Board of Accreditation (NBA), approved by AICTE and Permanently affiliated to Anna University.  </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 shadow-xl text-lg px-8 py-6 h-auto border border-orange-400/20">
                <Link to="/auth?tab=signup">
                  ADMISSIONS OPEN
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full sm:w-auto border-2 border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent text-lg px-8 py-6 h-auto backdrop-blur-sm"
              >
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white/80 drop-shadow-md">
          <ArrowRight className="h-8 w-8 rotate-90" />
        </div>
      </section>

      {/* Hero Image Section - Full Screen Width */}
      <section className="w-full">
        <img
          src="https://erode-sengunthar.ac.in/wp-content/uploads/2025/05/WEB-POSTER-scaled.jpg"
          alt="Erode Sengunthar Engineering College Poster"
          className="w-full h-auto object-cover"
        />
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Everything you need to manage placements
            </h2>
            <p className="text-lg text-muted-foreground">
              A complete suite of tools designed for placement cells, HODs,
              and management teams.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="card-hover border-0 bg-card shadow-premium hover:shadow-orange-100">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                    <feature.icon className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="border-t bg-orange-50/50 py-24">
        <div className="container">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Designed for every role
            </h2>
            <p className="text-lg text-muted-foreground">
              Role-based access ensures everyone sees exactly what they need.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="relative overflow-hidden border-0 bg-card shadow-premium hover:shadow-orange-200 transition-all">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-orange-100" />
              <CardContent className="p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500 text-white">
                  <Users className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Placement Officer</h3>
                <p className="mb-4 text-muted-foreground">
                  Full administrative control over companies, drives, and statistics.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-500" />
                    Manage company database
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-500" />
                    Schedule placement drives
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-500" />
                    Generate reports
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-card shadow-premium hover:shadow-green-200 transition-all">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-green-100" />
              <CardContent className="p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-600 text-white">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">HOD</h3>
                <p className="mb-4 text-muted-foreground">
                  Department-scoped view with relevant drives and statistics.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    View department drives
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Track student placements
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Department analytics
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-card shadow-premium hover:shadow-yellow-200 transition-all">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-yellow-100" />
              <CardContent className="p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-yellow-500 text-white">
                  <TrendingUp className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Management</h3>
                <p className="mb-4 text-muted-foreground">
                  Executive dashboard with KPIs and institutional insights.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-yellow-600" />
                    View all analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-yellow-600" />
                    Department comparisons
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-yellow-600" />
                    Year-over-year trends
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Ready to transform your placement process?
            </h2>
            <p className="mb-8 text-lg text-white/90">
              Join institutions that have streamlined their placement management with ESEC.
            </p>
            <Button size="lg" asChild className="bg-white text-orange-600 hover:bg-white/90 shadow-xl">
              <Link to="/auth?tab=signup">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - Detailed */}
      <footer className="bg-[#333333] text-white  py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

            {/* Column 1: Important Links */}
            <div>
              <h3 className="text-yellow-400 text-xl font-bold mb-6 uppercase">ADMISSIONS OPEN</h3>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="hover:text-yellow-400 cursor-default transition-colors">Admission</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">Departments</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">Placement</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">Controller of Examination</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">Anti Ragging Committee</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">Research</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">Alumni</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">AICTE IDEA Lab</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">ESEC Learning and Assessment Portal</li>
              </ul>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h3 className="text-yellow-400 text-xl font-bold mb-6 uppercase">WITH </h3>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="hover:text-yellow-400 cursor-default transition-colors">NAAC</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">NIRF</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">NBA</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">AICTE- Mandatory Disclosure</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">Audit Statements</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">IIC</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">Institutional Development Plan</li>
                <li className="hover:text-yellow-400 cursor-default transition-colors">Online Payment</li>
              </ul>
            </div>

            {/* Column 3: Contact Us */}
            <div>
              <h3 className="text-yellow-400 text-xl font-bold mb-6 uppercase">CONTACT US</h3>
              <h4 className="text-white font-bold text-lg mb-2">Erode Sengunthar Engineering College</h4>
              <div className="text-gray-300 text-sm space-y-1 mb-4">
                <p>Thudupathi, Perundurai</p>
                <p>Erode – 638 057, TamilNadu, India</p>
                <p>Mail : <a href="mailto:contact@esec.ac.in" className="hover:text-yellow-400">contact@esec.ac.in</a></p>
                <p>Mobile : 9442132706</p>
              </div>

              {/* Map Embed */}
              <div className="w-full h-48 bg-gray-200 rounded-md overflow-hidden mt-4">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15647.76674466946!2d77.618645!3d11.338576!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba96cf0b0b8c541%3A0xe5a3c9a6327e5ec0!2sErode%20Sengunthar%20Engineering%20College!5e0!3m2!1sen!2sin!4v1684300000000!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="College Location"
                ></iframe>
              </div>
            </div>

          </div>

          <div className="border-t border-gray-700 mt-12 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} All Rights Reserved by Zenetive Infotech.
          </div>
        </div>
      </footer>
    </div>
  );
}