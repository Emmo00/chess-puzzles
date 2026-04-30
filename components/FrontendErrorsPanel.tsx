"use client";

import { useState, useEffect, useCallback } from "react";
import { TelegramSupportLink } from "./TelegramSupportLink";

interface ErrorLog {
  _id: string;
  message: string;
  stack?: string;
  userAddress?: string;
  path?: string;
  action?: string;
  platform: string;
  status: "new" | "resolved";
  createdAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function FrontendErrorsPanel({ adminAccessKey }: { adminAccessKey: string }) {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "resolved">("new");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchErrors = useCallback(async (page: number, status: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const query = new URLSearchParams({ page: page.toString(), limit: "10" });
      if (status !== "all") {
        query.append("status", status);
      }

      const res = await fetch(`/api/admin/errors?${query.toString()}`, {
        headers: {
          "Authorization": `Bearer ${adminAccessKey}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch errors");
      }

      const json = await res.json();
      if (json.success) {
        setErrors(json.data.errors);
        setPagination(json.data.pagination);
      } else {
        throw new Error(json.error || "Failed to fetch errors");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminAccessKey]);

  useEffect(() => {
    fetchErrors(1, statusFilter);
  }, [statusFilter, fetchErrors]);

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/errors`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminAccessKey}`,
        },
        body: JSON.stringify({ id, status: "resolved" }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      const json = await res.json();
      if (json.success) {
        // Refresh current page
        fetchErrors(pagination.page, statusFilter);
      }
    } catch (err: any) {
      setErrorMsg("Error resolving: " + err.message);
    }
  };

  return (
    <section className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h2 className="text-xl font-black uppercase text-black">Frontend Errors</h2>
          <p className="text-xs font-bold uppercase text-black/80 mt-1">
            Monitor and resolve user facing issues
          </p>
        </div>
        <div className="flex gap-2 mt-2 sm:mt-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border-2 border-black px-2 py-1 text-xs font-bold bg-white"
          >
            <option value="new">New</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
          <button
            onClick={() => fetchErrors(pagination.page, statusFilter)}
            className="bg-cyan-300 text-black px-3 py-1 font-black text-xs uppercase border-2 border-black"
          >
            Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-300 border-2 border-black p-2 text-xs font-black uppercase text-black mb-4">
          <div>{errorMsg}</div>
          <TelegramSupportLink />
        </div>
      )}

      {loading ? (
        <div className="text-xs font-bold p-4 text-center">Loading errors...</div>
      ) : errors.length === 0 ? (
        <div className="text-xs font-bold p-4 text-center bg-gray-100 border-2 border-black">No errors found.</div>
      ) : (
        <div className="space-y-4">
          {errors.map((err) => (
            <div key={err._id} className="border-2 border-black p-3 text-sm space-y-2 bg-gray-50">
              <div className="flex justify-between items-start">
                <span className="font-bold text-red-600 break-all">{err.message}</span>
                {err.status === "new" && (
                  <button
                    onClick={() => handleResolve(err._id)}
                    className="bg-green-400 border-2 border-black px-2 py-1 text-[10px] font-black uppercase hover:bg-green-500 whitespace-nowrap ml-2"
                  >
                    Resolve
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white p-2 border-2 border-gray-200">
                <div><span className="font-bold text-black uppercase">Platform:</span> {err.platform}</div>
                <div><span className="font-bold text-black uppercase">Status:</span> {err.status}</div>
                <div><span className="font-bold text-black uppercase">User:</span> {err.userAddress || "Anonymous"}</div>
                <div><span className="font-bold text-black uppercase">Path:</span> {err.path || "N/A"}</div>
                <div className="col-span-2"><span className="font-bold text-black uppercase">Action:</span> {err.action || "N/A"}</div>
                <div className="col-span-2 text-gray-500">{new Date(err.createdAt).toLocaleString()}</div>
              </div>
              {err.stack && (
                <details className="mt-2 text-xs">
                  <summary className="font-bold cursor-pointer hover:underline uppercase">View Stack Trace</summary>
                  <pre className="mt-1 bg-black text-green-400 p-2 overflow-x-auto border-2 border-black">
                    {err.stack}
                  </pre>
                </details>
              )}
            </div>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t-2 border-black">
              <button
                onClick={() => fetchErrors(Math.max(1, pagination.page - 1), statusFilter)}
                disabled={pagination.page === 1}
                className="bg-black text-white px-3 py-1 font-black text-xs uppercase disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-xs font-bold">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchErrors(Math.min(pagination.totalPages, pagination.page + 1), statusFilter)}
                disabled={pagination.page === pagination.totalPages}
                className="bg-black text-white px-3 py-1 font-black text-xs uppercase disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
