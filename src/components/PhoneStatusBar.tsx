/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery } from 'lucide-react';

interface PhoneStatusBarProps {
  dark?: boolean;
}

export const PhoneStatusBar: React.FC<PhoneStatusBarProps> = ({ dark = false }) => {
  const [timeStr, setTimeStr] = useState('8:00');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const textColor = dark ? 'text-white' : 'text-slate-900';

  return (
    <div className={`pt-3 pb-1 px-7 flex items-center justify-between text-xs font-semibold select-none z-40 relative ${textColor}`}>
      {/* Left: Clock */}
      <div className="w-14 font-semibold tracking-tight text-[13px]">
        {timeStr}
      </div>

      {/* Center: Dynamic Island Capsule */}
      <div className="w-24 h-5 bg-black rounded-full flex items-center justify-end pr-2 gap-1.5 shadow-inner">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
        <div className="w-2 h-2 rounded-full bg-blue-950/80" />
      </div>

      {/* Right: Cellular, Wifi, Battery */}
      <div className="w-14 flex items-center justify-end gap-1.5 text-[11px]">
        {/* Signal Bars */}
        <div className="flex items-end gap-[1.5px] h-3">
          <div className="w-[3px] h-[3px] bg-current rounded-xs" />
          <div className="w-[3px] h-[5px] bg-current rounded-xs" />
          <div className="w-[3px] h-[7px] bg-current rounded-xs" />
          <div className="w-[3px] h-[9px] bg-current rounded-xs" />
        </div>

        {/* Wifi */}
        <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />

        {/* Battery with percentage */}
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] font-bold tabular-nums">99</span>
          <div className="w-5 h-2.5 border border-current rounded-sm p-[1px] flex items-center">
            <div className="h-full w-full bg-current rounded-[1px]" />
          </div>
        </div>
      </div>
    </div>
  );
};
