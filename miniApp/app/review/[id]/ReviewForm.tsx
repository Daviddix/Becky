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

  useEffect(() => {
    // Add safety check for the Telegram Web App object
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

 const handleApprove = async () => {
  // Send the finalized data back to your Node backend
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    (window as any).Telegram.WebApp.close();
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

      <form className={styles.formGroup}>
        {formData.formFields?.map((field, index) => (
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
  value={field.value} // Change defaultValue to value
  onChange={(e) => handleFieldChange(index, e.target.value)} 
/>
            )}
          </div>
        ))}

        <button
          type="button"
          className={styles.submitButton}
          onClick={handleApprove}
        >
          Approve & Submit
        </button>
      </form>
    </main>
  );
}