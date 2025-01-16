import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, ChevronLeft } from 'lucide-react';

// Updates configuration
const UPDATES_LIST = [
  {
    id: 'v1-2-0',
    title: 'Version 1.2.0',
    date: '2024-01-15',
    filename: 'v1-2-0.md'
  },
  {
    id: 'v1-1-0',
    title: 'Version 1.1.0',
    date: '2024-01-01',
    filename: 'v1-1-0.md'
  }
];

const Updates = () => {
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedUpdate) {
      setIsLoading(true);
      setError(null);
      
      fetch(`/updates/${selectedUpdate.filename}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to load update content');
          }
          return response.text();
        })
        .then(text => {
          setContent(text);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error loading update:', error);
          setError(error.message);
          setIsLoading(false);
        });
    }
  }, [selectedUpdate]);

  const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
    </div>
  );

  const ErrorMessage = ({ message }) => (
    <div className="text-red-400 p-4 rounded-lg bg-red-400/10">
      <h3 className="font-semibold mb-2">Error</h3>
      <p>{message}</p>
    </div>
  );

  return (
    <div className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
          Updates
        </h1>
        
        <div className="grid md:grid-cols-12 gap-6">
          {/* Sidebar with updates list */}
          <div className="md:col-span-4 lg:col-span-3">
            <div className="bg-white/5 backdrop-blur-lg rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Release History</h2>
              <div className="space-y-2">
                {UPDATES_LIST.map(update => (
                  <button
                    key={update.id}
                    onClick={() => setSelectedUpdate(update)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedUpdate?.id === update.id 
                        ? 'bg-blue-400/20 text-blue-400' 
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{update.title}</div>
                        <div className="text-sm text-gray-400">{update.date}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main content area */}
          <div className="md:col-span-8 lg:col-span-9">
            {selectedUpdate ? (
              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6">
                <button 
                  onClick={() => setSelectedUpdate(null)}
                  className="md:hidden flex items-center text-gray-400 hover:text-white mb-4"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back to Updates
                </button>
                
                {isLoading ? (
                  <LoadingSpinner />
                ) : error ? (
                  <ErrorMessage message={error} />
                ) : (
                  <article className="prose prose-invert max-w-none">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </article>
                )}
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Select an update</h2>
                <p className="text-gray-400">
                  Choose a version from the list to view detailed release notes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Updates;