import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  testId?: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex border-b border-surface-container-high gap-space-md ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            data-testid={tab.testId}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-label-md text-label-md transition-colors cursor-pointer -mb-px ${
              isActive
                ? 'border-primary-container text-primary-container font-semibold'
                : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-full text-label-xs font-medium ${
                  isActive
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'bg-surface-container text-secondary'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
