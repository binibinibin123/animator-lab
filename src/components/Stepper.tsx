'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WIZARD_STEPS } from '@/types';

export default function Stepper() {
    const pathname = usePathname();

    const getCurrentStep = () => {
        const step = WIZARD_STEPS.find(s => s.path === pathname);
        return step?.id || 1;
    };

    const currentStep = getCurrentStep();

    return (
        <div className="w-full py-6">
            <div className="flex items-center justify-center gap-2">
                {WIZARD_STEPS.map((step, index) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;

                    return (
                        <div key={step.id} className="flex items-center">
                            {/* Step circle */}
                            <Link
                                href={step.path}
                                className={`
                  flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium
                  transition-all duration-200
                  ${isCompleted
                                        ? 'bg-violet-600 text-white'
                                        : isCurrent
                                            ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-600'
                                            : 'bg-gray-100 text-gray-400'
                                    }
                `}
                            >
                                {isCompleted ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    step.id
                                )}
                            </Link>

                            {/* Step label */}
                            <span className={`ml-2 text-sm ${isCurrent ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                {step.label}
                            </span>

                            {/* Connector line */}
                            {index < WIZARD_STEPS.length - 1 && (
                                <div className={`w-12 h-0.5 mx-3 ${isCompleted ? 'bg-violet-600' : 'bg-gray-200'}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
