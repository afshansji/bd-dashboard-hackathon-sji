import { EODSubmissionForm } from '@/components/eod/EODSubmissionForm';

export default function EODSubmission() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">End of Day Submission</h1>
        <p className="text-muted-foreground mt-2">
          Submit your daily tasks and track your work
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <EODSubmissionForm />
      </div>
    </div>
  );
}
