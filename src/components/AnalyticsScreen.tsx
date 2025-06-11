import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  TrendingUp, 
  Award, 
  Target, 
  MessageSquare, 
  Star,
  ArrowLeft,
  RotateCcw,
  Download,
  Loader2
} from 'lucide-react';
import { AIInterviewSimulator } from '../utils/aiSimulator';

interface AnalyticsScreenProps {
  simulator: AIInterviewSimulator;
  onBackToConfig: () => void;
  onRetryInterview: () => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  simulator,
  onBackToConfig,
  onRetryInterview
}) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const analyticsData = await simulator.generateAnalytics();
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Error loading analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [simulator]);

  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-blue-600 bg-blue-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const downloadReport = () => {
    if (!analytics) return;
    
    const reportData = {
      timestamp: new Date().toISOString(),
      overallScore: analytics.overallScore,
      responseAnalysis: analytics.responseAnalysis,
      strengths: analytics.strengths,
      improvements: analytics.improvements,
      questionReviews: analytics.questionReviews
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Your Performance</h2>
          <p className="text-gray-600">Please wait while we generate your detailed analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={onBackToConfig}
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Interview
            </button>
            <button
              onClick={onRetryInterview}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Analytics Available</h2>
          <p className="text-gray-600 mb-6">Unable to generate analytics for this interview.</p>
          <button
            onClick={onBackToConfig}
            className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            New Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 text-white rounded-2xl mb-4">
              <BarChart className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Interview Performance Analysis
            </h1>
            <p className="text-xl text-gray-600">
              Detailed insights and feedback on your interview performance
            </p>
          </div>

          {/* Overall Score */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full mb-4">
                <span className="text-3xl font-bold">{analytics.overallScore}</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Overall Score: {getScoreLabel(analytics.overallScore)}
              </h2>
              <p className="text-gray-600">
                Based on clarity, structure, technical accuracy, communication, and confidence
              </p>
            </div>
          </div>

          {/* Response Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Response Analysis
              </h3>
              
              <div className="space-y-4">
                {analytics.responseAnalysis && Object.entries(analytics.responseAnalysis).map(([key, score]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="font-medium text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-sm font-semibold ${getScoreColor(score as number)}`}>
                        {score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Award className="w-5 h-5 mr-2 text-green-600" />
                Strengths Identified
              </h3>
              
              <div className="space-y-3">
                {analytics.strengths && analytics.strengths.map((strength: string, index: number) => (
                  <div key={index} className="flex items-start">
                    <Star className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{strength}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Areas for Improvement */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Target className="w-5 h-5 mr-2 text-orange-600" />
              Areas for Improvement
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.improvements && analytics.improvements.map((improvement: string, index: number) => (
                <div key={index} className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700">{improvement}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Question-by-Question Review */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-purple-600" />
              Question-by-Question Review
            </h3>
            
            <div className="space-y-6">
              {analytics.questionReviews && analytics.questionReviews.map((review: any, index: number) => (
                <div key={review.questionId} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Question {index + 1}
                      </h4>
                      <p className="text-gray-700 mb-3">{review.question}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getScoreColor(review.score)}`}>
                      {review.score}%
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">Your Response:</h5>
                    <p className="text-gray-700 text-sm">{review.response}</p>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Feedback:</h5>
                    <p className="text-blue-800 text-sm">{review.feedback}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={onBackToConfig}
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Interview
            </button>
            
            <button
              onClick={onRetryInterview}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry Same Configuration
            </button>
            
            <button
              onClick={downloadReport}
              disabled={!analytics}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};