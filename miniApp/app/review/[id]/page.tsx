import connectMongo from '@/lib/mongodb';
import { Application } from '@scholarship-pilot/shared';
import ReviewForm from './ReviewForm';

// This runs purely on the Node.js server before the page loads
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await connectMongo();
  
  const { id } = await params;
  // Find the specific application draft using the ID from the URL
  const appRecord = await Application.findById(id).lean() as any;

  if (!appRecord) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>Application Not Found</h1>
        <p>This draft might have expired or already been submitted.</p>
      </div>
    );
  }

  // MongoDB ObjectIds can't be passed directly to Client Components in Next.js, so we convert it to a string
  const serializedData = {
    ...appRecord,
    _id: appRecord._id.toString(),
    userId: appRecord.userId.toString()
  };

  return <ReviewForm initialData={serializedData} />;
}