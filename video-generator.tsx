'use client';

import { useState } from 'react';

interface VideoGeneratorProps {
  onVideoGenerated?: (videoUrl: string) => void;
}

export default function VideoGenerator({ onVideoGenerated }: VideoGeneratorProps) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [stylePreset, setStylePreset] = useState('product-demo');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError('');
    setProgress(0);
    setStatus('Queuing...');

    try {
      // Submit generation request
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl,
          stylePreset,
          customInstructions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      const { projectId } = data;

      // Poll for status
      pollProjectStatus(projectId);

    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
    }
  };

  const pollProjectStatus = async (projectId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        const project = await response.json();

        setProgress(project.progress || 0);
        setStatus(project.status);

        if (project.status === 'scraping') {
          setStatus('Analyzing website...');
        } else if (project.status === 'generating') {
          setStatus(`Generating video... ${project.progress || 0}%`);
        } else if (project.status === 'completed') {
          clearInterval(pollInterval);
          setVideoUrl(project.videoUrl);
          setIsGenerating(false);
          setStatus('Video ready!');
          if (onVideoGenerated) {
            onVideoGenerated(project.videoUrl);
          }
        } else if (project.status === 'failed') {
          clearInterval(pollInterval);
          setError(project.error || 'Generation failed');
          setIsGenerating(false);
        }

      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isGenerating) {
        setError('Generation timeout - please try again');
        setIsGenerating(false);
      }
    }, 600000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Website URL */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Website URL
          </label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourwebsite.com"
            required
            disabled={isGenerating}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        {/* Style Preset */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Video Style
          </label>
          <select
            value={stylePreset}
            onChange={(e) => setStylePreset(e.target.value)}
            disabled={isGenerating}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="product-demo">Product Demo</option>
            <option value="enterprise-saas">Enterprise SaaS</option>
            <option value="startup-energy">Startup Energy</option>
            <option value="brand-story">Brand Story</option>
          </select>
        </div>

        {/* Custom Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Custom Instructions (Optional)
          </label>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="E.g., Focus on the AI features, target audience is developers..."
            disabled={isGenerating}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate Video'}
        </button>
      </form>

      {/* Progress Display */}
      {isGenerating && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-900">{status}</span>
            <span className="text-sm text-gray-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gray-900 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Video Display */}
      {videoUrl && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Your Video</h3>
          <video
            src={videoUrl}
            controls
            className="w-full rounded-lg"
          />
          <div className="mt-4 flex gap-4">
            <a
              href={videoUrl}
              download
              className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800"
            >
              Download Video
            </a>
            <button
              onClick={() => {
                setVideoUrl('');
                setWebsiteUrl('');
                setCustomInstructions('');
                setProgress(0);
              }}
              className="px-6 py-3 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50"
            >
              Generate Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
