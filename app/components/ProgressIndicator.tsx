'use client';

import { useState, useEffect, useRef } from 'react';

interface ProgressStep {
  label: string;
  status: 'pending' | 'active' | 'completed';
}

interface ProgressIndicatorProps {
  title: string;
  progress: number; // 0-100
  steps: ProgressStep[];
  currentStep: string;
  estimatedTime?: string;
  countdownSeconds?: number; // Optional countdown timer
}

export default function ProgressIndicator({
  title,
  progress,
  steps,
  currentStep,
  estimatedTime,
  countdownSeconds,
}: ProgressIndicatorProps) {
  const [countdown, setCountdown] = useState<number>(countdownSeconds || 0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const prevCountdownSecondsRef = useRef<number | undefined>(undefined);

  // Reset countdown when countdownSeconds prop changes (new step started)
  useEffect(() => {
    if (countdownSeconds !== undefined && countdownSeconds !== prevCountdownSecondsRef.current) {
      setCountdown(countdownSeconds);
      prevCountdownSecondsRef.current = countdownSeconds;
    }
  }, [countdownSeconds]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [countdown > 0]); // Only re-run when countdown becomes positive
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
        {/* Header with optional countdown */}
        <div className="text-center mb-6">
          {countdownSeconds !== undefined && countdownSeconds > 0 ? (
            /* Circular countdown timer */
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                <circle 
                  cx="40" cy="40" r="35" 
                  fill="none" 
                  stroke="#E5E7EB" 
                  strokeWidth="6"
                />
                <circle 
                  cx="40" cy="40" r="35" 
                  fill="none" 
                  stroke="#3B82F6" 
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 35}`}
                  strokeDashoffset={`${2 * Math.PI * 35 * (countdown / (countdownSeconds || 1))}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">
                  {countdown > 0 ? countdown : '...'}
                </span>
              </div>
            </div>
          ) : (
            /* Default spinner */
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          {countdownSeconds !== undefined && countdown > 0 ? (
            <p className="text-sm text-gray-500 mt-1">残り約 {countdown} 秒</p>
          ) : countdownSeconds !== undefined && countdown === 0 ? (
            <p className="text-sm text-blue-500 mt-1 animate-pulse">完了間近...</p>
          ) : estimatedTime ? (
            <p className="text-sm text-gray-500 mt-1">予想残り時間: {estimatedTime}</p>
          ) : null}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">{currentStep}</span>
            <span className="font-semibold text-blue-600">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                step.status === 'completed' 
                  ? 'bg-green-500 text-white' 
                  : step.status === 'active'
                  ? 'bg-blue-500 text-white animate-pulse'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {step.status === 'completed' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.status === 'active' ? (
                  <div className="w-2 h-2 bg-white rounded-full" />
                ) : (
                  <span className="text-xs">{index + 1}</span>
                )}
              </div>
              <span className={`text-sm ${
                step.status === 'completed' 
                  ? 'text-green-600 font-medium' 
                  : step.status === 'active'
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-400'
              }`}>
                {step.label}
                {step.status === 'active' && (
                  <span className="ml-2 inline-flex">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            💡 処理中はこのページを閉じないでください
          </p>
        </div>
      </div>
    </div>
  );
}
