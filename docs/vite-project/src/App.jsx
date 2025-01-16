import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Updates from './pages/updates';

const MainLayout = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white relative">
      {/* Noise overlay */}
      <div className="fixed inset-0 opacity-[0.05] pointer-events-none">
        <svg className="w-full h-full">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>
      
      <nav className="fixed top-0 w-full bg-black/20 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <LucideIcons.X /> : <LucideIcons.Menu />}
              </button>
              <a href="/" className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent ml-3">BOTA AI Assistant</a>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
              <a href="#installation" className="hover:text-blue-400 transition-colors">Installation</a>
              <a href="#usage" className="hover:text-blue-400 transition-colors">Usage</a>
              <a href="/updates" className="hover:text-blue-400 transition-colors">Updates</a>
              <a href="https://github.com/nadeeshafdo/bota" className="hover:text-blue-400 transition-colors flex items-center">
              <LucideIcons.Github className="w-5 h-5 mr-1" />GitHub</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-64 bg-black/50 backdrop-blur-lg transition-transform duration-200 ease-in-out z-40 md:hidden`}>
        <div className="p-6 space-y-4">
          <a href="#features" className="block hover:text-blue-400 transition-colors">Features</a>
          <a href="#installation" className="block hover:text-blue-400 transition-colors">Installation</a>
          <a href="#usage" className="block hover:text-blue-400 transition-colors">Usage</a>
          <Link to="/updates" className="block hover:text-blue-400 transition-colors">Updates</Link>
          <a href="https://github.com/nadeeshafdo/bota" className="block hover:text-blue-400 transition-colors">GitHub</a>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-40">
        {children}
      </div>
    </div>
  );
};

const Feature = ({ icon: Icon, title, description }) => (
  <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 hover:bg-white/10 transition-colors">
    <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-gray-900" />
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </div>
);

const CodeBlock = ({ code, language = "bash" }) => (
  <div className="bg-black/50 p-4 rounded-lg font-mono mb-6 overflow-x-auto">
    <code className="text-sm text-gray-300 whitespace-pre">{code}</code>
  </div>
);

const HomePage = () => {
  return (
    <>
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            BOTA AI Assistant
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            A Flask-based AI assistant that helps you manage and automate your local development environment
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#installation" className="px-6 py-3 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-lg font-medium text-gray-900 hover:opacity-90 transition-opacity">
              Get Started
            </a>
            <a href="https://github.com/nadeeshafdo/bota" className="px-6 py-3 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors">
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="py-20 px-4" id="features">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Feature 
              icon={LucideIcons.Code}
              title="Code Execution"
              description="Execute Python code snippets directly from the chat interface with proper security measures"
            />
            <Feature 
              icon={LucideIcons.Bot}
              title="AI Integration"
              description="Interact with advanced AI models to assist with your development tasks"
            />
            <Feature 
              icon={LucideIcons.Terminal}
              title="Local Development"
              description="Manage and automate your local development environment efficiently"
            />
          </div>
        </div>
      </section>

      <section className="py-20 px-4" id="installation">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Installation Guide</h2>
          <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Prerequisites</h3>
              <ul className="list-disc list-inside text-gray-400 space-y-2">
                <li>Python 3.8 or higher</li>
                <li>pip (Python package manager)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4">1. Clone the Repository</h3>
              <CodeBlock code="git clone https://github.com/nadeeshafdo/bota.git\ncd bota" />
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">2. Install Dependencies</h3>
              <CodeBlock code="pip install -r requirements.txt" />
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">3. Configure the Application</h3>
              <p className="text-gray-400 mb-4">Create a local configuration file:</p>
              <CodeBlock code="cp bota.config.json bota.config.local.json" />
              <p className="text-gray-400">Update bota.config.local.json with your API keys and model details.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">4. Run the Application</h3>
              <CodeBlock code="python app.py\n# or\nflask run" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4" id="usage">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Usage Guide</h2>
          <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Create Code Snippets</h3>
                <p className="text-gray-400">Prompt BOTA to generate and execute Python code for tasks like data processing, web scraping, or automation scripts.</p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4">Manage Projects</h3>
                <p className="text-gray-400">Use BOTA to organize your projects, generate boilerplate code, and follow best practices.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Security Notes</h3>
                <p className="text-gray-400">Be cautious when executing code. BOTA includes security measures, but always review generated code before execution.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-black/20 backdrop-blur-lg border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto py-12 px-4 text-center text-gray-400">
          <p>© {new Date().getFullYear()} BOTA AI Assistant. Licensed under MIT.</p>
        </div>
      </footer>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
        <Route path="/updates" element={<MainLayout><Updates /></MainLayout>} />
      </Routes>
    </Router>
  );
};

export default App;