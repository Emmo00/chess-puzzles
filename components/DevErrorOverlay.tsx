"use client";

import { useEffect, useState } from "react";
import { Bug, X, Trash2, ChevronDown } from "lucide-react";
import { isDevMode } from "@/lib/config/devMode";
import {
  clearDevErrors,
  safeStringify,
  subscribeDevErrors,
  type DevCapturedError,
} from "@/lib/utils/devStore";

export function DevErrorOverlay() {
  const [errors, setErrors] = useState<DevCapturedError[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return subscribeDevErrors(setErrors);
  }, []);

  if (!isDevMode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-mono text-[11px] pointer-events-auto">
      <div className="flex justify-end mb-1">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1 border-2 border-black px-3 py-1.5 font-black uppercase shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all ${
            errors.length > 0 ? "bg-red-500 text-white" : "bg-cyan-300 text-black"
          }`}
        >
          <Bug className="w-3.5 h-3.5" />
          DEV ERRORS
          {errors.length > 0 && (
            <span className="bg-black text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
              {errors.length}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="w-[min(90vw,460px)] max-h-[70vh] flex flex-col bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between bg-black text-cyan-300 px-3 py-2 border-b-4 border-black">
            <span className="font-black uppercase text-xs">Raw Error Log</span>
            <div className="flex items-center gap-2">
              {errors.length > 0 && (
                <button
                  onClick={() => clearDevErrors()}
                  className="text-red-400 hover:text-red-300 flex items-center gap-1 uppercase text-[10px] font-black"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
              <button onClick={() => setOpen(false)} className="hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {errors.length === 0 && (
              <div className="text-center py-8 text-black/50 uppercase font-bold">
                No errors captured
              </div>
            )}

            {errors.map((err) => (
              <details
                key={err.id}
                className="border-2 border-black bg-gray-50 open:bg-red-50"
              >
                <summary className="p-2 cursor-pointer flex items-center justify-between gap-2 list-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronDown className="w-3 h-3 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-black text-red-600 break-all">
                        {err.message}
                      </div>
                      <div className="text-[10px] text-black/60 uppercase font-bold">
                        {err.action}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] text-black/40 whitespace-nowrap">
                    {new Date(err.timestamp).toLocaleTimeString()}
                  </span>
                </summary>

                <div className="border-t-2 border-black p-2 space-y-2">
                  {err.rawPayload !== undefined && (
                    <div>
                      <div className="font-black uppercase text-black/70 mb-1">
                        Raw Payload
                      </div>
                      <pre className="bg-black text-green-400 p-2 overflow-x-auto border-2 border-black whitespace-pre-wrap break-all">
                        {safeStringify(err.rawPayload)}
                      </pre>
                    </div>
                  )}

                  <div>
                    <div className="font-black uppercase text-black/70 mb-1">
                      Raw Error
                    </div>
                    <pre className="bg-black text-red-400 p-2 overflow-x-auto border-2 border-black whitespace-pre-wrap break-all">
                      {safeStringify(err.rawError)}
                    </pre>
                  </div>

                  {err.stack && (
                    <div>
                      <div className="font-black uppercase text-black/70 mb-1">
                        Stack
                      </div>
                      <pre className="bg-black text-cyan-300 p-2 overflow-x-auto border-2 border-black whitespace-pre-wrap break-all">
                        {err.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
