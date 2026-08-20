'use client';

import { useEffect, useState } from 'react';
import styles from './review.module.css';

// 1. Define the TypeScript Interfaces
interface FormField {
  label: string;
  name: string;
  type: string;
  required: boolean;
  value: string;
}

export interface ApplicationData {
  _id: string;
  userId: string;
  scholarshipUrl: string;
  status: string;
  formFields: FormField[];
}

interface ReviewFormProps {
  initialData: ApplicationData;
}

export default function ReviewForm({ initialData }: ReviewFormProps) {
  const [formData, setFormData] = useState<ApplicationData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setHydrated(true);
    // Add safety check for the Telegram Web App object
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  const handleApprove = async () => {
    setStatus('Submitting...');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setStatus(`Done! Status: ${res.status}`);

      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        (window as any).Telegram.WebApp.close();
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      console.log(err)
    }
  };

  const handleFieldChange = (index: number, newValue: string) => {
    const updatedFields = [...formData.formFields];
    updatedFields[index].value = newValue;
    setFormData({ ...formData, formFields: updatedFields });
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.header}>Review Application</h1>
      <p style={{ color: hydrated ? 'green' : 'red', fontWeight: 'bold' }}>
        {hydrated ? '✅ React is active' : '❌ Not hydrated'}
      </p>
      {status && <p style={{ color: 'blue', fontWeight: 'bold' }}>{status}</p>}

      <form className={styles.formGroup} onSubmit={(e) => e.preventDefault()}>
        {formData.formFields?.map((field: FormField, index: number) => (
          <div key={index} className={styles.formGroup}>
            <label className={styles.label}>{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                className={styles.textarea}
                defaultValue={field.value}
                rows={6}
                onChange={(e) => handleFieldChange(index, e.target.value)} 
              />
            ) : (
              <input 
                type={field.type}
                className={styles.textarea} 
                value={field.value}
                onChange={(e) => handleFieldChange(index, e.target.value)} 
              />
            )}
          </div>
        ))}
      </form>

      <button
        type="button"
        className={styles.submitButton}
        onClick={handleApprove}
      >
        Approve & Submit
      </button>
    </main>
  );
}