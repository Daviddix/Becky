"use client";

import { useEffect, useState, use } from 'react';
import ReviewForm, { ApplicationData } from './ReviewForm';

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [appRecord, setAppRecord] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/application/${id}`, {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (!response.ok) {
          throw new Error('Application not found');
        }
        const data = await response.json();
        setAppRecord(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <p>Loading application...</p>
      </div>
    );
  }

  if (error || !appRecord) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>Application Not Found</h1>
        <p>{error || 'This draft might have expired or already been submitted.'}</p>
      </div>
    );
  }

  return <ReviewForm initialData={appRecord} />;
}