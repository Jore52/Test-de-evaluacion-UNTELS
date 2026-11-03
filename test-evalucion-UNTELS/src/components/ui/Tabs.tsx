'use client';

import { useState } from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export default function Tabs({ tabs, activeTab, onTabChange, orientation = 'horizontal' }: TabsProps) {
  const isVertical = orientation === 'vertical';

  return (
    <div className={`flex ${isVertical ? 'flex-col gap-1' : 'gap-0 border-b border-[var(--border)]'}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
            isVertical
              ? `rounded-lg text-left ${
                  activeTab === tab.id
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-l-2 border-[var(--primary)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
                }`
              : `border-b-2 ${
                  activeTab === tab.id
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border)]'
                }`
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
