import { DHSSubmissionForm } from '@/components/dhs/DHSSubmissionForm';

export default function DHSSubmission() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Daily Head Start</h1>
        <p className="text-muted-foreground mt-2">
          Plan your day and track BD health indicators
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <DHSSubmissionForm />
      </div>
    </div>
  );
}

