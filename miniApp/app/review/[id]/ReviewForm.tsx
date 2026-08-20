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

  const handleApprove = () => {
    console.log("Submitting:", formData);
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.close();
    }
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
              />
            ) : (
              <input 
                type="text"
                className={styles.textarea} 
                defaultValue={field.value} 
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