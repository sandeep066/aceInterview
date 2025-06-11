import React, { useState } from 'react';
import { Settings, Play, Clock, Building, User, BookOpen } from 'lucide-react';
import { InterviewConfig, InterviewStyle, ExperienceLevel } from '../types';

interface ConfigurationScreenProps {
  onStartInterview: (config: InterviewConfig) => void;
}

const interviewStyles: { value: InterviewStyle; label: string; description: string }[] = [
  { value: 'technical', label: 'Technical Interview', description: 'Code problems, system design, technical concepts' },
  { value: 'hr', label: 'HR Interview', description: 'Company culture, work-life balance, career goals' },
  { value: 'behavioral', label: 'Behavioral Interview', description: 'STAR method scenarios, past experiences' },
  { value: 'salary-negotiation', label: 'Salary Negotiation', description: 'Compensation discussions, benefit negotiations' },
  { value: 'case-study', label: 'Case Study Interview', description: 'Problem-solving scenarios, business cases' }
];

const experienceLevels: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: 'fresher', label: 'Fresher (0-1 years)', description: 'New graduate or entry-level professional' },
  { value: 'junior', label: 'Junior (1-3 years)', description: 'Early career professional with some experience' },
  { value: 'mid-level', label: 'Mid-Level (3-6 years)', description: 'Experienced professional with proven track record' },
  { value: 'senior', label: 'Senior (6+ years)', description: 'Senior professional with deep expertise' },
  { value: 'lead-manager', label: 'Lead/Manager (8+ years)', description: 'Leadership role with team management experience' }
];

const durations = [15, 30, 45, 60];

export const ConfigurationScreen: React.FC<ConfigurationScreenProps> = ({ onStartInterview }) => {
  const [config, setConfig] = useState<InterviewConfig>({
    topic: '',
    style: 'technical',
    experienceLevel: 'junior',
    companyName: '',
    duration: 30
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config.topic.trim()) {
      newErrors.topic = 'Please specify your interview topic';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onStartInterview(config);
    }
  };

  const updateConfig = (updates: Partial<InterviewConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    // Clear related errors
    if (updates.topic !== undefined) {
      setErrors(prev => ({ ...prev, topic: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl mb-6">
              <Settings className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              AI Interview Practice Platform
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Configure your personalized interview session and practice with our AI interviewer
            </p>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Topic */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                    <BookOpen className="w-4 h-4 mr-2 text-blue-600" />
                    Interview Topic *
                  </label>
                  <input
                    type="text"
                    value={config.topic}
                    onChange={(e) => updateConfig({ topic: e.target.value })}
                    placeholder="e.g., Frontend Development, Data Science, Python, React..."
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.topic ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  {errors.topic && (
                    <p className="mt-2 text-sm text-red-600">{errors.topic}</p>
                  )}
                </div>

                {/* Experience Level */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                    <User className="w-4 h-4 mr-2 text-blue-600" />
                    Experience Level
                  </label>
                  <div className="space-y-2">
                    {experienceLevels.map((level) => (
                      <label
                        key={level.value}
                        className={`flex items-start p-3 border-2 rounded-xl cursor-pointer transition-all hover:bg-blue-50 ${
                          config.experienceLevel === level.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="experienceLevel"
                          value={level.value}
                          checked={config.experienceLevel === level.value}
                          onChange={(e) => updateConfig({ experienceLevel: e.target.value as ExperienceLevel })}
                          className="mt-1 text-blue-600"
                        />
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{level.label}</div>
                          <div className="text-sm text-gray-600">{level.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                    <Building className="w-4 h-4 mr-2 text-blue-600" />
                    Target Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={config.companyName}
                    onChange={(e) => updateConfig({ companyName: e.target.value })}
                    placeholder="e.g., Google, Microsoft, Netflix..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    For customized, company-specific interview questions
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Interview Style */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                    <Settings className="w-4 h-4 mr-2 text-blue-600" />
                    Interview Style
                  </label>
                  <div className="space-y-2">
                    {interviewStyles.map((style) => (
                      <label
                        key={style.value}
                        className={`flex items-start p-3 border-2 rounded-xl cursor-pointer transition-all hover:bg-purple-50 ${
                          config.style === style.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="style"
                          value={style.value}
                          checked={config.style === style.value}
                          onChange={(e) => updateConfig({ style: e.target.value as InterviewStyle })}
                          className="mt-1 text-purple-600"
                        />
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{style.label}</div>
                          <div className="text-sm text-gray-600">{style.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                    <Clock className="w-4 h-4 mr-2 text-blue-600" />
                    Interview Duration
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {durations.map((duration) => (
                      <label
                        key={duration}
                        className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all hover:bg-green-50 ${
                          config.duration === duration
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="duration"
                          value={duration}
                          checked={config.duration === duration}
                          onChange={(e) => updateConfig({ duration: parseInt(e.target.value) })}
                          className="sr-only"
                        />
                        <span className="font-medium text-gray-900">{duration} minutes</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex justify-center">
              <button
                type="submit"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all transform hover:scale-105 shadow-lg"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Interview Practice
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};