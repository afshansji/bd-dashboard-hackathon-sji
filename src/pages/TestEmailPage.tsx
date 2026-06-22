import { TestEmailSender } from "@/components/bd/TestEmailSender";

/**
 * Test Email Page
 * 
 * This page provides a UI for testing the email automation system.
 * 
 * To access this page, add a route in your App.tsx:
 * <Route path="/test-email" element={<TestEmailPage />} />
 * 
 * Then navigate to: http://localhost:5173/test-email
 */
export default function TestEmailPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <TestEmailSender />
      </div>
    </div>
  );
}





