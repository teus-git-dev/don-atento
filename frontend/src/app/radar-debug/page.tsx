"use client";
import { useState } from 'react';

export default function RadarDebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('don_atento_token');
      const res = await fetch('https://don-atento-api.onrender.com/crm/radar/scan', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-20 bg-black min-h-screen text-white">
      <h1 className="text-4xl font-bold mb-8">Radar Debugger v1.4.0</h1>
      <button 
        onClick={runTest}
        className="px-8 py-4 bg-cyan-500 text-black font-bold rounded-xl"
      >
        {loading ? 'RUNNING REAL SCAN...' : 'TRIGGER REAL SCAN'}
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {data && (
        <pre className="mt-8 bg-gray-900 p-8 rounded-xl overflow-auto max-h-[600px]">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
